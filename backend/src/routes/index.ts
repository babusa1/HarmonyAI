/**
 * API Routes
 */

import { Router } from 'express';
import { catalogRoutes } from './catalog.routes.js';
import { retailerRoutes } from './retailer.routes.js';
import { mappingRoutes } from './mapping.routes.js';
import { analyticsRoutes } from './analytics.routes.js';
import { uploadRoutes } from './upload.routes.js';

export const router = Router();

// API Documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    name: 'HarmonizeIQ API',
    version: '1.0.0',
    endpoints: {
      catalog: '/api/catalog - Manufacturer catalog (Golden Record)',
      retailer: '/api/retailer - Retailer raw data',
      mapping: '/api/mapping - Equivalence mappings & HITL',
      analytics: '/api/analytics - Sales analytics & benchmarking',
      upload: '/api/upload - Data ingestion'
    }
  });
});

// Mount routes
router.use('/catalog', catalogRoutes);
router.use('/retailer', retailerRoutes);
router.use('/mapping', mappingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);
