/**
 * Retailer Service - Manages Raw Retailer Data
 */

import { pool } from '../database/connection.js';
import { NLPClient } from '../clients/nlp.client.js';

interface RawDataFilters {
  page: number;
  limit: number;
  source?: string;
  status?: string;
  search?: string;
}

export class RetailerService {
  private nlpClient: NLPClient;

  constructor() {
    this.nlpClient = new NLPClient();
  }

  async getRawData(filters: RawDataFilters) {
    const { page, limit, source, status, search } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (source) {
      whereClause += ` AND ss.code = $${paramIndex++}`;
      params.push(source);
    }

    if (status) {
      whereClause += ` AND rdr.processing_status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND rdr.raw_description ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM retailer_data_raw rdr
      JOIN source_systems ss ON rdr.source_system_id = ss.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        rdr.id,
        rdr.external_sku,
        rdr.raw_description,
        rdr.cleaned_description,
        rdr.parsed_brand,
        rdr.parsed_size_value,
        rdr.parsed_size_unit,
        rdr.unit_price,
        rdr.processing_status,
        rdr.created_at,
        ss.code as source_code,
        ss.name as source_name,
        (
          SELECT json_agg(json_build_object(
            'id', em.id,
            'status', em.status,
            'confidence', em.final_confidence
          ))
          FROM equivalence_map em
          WHERE em.raw_id = rdr.id
        ) as mappings
      FROM retailer_data_raw rdr
      JOIN source_systems ss ON rdr.source_system_id = ss.id
      ${whereClause}
      ORDER BY rdr.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params)
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  async getRawDataById(id: string) {
    const query = `
      SELECT 
        rdr.*,
        ss.code as source_code,
        ss.name as source_name,
        (
          SELECT json_agg(json_build_object(
            'id', em.id,
            'master_id', em.master_id,
            'status', em.status,
            'semantic_score', em.semantic_score,
            'attribute_score', em.attribute_score,
            'final_confidence', em.final_confidence,
            'is_competitor', em.is_competitor,
            'master_product', json_build_object(
              'id', mc.id,
              'canonical_name', mc.canonical_name,
              'brand', b.name
            )
          ))
          FROM equivalence_map em
          JOIN manufacturer_catalog mc ON em.master_id = mc.id
          LEFT JOIN brands b ON mc.brand_id = b.id
          WHERE em.raw_id = rdr.id
        ) as mappings
      FROM retailer_data_raw rdr
      JOIN source_systems ss ON rdr.source_system_id = ss.id
      WHERE rdr.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getSources() {
    const query = `
      SELECT 
        ss.id,
        ss.code,
        ss.name,
        ss.type,
        ss.is_active,
        COUNT(rdr.id) as record_count,
        COUNT(CASE WHEN rdr.processing_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN rdr.processing_status = 'processed' THEN 1 END) as processed_count
      FROM source_systems ss
      LEFT JOIN retailer_data_raw rdr ON ss.id = rdr.source_system_id
      GROUP BY ss.id, ss.code, ss.name, ss.type, ss.is_active
      ORDER BY ss.name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  async getMatches(rawId: string, limit: number = 5) {
    // Use the database function for finding matches
    const query = `SELECT * FROM find_top_matches($1, $2)`;
    const result = await pool.query(query, [rawId, limit]);
    return result.rows;
  }

  async processRawData(id: string) {
    // Get the raw data
    const rawData = await this.getRawDataById(id);
    if (!rawData) {
      throw new Error('Raw data not found');
    }

    // Generate embedding for the raw description
    const embedding = await this.nlpClient.generateEmbedding(rawData.raw_description);

    // Update the raw data with the embedding
    await pool.query(
      `UPDATE retailer_data_raw 
       SET description_embedding = $1, processing_status = 'processed', updated_at = NOW()
       WHERE id = $2`,
      [`[${embedding.join(',')}]`, id]
    );

    // Find matches
    const matches = await this.getMatches(id, 5);

    // Create equivalence map entries for top matches
    for (const match of matches) {
      const status = match.final_confidence >= 0.95 
        ? 'auto_confirmed' 
        : match.final_confidence >= 0.70 
          ? 'pending' 
          : 'pending';

      await pool.query(
        `INSERT INTO equivalence_map (
          master_id, raw_id, semantic_score, attribute_score, final_confidence, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (master_id, raw_id) DO UPDATE SET
          semantic_score = $3,
          attribute_score = $4,
          final_confidence = $5,
          status = CASE 
            WHEN equivalence_map.status IN ('verified', 'manual') THEN equivalence_map.status
            ELSE $6
          END,
          updated_at = NOW()`,
        [
          match.master_id,
          id,
          match.semantic_score,
          match.attribute_score,
          match.final_confidence,
          status
        ]
      );
    }

    return {
      rawId: id,
      status: 'processed',
      matchesFound: matches.length,
      topMatch: matches[0] || null
    };
  }
}
