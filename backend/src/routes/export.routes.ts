/**
 * Data Export Routes
 * Phase 4: Export harmonized data
 * @swagger
 * tags:
 *   - name: Export
 *     description: Export harmonized data in various formats
 */

import { Router } from 'express';
import { pool } from '../database/connection.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const exportRoutes = Router();

/**
 * @swagger
 * /api/export/mappings:
 *   get:
 *     summary: Export all verified mappings
 *     tags: [Export]
 */
exportRoutes.get('/mappings', asyncHandler(async (req, res) => {
  const { format = 'json', status = 'all', retailer } = req.query;

  let whereClause = '';
  const params: any[] = [];
  let paramCount = 0;

  if (status && status !== 'all') {
    paramCount++;
    whereClause += `WHERE em.status = $${paramCount} `;
    params.push(status);
  }

  if (retailer) {
    paramCount++;
    whereClause += whereClause ? `AND ss.code = $${paramCount} ` : `WHERE ss.code = $${paramCount} `;
    params.push(retailer);
  }

  const query = `
    SELECT 
      em.id as mapping_id,
      mc.gtin as master_gtin,
      mc.canonical_name as master_name,
      b.name as brand,
      c.name as category,
      rdr.external_sku as retailer_sku,
      rdr.raw_description,
      rdr.cleaned_description as normalized_description,
      ss.code as retailer,
      em.final_confidence,
      em.status,
      em.reviewed_at
    FROM equivalence_map em
    JOIN manufacturer_catalog mc ON em.master_id = mc.id
    JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
    JOIN source_systems ss ON rdr.source_system_id = ss.id
    LEFT JOIN brands b ON mc.brand_id = b.id
    LEFT JOIN categories c ON mc.category_id = c.id
    ${whereClause}
    ORDER BY em.final_confidence DESC
  `;

  const result = await pool.query(query, params);

  if (format === 'csv') {
    const headers = ['mapping_id','master_gtin','master_name','brand','category','retailer_sku','raw_description','normalized_description','retailer','confidence','status','reviewed_at'];
    let csv = headers.join(',') + '\n';
    for (const row of result.rows) {
      csv += [
        row.mapping_id,
        `"${row.master_gtin || ''}"`,
        `"${(row.master_name || '').replace(/"/g, '""')}"`,
        `"${row.brand || ''}"`,
        `"${row.category || ''}"`,
        `"${row.retailer_sku || ''}"`,
        `"${(row.raw_description || '').replace(/"/g, '""')}"`,
        `"${(row.normalized_description || '').replace(/"/g, '""')}"`,
        row.retailer,
        row.final_confidence,
        row.status,
        row.reviewed_at || ''
      ].join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="harmonized_mappings.csv"');
    return res.send(csv);
  }

  res.json({ count: result.rows.length, data: result.rows });
}));

/**
 * @swagger
 * /api/export/catalog:
 *   get:
 *     summary: Export master catalog with mapping counts
 *     tags: [Export]
 */
exportRoutes.get('/catalog', asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;

  const query = `
    SELECT 
      mc.id, mc.gtin, mc.canonical_name, b.name as brand, c.name as category,
      mc.size_value, mc.size_unit,
      COUNT(DISTINCT em.id) FILTER (WHERE em.status IN ('verified', 'auto_confirmed')) as mapped_count,
      COUNT(DISTINCT CASE WHEN em.status = 'pending' THEN em.id END) as pending_count
    FROM manufacturer_catalog mc
    LEFT JOIN brands b ON mc.brand_id = b.id
    LEFT JOIN categories c ON mc.category_id = c.id
    LEFT JOIN equivalence_map em ON mc.id = em.master_id
    GROUP BY mc.id, mc.gtin, mc.canonical_name, b.name, c.name, mc.size_value, mc.size_unit
    ORDER BY mc.canonical_name
  `;

  const result = await pool.query(query);

  if (format === 'csv') {
    const headers = ['id','gtin','canonical_name','brand','category','size_value','size_unit','mapped_count','pending_count'];
    let csv = headers.join(',') + '\n';
    for (const row of result.rows) {
      csv += [
        row.id,
        `"${row.gtin || ''}"`,
        `"${(row.canonical_name || '').replace(/"/g, '""')}"`,
        `"${row.brand || ''}"`,
        `"${row.category || ''}"`,
        row.size_value || '',
        row.size_unit || '',
        row.mapped_count,
        row.pending_count
      ].join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="master_catalog.csv"');
    return res.send(csv);
  }

  res.json({ count: result.rows.length, data: result.rows });
}));

