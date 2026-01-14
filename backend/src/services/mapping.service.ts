/**
 * Mapping Service - Manages Equivalence Mappings & HITL Workflow
 */

import { pool } from '../database/connection.js';
import { v4 as uuid } from 'uuid';

interface MappingFilters {
  page: number;
  limit: number;
  status?: string;
  minConfidence?: number;
  maxConfidence?: number;
}

interface ManualMappingInput {
  masterId: string;
  rawId: string;
  notes?: string;
  isCompetitor?: boolean;
  competitorBrand?: string;
}

export class MappingService {
  async getMappings(filters: MappingFilters) {
    const { page, limit, status, minConfidence, maxConfidence } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND em.status = $${paramIndex++}`;
      params.push(status);
    }

    if (minConfidence !== undefined) {
      whereClause += ` AND em.final_confidence >= $${paramIndex++}`;
      params.push(minConfidence);
    }

    if (maxConfidence !== undefined) {
      whereClause += ` AND em.final_confidence <= $${paramIndex++}`;
      params.push(maxConfidence);
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM equivalence_map em ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        em.id,
        em.master_id,
        em.raw_id,
        em.semantic_score,
        em.attribute_score,
        em.final_confidence,
        em.status,
        em.is_competitor,
        em.competitor_brand,
        em.reviewed_at,
        em.review_notes,
        em.created_at,
        mc.canonical_name as master_product,
        b.name as master_brand,
        rdr.raw_description,
        rdr.external_sku,
        ss.name as retailer
      FROM equivalence_map em
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
      JOIN source_systems ss ON rdr.source_system_id = ss.id
      ${whereClause}
      ORDER BY em.final_confidence DESC, em.created_at DESC
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

  async getPendingMappings(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total FROM equivalence_map WHERE status = 'pending'
    `;

    const dataQuery = `
      SELECT 
        em.id,
        em.master_id,
        em.raw_id,
        em.semantic_score,
        em.attribute_score,
        em.final_confidence,
        em.status,
        em.created_at,
        mc.canonical_name as master_product,
        mc.gtin,
        mc.size_value as master_size_value,
        mc.size_unit as master_size_unit,
        b.name as master_brand,
        c.name as category,
        rdr.raw_description,
        rdr.external_sku,
        rdr.parsed_brand,
        rdr.parsed_size_value,
        rdr.parsed_size_unit,
        rdr.unit_price,
        ss.code as retailer_code,
        ss.name as retailer_name
      FROM equivalence_map em
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
      JOIN source_systems ss ON rdr.source_system_id = ss.id
      WHERE em.status = 'pending'
      ORDER BY em.final_confidence DESC
      LIMIT $1 OFFSET $2
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery),
      pool.query(dataQuery, [limit, offset])
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

  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'auto_confirmed' THEN 1 END) as auto_confirmed,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'manual' THEN 1 END) as manual,
        AVG(final_confidence) as avg_confidence,
        COUNT(CASE WHEN is_competitor = true THEN 1 END) as competitor_mappings
      FROM equivalence_map
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      byStatus: {
        pending: parseInt(stats.pending),
        autoConfirmed: parseInt(stats.auto_confirmed),
        verified: parseInt(stats.verified),
        rejected: parseInt(stats.rejected),
        manual: parseInt(stats.manual)
      },
      avgConfidence: parseFloat(stats.avg_confidence) || 0,
      competitorMappings: parseInt(stats.competitor_mappings),
      accuracyRate: stats.total > 0 
        ? ((parseInt(stats.auto_confirmed) + parseInt(stats.verified) + parseInt(stats.manual)) / parseInt(stats.total) * 100).toFixed(2)
        : 0
    };
  }

  async getMappingById(id: string) {
    const query = `
      SELECT 
        em.*,
        mc.canonical_name as master_product,
        mc.gtin,
        mc.size_value as master_size_value,
        mc.size_unit as master_size_unit,
        mc.attributes as master_attributes,
        b.name as master_brand,
        b.manufacturer,
        c.name as category,
        rdr.raw_description,
        rdr.external_sku,
        rdr.cleaned_description,
        rdr.parsed_brand,
        rdr.parsed_size_value,
        rdr.parsed_size_unit,
        rdr.unit_price,
        rdr.raw_attributes,
        ss.code as retailer_code,
        ss.name as retailer_name
      FROM equivalence_map em
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
      JOIN source_systems ss ON rdr.source_system_id = ss.id
      WHERE em.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async approveMapping(id: string, notes?: string) {
    const query = `
      UPDATE equivalence_map
      SET 
        status = 'verified',
        reviewed_at = NOW(),
        review_notes = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, notes || null]);
    
    // Log to audit trail
    await this.logAudit('equivalence_map', id, 'review', { action: 'approved', notes });

    return result.rows[0];
  }

  async rejectMapping(id: string, notes?: string, alternativeMasterId?: string) {
    const query = `
      UPDATE equivalence_map
      SET 
        status = 'rejected',
        reviewed_at = NOW(),
        review_notes = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, notes || null]);

    // If an alternative master was provided, create a new manual mapping
    if (alternativeMasterId) {
      const mapping = await this.getMappingById(id);
      if (mapping) {
        await this.createManualMapping({
          masterId: alternativeMasterId,
          rawId: mapping.raw_id,
          notes: `Corrected from rejected mapping. Original: ${notes || 'N/A'}`
        });
      }
    }

    // Log to audit trail
    await this.logAudit('equivalence_map', id, 'review', { action: 'rejected', notes, alternativeMasterId });

    return result.rows[0];
  }

  async createManualMapping(input: ManualMappingInput) {
    const id = uuid();

    const query = `
      INSERT INTO equivalence_map (
        id, master_id, raw_id, semantic_score, attribute_score, 
        final_confidence, status, is_competitor, competitor_brand, review_notes
      ) VALUES (
        $1, $2, $3, 1.0, 1.0, 1.0, 'manual', $4, $5, $6
      )
      ON CONFLICT (master_id, raw_id) DO UPDATE SET
        status = 'manual',
        is_competitor = $4,
        competitor_brand = $5,
        review_notes = $6,
        reviewed_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      input.masterId,
      input.rawId,
      input.isCompetitor || false,
      input.competitorBrand || null,
      input.notes || null
    ]);

    // Log to audit trail
    await this.logAudit('equivalence_map', result.rows[0].id, 'create', { type: 'manual', ...input });

    return result.rows[0];
  }

  async batchProcess(autoConfirmThreshold: number, flagThreshold: number) {
    // Auto-confirm high confidence mappings
    const autoConfirmResult = await pool.query(
      `UPDATE equivalence_map
       SET status = 'auto_confirmed', updated_at = NOW()
       WHERE status = 'pending' AND final_confidence >= $1
       RETURNING id`,
      [autoConfirmThreshold]
    );

    // Flag low confidence as needing attention (keep as pending but they'll be at bottom)
    const flaggedCount = await pool.query(
      `SELECT COUNT(*) FROM equivalence_map
       WHERE status = 'pending' AND final_confidence < $1`,
      [flagThreshold]
    );

    return {
      autoConfirmed: autoConfirmResult.rowCount,
      pendingReview: parseInt(flaggedCount.rows[0].count),
      thresholds: {
        autoConfirm: autoConfirmThreshold,
        flag: flagThreshold
      }
    };
  }

  private async logAudit(tableName: string, recordId: string, action: string, details: any) {
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_values)
       VALUES ($1, $2, $3, $4)`,
      [tableName, recordId, action, JSON.stringify(details)]
    );
  }
}
