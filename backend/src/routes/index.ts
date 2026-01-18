/**
 * API Routes
 * @swagger
 * tags:
 *   - name: Health
 *     description: Health check endpoints
 */

import { Router } from 'express';
import { catalogRoutes } from './catalog.routes.js';
import { retailerRoutes } from './retailer.routes.js';
import { mappingRoutes } from './mapping.routes.js';
import { analyticsRoutes } from './analytics.routes.js';
import { uploadRoutes } from './upload.routes.js';
import { exportRoutes } from './export.routes.js';

export const router = Router();

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API Overview
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    name: 'HarmonizeIQ API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      catalog: '/api/catalog - Manufacturer catalog (Golden Record)',
      retailer: '/api/retailer - Retailer raw data',
      mapping: '/api/mapping - Equivalence mappings & HITL',
      analytics: '/api/analytics - Sales analytics & benchmarking',
      upload: '/api/upload - Data ingestion',
      export: '/api/export - Data export (CSV, JSON)'
    }
  });
});

// Mount routes
router.use('/catalog', catalogRoutes);
router.use('/retailer', retailerRoutes);
router.use('/mapping', mappingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);
router.use('/export', exportRoutes);