/**
 * @swagger
 * /api/export/retailer/{retailer}:
 *   get:
 *     summary: Export retailer data with harmonized mappings
 *     tags: [Export]
 */
exportRoutes.get('/retailer/:retailer', asyncHandler(async (req, res) => {
  const { retailer } = req.params;
  const { format = 'json' } = req.query;

  const query = `
    SELECT 
      rdr.external_sku, rdr.raw_description, rdr.unit_price,
      mc.gtin as harmonized_gtin, mc.canonical_name as harmonized_name,
      b.name as brand, c.name as category,
      em.final_confidence, em.status as mapping_status
    FROM retailer_data_raw rdr
    JOIN source_systems ss ON rdr.source_system_id = ss.id
    LEFT JOIN equivalence_map em ON rdr.id = em.raw_id AND em.status IN ('verified', 'auto_confirmed')
    LEFT JOIN manufacturer_catalog mc ON em.master_id = mc.id
    LEFT JOIN brands b ON mc.brand_id = b.id
    LEFT JOIN categories c ON mc.category_id = c.id
    WHERE ss.code = $1
    ORDER BY rdr.external_sku
  `;

  const result = await pool.query(query, [retailer]);

  if (format === 'csv') {
    const headers = ['retailer_sku','raw_description','unit_price','harmonized_gtin','harmonized_name','brand','category','confidence','mapping_status'];
    let csv = headers.join(',') + '\n';
    for (const row of result.rows) {
      csv += [
        `"${row.external_sku}"`,
        `"${(row.raw_description || '').replace(/"/g, '""')}"`,
        row.unit_price || '',
        `"${row.harmonized_gtin || ''}"`,
        `"${(row.harmonized_name || '').replace(/"/g, '""')}"`,
        `"${row.brand || ''}"`,
        `"${row.category || ''}"`,
        row.final_confidence || '',
        row.mapping_status || 'unmatched'
      ].join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${retailer}_harmonized.csv"`);
    return res.send(csv);
  }

  res.json({ retailer, count: result.rows.length, data: result.rows });
}));

/**
 * @swagger
 * /api/export/analytics/cross-retailer:
 *   get:
 *     summary: Cross-retailer product comparison
 *     tags: [Export]
 */
exportRoutes.get('/analytics/cross-retailer', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      mc.canonical_name, b.name as brand, c.name as category,
      json_agg(json_build_object(
        'retailer', ss.code, 'sku', rdr.external_sku, 'description', rdr.raw_description,
        'price', rdr.unit_price, 'confidence', em.final_confidence
      )) as retailers
    FROM manufacturer_catalog mc
    JOIN equivalence_map em ON mc.id = em.master_id AND em.status IN ('verified', 'auto_confirmed')
    JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
    JOIN source_systems ss ON rdr.source_system_id = ss.id
    LEFT JOIN brands b ON mc.brand_id = b.id
    LEFT JOIN categories c ON mc.category_id = c.id
    GROUP BY mc.id, mc.canonical_name, b.name, c.name
    HAVING COUNT(DISTINCT ss.code) > 1
    ORDER BY mc.canonical_name
  `;

  const result = await pool.query(query);
  res.json({ count: result.rows.length, description: 'Products appearing at multiple retailers', data: result.rows });
}));

/**
 * @swagger
 * /api/export/analytics/price-comparison:
 *   get:
 *     summary: Price comparison across retailers
 *     tags: [Export]
 */
exportRoutes.get('/analytics/price-comparison', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      mc.canonical_name as product, b.name as brand,
      MIN(rdr.unit_price) as min_price, MAX(rdr.unit_price) as max_price,
      AVG(rdr.unit_price) as avg_price, MAX(rdr.unit_price) - MIN(rdr.unit_price) as price_spread,
      COUNT(DISTINCT ss.code) as retailer_count,
      json_agg(json_build_object('retailer', ss.code, 'price', rdr.unit_price) ORDER BY rdr.unit_price) as prices_by_retailer
    FROM manufacturer_catalog mc
    JOIN equivalence_map em ON mc.id = em.master_id AND em.status IN ('verified', 'auto_confirmed')
    JOIN retailer_data_raw rdr ON em.raw_id = rdr.id
    JOIN source_systems ss ON rdr.source_system_id = ss.id
    LEFT JOIN brands b ON mc.brand_id = b.id
    WHERE rdr.unit_price IS NOT NULL AND rdr.unit_price > 0
    GROUP BY mc.id, mc.canonical_name, b.name
    HAVING COUNT(*) > 1
    ORDER BY (MAX(rdr.unit_price) - MIN(rdr.unit_price)) DESC
    LIMIT 50
  `;

  const result = await pool.query(query);
  res.json({ description: 'Products with largest price variations across retailers', count: result.rows.length, data: result.rows });
}));

