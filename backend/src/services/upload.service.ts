/**
 * Upload Service - Handles Data Ingestion
 */

import { pool } from '../database/connection.js';
import { parse } from 'csv-parse/sync';
import { v4 as uuid } from 'uuid';
import { NLPClient } from '../clients/nlp.client.js';

interface UploadResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
}

export class UploadService {
  private nlpClient: NLPClient;

  constructor() {
    this.nlpClient = new NLPClient();
  }

  async uploadCatalog(file: Express.Multer.File): Promise<UploadResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const insertedIds: { id: string; name: string }[] = [];

    try {
      const content = file.buffer.toString('utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      for (const record of records) {
        recordsProcessed++;
        try {
          // Check if product exists by GTIN or canonical name
          const existing = await pool.query(
            `SELECT id FROM manufacturer_catalog 
             WHERE gtin = $1 OR canonical_name = $2`,
            [record.gtin, record.canonical_name]
          );

          // Get or create brand
          let brandId = null;
          if (record.brand) {
            const brandResult = await pool.query(
              `INSERT INTO brands (id, name, manufacturer)
               VALUES ($1, $2, $3)
               ON CONFLICT (name) DO UPDATE SET manufacturer = EXCLUDED.manufacturer
               RETURNING id`,
              [uuid(), record.brand, record.manufacturer || null]
            );
            brandId = brandResult.rows[0]?.id;
          }

          // Get or create category
          let categoryId = null;
          if (record.category) {
            const categoryResult = await pool.query(
              `INSERT INTO categories (id, name, level)
               VALUES ($1, $2, 1)
               ON CONFLICT (name) DO NOTHING
               RETURNING id`,
              [uuid(), record.category]
            );
            if (categoryResult.rows[0]) {
              categoryId = categoryResult.rows[0].id;
            } else {
              const existingCat = await pool.query(
                'SELECT id FROM categories WHERE name = $1',
                [record.category]
              );
              categoryId = existingCat.rows[0]?.id;
            }
          }

          if (existing.rows.length > 0) {
            // Update existing
            await pool.query(
              `UPDATE manufacturer_catalog SET
                 gtin = COALESCE($1, gtin),
                 canonical_name = $2,
                 brand_id = $3,
                 category_id = $4,
                 size_value = $5,
                 size_unit = $6,
                 size_normalized_ml = $7,
                 attributes = $8,
                 updated_at = NOW()
               WHERE id = $9`,
              [
                record.gtin || null,
                record.canonical_name,
                brandId,
                categoryId,
                record.size_value || null,
                record.size_unit || null,
                record.size_normalized_ml || null,
                JSON.stringify(record.attributes || {}),
                existing.rows[0].id
              ]
            );
            insertedIds.push({ id: existing.rows[0].id, name: record.canonical_name });
            recordsUpdated++;
          } else {
            // Create new
            const newId = uuid();
            await pool.query(
              `INSERT INTO manufacturer_catalog (
                 id, gtin, canonical_name, brand_id, category_id,
                 size_value, size_unit, size_normalized_ml, attributes
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                newId,
                record.gtin || null,
                record.canonical_name,
                brandId,
                categoryId,
                record.size_value || null,
                record.size_unit || null,
                record.size_normalized_ml || null,
                JSON.stringify(record.attributes || {})
              ]
            );
            insertedIds.push({ id: newId, name: record.canonical_name });
            recordsCreated++;
          }
        } catch (err: any) {
          errors.push(`Row ${recordsProcessed}: ${err.message}`);
        }
      }

      // Generate embeddings for all inserted/updated records
      if (insertedIds.length > 0) {
        try {
          const names = insertedIds.map(r => r.name);
          const embeddings = await this.nlpClient.generateEmbeddingsBatch(names);
          
          for (let i = 0; i < insertedIds.length; i++) {
            await pool.query(
              `UPDATE manufacturer_catalog 
               SET description_embedding = $1 
               WHERE id = $2`,
              [`[${embeddings[i].join(',')}]`, insertedIds[i].id]
            );
          }
        } catch (embeddingErr: any) {
          errors.push(`Embedding generation failed: ${embeddingErr.message}`);
        }
      }
    } catch (err: any) {
      errors.push(`File parsing error: ${err.message}`);
    }

    return {
      success: errors.length === 0,
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      errors
    };
  }

  async uploadRetailerData(file: Express.Multer.File, sourceSystemCode: string): Promise<UploadResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    try {
      // Get or create source system
      const sourceResult = await pool.query(
        `INSERT INTO source_systems (id, code, name, type)
         VALUES ($1, $2, $2, 'retailer')
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [uuid(), sourceSystemCode]
      );
      const sourceSystemId = sourceResult.rows[0].id;

      const content = file.buffer.toString('utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      for (const record of records) {
        recordsProcessed++;
        try {
          const existing = await pool.query(
            `SELECT id FROM retailer_data_raw 
             WHERE source_system_id = $1 AND external_sku = $2`,
            [sourceSystemId, record.external_sku]
          );

          if (existing.rows.length > 0) {
            await pool.query(
              `UPDATE retailer_data_raw SET
                 raw_description = $1,
                 unit_price = $2,
                 raw_attributes = $3,
                 processing_status = 'pending',
                 updated_at = NOW()
               WHERE id = $4`,
              [
                record.raw_description,
                record.unit_price || null,
                JSON.stringify(record.attributes || {}),
                existing.rows[0].id
              ]
            );
            recordsUpdated++;
          } else {
            await pool.query(
              `INSERT INTO retailer_data_raw (
                 id, source_system_id, external_sku, raw_description,
                 unit_price, raw_attributes, processing_status
               ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
              [
                uuid(),
                sourceSystemId,
                record.external_sku,
                record.raw_description,
                record.unit_price || null,
                JSON.stringify(record.attributes || {})
              ]
            );
            recordsCreated++;
          }
        } catch (err: any) {
          errors.push(`Row ${recordsProcessed}: ${err.message}`);
        }
      }
    } catch (err: any) {
      errors.push(`File parsing error: ${err.message}`);
    }

    return {
      success: errors.length === 0,
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      errors
    };
  }

  async uploadSalesData(file: Express.Multer.File, sourceSystemCode: string): Promise<UploadResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    try {
      // Get source system
      const sourceResult = await pool.query(
        'SELECT id FROM source_systems WHERE code = $1',
        [sourceSystemCode]
      );
      
      if (sourceResult.rows.length === 0) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          errors: [`Source system '${sourceSystemCode}' not found`]
        };
      }
      const sourceSystemId = sourceResult.rows[0].id;

      const content = file.buffer.toString('utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      for (const record of records) {
        recordsProcessed++;
        try {
          // Find the raw data record
          const rawResult = await pool.query(
            `SELECT id FROM retailer_data_raw 
             WHERE source_system_id = $1 AND external_sku = $2`,
            [sourceSystemId, record.external_sku]
          );

          if (rawResult.rows.length === 0) {
            errors.push(`Row ${recordsProcessed}: SKU '${record.external_sku}' not found`);
            continue;
          }

          const rawId = rawResult.rows[0].id;

          await pool.query(
            `INSERT INTO sales_transactions (
               id, raw_id, source_system_id, transaction_date,
               units_sold, revenue, store_id, promotion_flag
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuid(),
              rawId,
              sourceSystemId,
              record.transaction_date,
              record.units_sold,
              record.revenue,
              record.store_id || null,
              record.promotion_flag === 'true' || record.promotion_flag === '1'
            ]
          );
          recordsCreated++;
        } catch (err: any) {
          errors.push(`Row ${recordsProcessed}: ${err.message}`);
        }
      }
    } catch (err: any) {
      errors.push(`File parsing error: ${err.message}`);
    }

    return {
      success: errors.length === 0,
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      errors
    };
  }

  getTemplates() {
    return {
      catalog: {
        name: 'Manufacturer Catalog Template',
        description: 'Upload your product master data (Golden Record)',
        columns: ['gtin', 'canonical_name', 'brand', 'manufacturer', 'category', 'size_value', 'size_unit']
      },
      retailer: {
        name: 'Retailer Data Template',
        description: 'Upload raw retailer SKU data',
        columns: ['external_sku', 'raw_description', 'unit_price']
      },
      sales: {
        name: 'Sales Transactions Template',
        description: 'Upload sales transaction data',
        columns: ['external_sku', 'transaction_date', 'units_sold', 'revenue', 'store_id', 'promotion_flag']
      }
    };
  }

  getTemplate(type: string): string {
    const templates: Record<string, string> = {
      catalog: 'gtin,canonical_name,brand,manufacturer,category,size_value,size_unit\n012345678901,Crest 3D White Radiant Mint 4.8oz,Crest,P&G,Oral Care,4.8,oz',
      retailer: 'external_sku,raw_description,unit_price\nWMT-123456,CR 3DW RAD MNT 4.8OZ,5.99',
      sales: 'external_sku,transaction_date,units_sold,revenue,store_id,promotion_flag\nWMT-123456,2024-01-15,50,299.50,STORE-001,false'
    };

    return templates[type] || '';
  }

  async triggerProcessing(batchSize: number = 100) {
    // Get pending records with source system info (for retailer identification)
    const pendingResult = await pool.query(
      `SELECT r.id, r.raw_description, s.code as retailer
       FROM retailer_data_raw r
       JOIN source_systems s ON r.source_system_id = s.id
       WHERE r.processing_status = 'pending' 
       LIMIT $1`,
      [batchSize]
    );

    const records = pendingResult.rows;
    let processed = 0;
    let failed = 0;
    let autoConfirmed = 0;
    let pendingReview = 0;

    // Process in batches
    const descriptions = records.map(r => r.raw_description);
    
    try {
      // Step 1: Normalize descriptions using NLP service
      let normalizedDescriptions: string[] = [];
      try {
        const normalizeResponse = await this.nlpClient.normalizeBatch(descriptions);
        normalizedDescriptions = normalizeResponse.results.map((r: any) => r.normalized);
        console.log(`Normalized ${normalizedDescriptions.length} descriptions`);
      } catch (normErr) {
        console.warn('Normalization failed, using original descriptions:', normErr);
        normalizedDescriptions = descriptions;
      }

      // Step 2: Generate embeddings for normalized text
      const embeddings = await this.nlpClient.generateEmbeddingsBatch(normalizedDescriptions);

      for (let i = 0; i < records.length; i++) {
        try {
          const embedding = embeddings[i];
          const normalized = normalizedDescriptions[i] || descriptions[i];
          
          // Update raw data with embedding and normalized text
          await pool.query(
            `UPDATE retailer_data_raw 
             SET description_embedding = $1, 
                 normalized_description = $2,
                 processing_status = 'processed', 
                 updated_at = NOW()
             WHERE id = $3`,
            [`[${embedding.join(',')}]`, normalized, records[i].id]
          );

          // Find and create matches
          const matchesResult = await pool.query(
            `SELECT * FROM find_top_matches($1, 3)`,
            [records[i].id]
          );

          for (const match of matchesResult.rows) {
            // Use dynamic thresholds: 90% for auto-confirm, 60% for review
            const status = match.final_confidence >= 0.90 
              ? 'auto_confirmed' 
              : match.final_confidence >= 0.60
                ? 'pending'
                : 'low_confidence';

            if (status === 'auto_confirmed') autoConfirmed++;
            if (status === 'pending') pendingReview++;

            await pool.query(
              `INSERT INTO equivalence_map (
                 id, master_id, raw_id, semantic_score, attribute_score, final_confidence, status
               ) VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (master_id, raw_id) DO NOTHING`,
              [
                uuid(),
                match.master_id,
                records[i].id,
                match.semantic_score,
                match.attribute_score,
                match.final_confidence,
                status
              ]
            );
          }

          processed++;
        } catch (err) {
          failed++;
          console.error(`Failed to process record ${records[i].id}:`, err);
        }
      }
    } catch (err) {
      console.error('Batch processing failed:', err);
      failed = records.length;
    }

    return {
      batchSize,
      processed,
      failed,
      autoConfirmed,
      pendingReview,
      remaining: await this.getPendingCount()
    };
  }

  async getProcessingStatus() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed,
        COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed
      FROM retailer_data_raw
    `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      pending: parseInt(stats.pending),
      processed: parseInt(stats.processed),
      failed: parseInt(stats.failed),
      progress: stats.total > 0 
        ? ((parseInt(stats.processed) / parseInt(stats.total)) * 100).toFixed(1)
        : 0
    };
  }

  private async getPendingCount(): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM retailer_data_raw WHERE processing_status = 'pending'`
    );
    return parseInt(result.rows[0].count);
  }
}
