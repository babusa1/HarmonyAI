/**
 * Catalog Service - Manages Manufacturer Catalog (Golden Record)
 */

import { pool } from '../database/connection.js';
import { v4 as uuid } from 'uuid';
import { NLPClient } from '../clients/nlp.client.js';

interface ProductFilters {
  page: number;
  limit: number;
  brand?: string;
  category?: string;
  search?: string;
}

interface ProductInput {
  gtin?: string;
  canonicalName: string;
  brandId?: string;
  categoryId?: string;
  sizeValue?: number;
  sizeUnit?: string;
  attributes?: Record<string, any>;
}

export class CatalogService {
  private nlpClient: NLPClient;

  constructor() {
    this.nlpClient = new NLPClient();
  }

  async getProducts(filters: ProductFilters) {
    const { page, limit, brand, category, search } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE mc.is_active = true';
    const params: any[] = [];
    let paramIndex = 1;

    if (brand) {
      whereClause += ` AND b.name = $${paramIndex++}`;
      params.push(brand);
    }

    if (category) {
      whereClause += ` AND c.name = $${paramIndex++}`;
      params.push(category);
    }

    if (search) {
      whereClause += ` AND mc.canonical_name ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM manufacturer_catalog mc
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        mc.id,
        mc.gtin,
        mc.canonical_name,
        mc.size_value,
        mc.size_unit,
        mc.size_normalized_ml,
        mc.attributes,
        mc.is_active,
        mc.created_at,
        b.name as brand_name,
        b.manufacturer,
        c.name as category_name
      FROM manufacturer_catalog mc
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      ${whereClause}
      ORDER BY mc.canonical_name
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

  async getProductById(id: string) {
    const query = `
      SELECT 
        mc.*,
        b.name as brand_name,
        b.manufacturer,
        c.name as category_name,
        (
          SELECT COUNT(*) 
          FROM equivalence_map em 
          WHERE em.master_id = mc.id 
          AND em.status IN ('auto_confirmed', 'verified', 'manual')
        ) as mapped_count
      FROM manufacturer_catalog mc
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      WHERE mc.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getBrands() {
    const query = `
      SELECT 
        b.id,
        b.name,
        b.manufacturer,
        b.aliases,
        COUNT(mc.id) as product_count
      FROM brands b
      LEFT JOIN manufacturer_catalog mc ON b.id = mc.brand_id
      GROUP BY b.id, b.name, b.manufacturer, b.aliases
      ORDER BY b.name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  async getCategories() {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.level,
        c.path,
        COUNT(mc.id) as product_count
      FROM categories c
      LEFT JOIN manufacturer_catalog mc ON c.id = mc.category_id
      GROUP BY c.id, c.name, c.level, c.path
      ORDER BY c.name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  async createProduct(input: ProductInput) {
    const id = uuid();
    
    // Generate embedding for the product description
    let embedding = null;
    try {
      embedding = await this.nlpClient.generateEmbedding(input.canonicalName);
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
    }

    // Calculate normalized size
    let sizeNormalizedMl = null;
    if (input.sizeValue && input.sizeUnit) {
      sizeNormalizedMl = this.normalizeSize(input.sizeValue, input.sizeUnit);
    }

    const query = `
      INSERT INTO manufacturer_catalog (
        id, gtin, canonical_name, brand_id, category_id,
        size_value, size_unit, size_normalized_ml, attributes,
        description_embedding
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *
    `;

    const params = [
      id,
      input.gtin || null,
      input.canonicalName,
      input.brandId || null,
      input.categoryId || null,
      input.sizeValue || null,
      input.sizeUnit || null,
      sizeNormalizedMl,
      JSON.stringify(input.attributes || {}),
      embedding ? `[${embedding.join(',')}]` : null
    ];

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  async updateProduct(id: string, input: Partial<ProductInput>) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.canonicalName) {
      updates.push(`canonical_name = $${paramIndex++}`);
      params.push(input.canonicalName);

      // Regenerate embedding
      try {
        const embedding = await this.nlpClient.generateEmbedding(input.canonicalName);
        updates.push(`description_embedding = $${paramIndex++}`);
        params.push(`[${embedding.join(',')}]`);
      } catch (error) {
        console.warn('Failed to regenerate embedding:', error);
      }
    }

    if (input.gtin !== undefined) {
      updates.push(`gtin = $${paramIndex++}`);
      params.push(input.gtin);
    }

    if (input.brandId !== undefined) {
      updates.push(`brand_id = $${paramIndex++}`);
      params.push(input.brandId);
    }

    if (input.categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      params.push(input.categoryId);
    }

    if (input.sizeValue !== undefined || input.sizeUnit !== undefined) {
      if (input.sizeValue !== undefined) {
        updates.push(`size_value = $${paramIndex++}`);
        params.push(input.sizeValue);
      }
      if (input.sizeUnit !== undefined) {
        updates.push(`size_unit = $${paramIndex++}`);
        params.push(input.sizeUnit);
      }
      // Recalculate normalized size
      const currentProduct = await this.getProductById(id);
      const sizeValue = input.sizeValue ?? currentProduct?.size_value;
      const sizeUnit = input.sizeUnit ?? currentProduct?.size_unit;
      if (sizeValue && sizeUnit) {
        updates.push(`size_normalized_ml = $${paramIndex++}`);
        params.push(this.normalizeSize(sizeValue, sizeUnit));
      }
    }

    if (input.attributes) {
      updates.push(`attributes = $${paramIndex++}`);
      params.push(JSON.stringify(input.attributes));
    }

    if (updates.length === 0) {
      return this.getProductById(id);
    }

    params.push(id);
    const query = `
      UPDATE manufacturer_catalog
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  private normalizeSize(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      'ml': 1,
      'l': 1000,
      'oz': 29.5735,
      'fl oz': 29.5735,
      'g': 1,
      'kg': 1000,
      'lb': 453.592,
      'ct': 1
    };

    const multiplier = conversions[unit.toLowerCase()] || 1;
    return Math.round(value * multiplier * 100) / 100;
  }
}