/**
 * @swagger
 * /api/export/analytics/summary:
 *   get:
 *     summary: Overall harmonization summary statistics
 *     tags: [Export]
 */
exportRoutes.get('/analytics/summary', asyncHandler(async (req, res) => {
  const summaryQuery = `
    SELECT
      (SELECT COUNT(*) FROM manufacturer_catalog) as total_master_products,
      (SELECT COUNT(*) FROM retailer_data_raw) as total_retailer_skus,
      (SELECT COUNT(*) FROM equivalence_map WHERE status = 'verified') as verified_mappings,
      (SELECT COUNT(*) FROM equivalence_map WHERE status = 'auto_confirmed') as auto_confirmed_mappings,
      (SELECT COUNT(*) FROM equivalence_map WHERE status = 'pending') as pending_review,
      (SELECT COUNT(DISTINCT source_system_id) FROM retailer_data_raw) as retailer_count,
      (SELECT AVG(final_confidence) FROM equivalence_map WHERE status IN ('verified', 'auto_confirmed')) as avg_confidence
  `;

  const retailerBreakdown = `
    SELECT 
      ss.code as retailer,
      COUNT(DISTINCT rdr.id) as total_skus,
      COUNT(DISTINCT em.id) FILTER (WHERE em.status IN ('verified', 'auto_confirmed')) as mapped_skus,
      COUNT(DISTINCT em.id) FILTER (WHERE em.status = 'pending') as pending_skus,
      ROUND(AVG(em.final_confidence) * 100, 1) as avg_confidence
    FROM retailer_data_raw rdr
    JOIN source_systems ss ON rdr.source_system_id = ss.id
    LEFT JOIN equivalence_map em ON rdr.id = em.raw_id
    GROUP BY ss.code
    ORDER BY ss.code
  `;

  const [summary, retailers] = await Promise.all([
    pool.query(summaryQuery),
    pool.query(retailerBreakdown)
  ]);

  const data = summary.rows[0];
  const totalMapped = parseInt(data.verified_mappings) + parseInt(data.auto_confirmed_mappings);
  const autoConfirmRate = totalMapped > 0 
    ? (parseInt(data.auto_confirmed_mappings) / totalMapped * 100).toFixed(1)
    : 0;

  res.json({
    overview: {
      totalMasterProducts: parseInt(data.total_master_products),
      totalRetailerSKUs: parseInt(data.total_retailer_skus),
      totalMappings: totalMapped,
      pendingReview: parseInt(data.pending_review),
      autoConfirmRate: `${autoConfirmRate}%`,
      avgConfidence: data.avg_confidence ? (parseFloat(data.avg_confidence) * 100).toFixed(1) + '%' : 'N/A',
      retailerCount: parseInt(data.retailer_count)
    },
    byRetailer: retailers.rows
  });
}));
