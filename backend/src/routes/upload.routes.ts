/**
 * Data Upload Routes
 */

import { Router } from 'express';
import multer from 'multer';
import { UploadService } from '../services/upload.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const uploadRoutes = Router();
const uploadService = new UploadService();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.originalname.endsWith('.csv') ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XLSX files are allowed'));
    }
  }
});

/**
 * POST /api/upload/catalog
 * Upload manufacturer catalog data
 */
uploadRoutes.post('/catalog', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const result = await uploadService.uploadCatalog(req.file);
  res.json(result);
}));

/**
 * POST /api/upload/retailer
 * Upload retailer raw data
 */
uploadRoutes.post('/retailer', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { sourceSystem } = req.body;
  if (!sourceSystem) {
    return res.status(400).json({ error: 'sourceSystem is required' });
  }

  const result = await uploadService.uploadRetailerData(req.file, sourceSystem);
  res.json(result);
}));

/**
 * POST /api/upload/sales
 * Upload sales transaction data
 */
uploadRoutes.post('/sales', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { sourceSystem } = req.body;
  if (!sourceSystem) {
    return res.status(400).json({ error: 'sourceSystem is required' });
  }

  const result = await uploadService.uploadSalesData(req.file, sourceSystem);
  res.json(result);
}));

/**
 * GET /api/upload/templates
 * Get CSV templates for uploads
 */
uploadRoutes.get('/templates', asyncHandler(async (req, res) => {
  const templates = uploadService.getTemplates();
  res.json(templates);
}));

/**
 * GET /api/upload/templates/:type
 * Download a specific template
 */
uploadRoutes.get('/templates/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const template = uploadService.getTemplate(type);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-template.csv"`);
  res.send(template);
}));

/**
 * POST /api/upload/process
 * Trigger processing of uploaded data (embedding generation + matching)
 */
uploadRoutes.post('/process', asyncHandler(async (req, res) => {
  const { batchSize = 100 } = req.body;
  const result = await uploadService.triggerProcessing(batchSize);
  res.json(result);
}));

/**
 * GET /api/upload/status
 * Get upload processing status
 */
uploadRoutes.get('/status', asyncHandler(async (req, res) => {
  const status = await uploadService.getProcessingStatus();
  res.json(status);
}));
