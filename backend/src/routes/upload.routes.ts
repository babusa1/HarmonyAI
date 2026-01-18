/**
 * Data Upload Routes
 * @swagger
 * tags:
 *   - name: Upload
 *     description: Data upload and processing endpoints
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
 * @swagger
 * /api/upload/catalog:
 *   post:
 *     summary: Upload manufacturer catalog (Golden Record)
 *     tags: [Upload]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns - gtin, canonical_name, brand, manufacturer, category, size_value, size_unit
 *     responses:
 *       200:
 *         description: Upload successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid file or missing data
 */
uploadRoutes.post('/catalog', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const result = await uploadService.uploadCatalog(req.file);
  res.json(result);
}));

/**
 * @swagger
 * /api/upload/retailer:
 *   post:
 *     summary: Upload retailer product data
 *     tags: [Upload]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - sourceSystem
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns - external_sku, raw_description, unit_price
 *               sourceSystem:
 *                 type: string
 *                 description: Retailer identifier (e.g., walmart, target, kroger)
 *                 example: walmart
 *     responses:
 *       200:
 *         description: Upload successful
 *       400:
 *         description: Invalid file or missing sourceSystem
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
 * @swagger
 * /api/upload/sales:
 *   post:
 *     summary: Upload sales transaction data
 *     tags: [Upload]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - sourceSystem
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with sales data
 *               sourceSystem:
 *                 type: string
 *                 description: Retailer identifier
 *     responses:
 *       200:
 *         description: Upload successful
 *       400:
 *         description: Invalid file
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
 * @swagger
 * /api/upload/templates:
 *   get:
 *     summary: Get available CSV templates
 *     tags: [Upload]
 *     responses:
 *       200:
 *         description: List of available templates
 */
uploadRoutes.get('/templates', asyncHandler(async (req, res) => {
  const templates = uploadService.getTemplates();
  res.json(templates);
}));

/**
 * @swagger
 * /api/upload/templates/{type}:
 *   get:
 *     summary: Download a specific CSV template
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [catalog, retailer, sales]
 *         description: Template type
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
uploadRoutes.get('/templates/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const template = uploadService.getTemplate(type);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-template.csv"`);
  res.send(template);
}));

/**
 * @swagger
 * /api/upload/process:
 *   post:
 *     summary: Trigger AI processing of uploaded data
 *     description: Generates embeddings and finds matches for pending retailer data
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 default: 100
 *                 description: Number of records to process per batch
 *     responses:
 *       200:
 *         description: Processing completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processed: { type: integer }
 *                 autoConfirmed: { type: integer }
 *                 pendingReview: { type: integer }
 *                 failed: { type: integer }
 */
uploadRoutes.post('/process', asyncHandler(async (req, res) => {
  const { batchSize = 100 } = req.body;
  const result = await uploadService.triggerProcessing(batchSize);
  res.json(result);
}));

/**
 * @swagger
 * /api/upload/status:
 *   get:
 *     summary: Get current processing status
 *     tags: [Upload]
 *     responses:
 *       200:
 *         description: Current processing status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stage: { type: string }
 *                 progress: { type: number }
 *                 pending: { type: integer }
 *                 processed: { type: integer }
 *                 total: { type: integer }
 */
uploadRoutes.get('/status', asyncHandler(async (req, res) => {
  const status = await uploadService.getProcessingStatus();
  res.json(status);
}));
