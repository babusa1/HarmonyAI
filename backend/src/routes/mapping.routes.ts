/**
 * Equivalence Mapping Routes (HITL Workflow)
 */

import { Router } from 'express';
import { MappingService } from '../services/mapping.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const mappingRoutes = Router();
const mappingService = new MappingService();

/**
 * GET /api/mapping
 * List all mappings with filters
 */
mappingRoutes.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    status,
    minConfidence,
    maxConfidence
  } = req.query;

  const result = await mappingService.getMappings({
    page: Number(page),
    limit: Number(limit),
    status: status as string,
    minConfidence: minConfidence ? Number(minConfidence) : undefined,
    maxConfidence: maxConfidence ? Number(maxConfidence) : undefined
  });

  res.json(result);
}));

/**
 * GET /api/mapping/pending
 * Get pending mappings for HITL review (sorted by confidence)
 */
mappingRoutes.get('/pending', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await mappingService.getPendingMappings({
    page: Number(page),
    limit: Number(limit)
  });

  res.json(result);
}));

/**
 * GET /api/mapping/stats
 * Get mapping statistics
 */
mappingRoutes.get('/stats', asyncHandler(async (req, res) => {
  const stats = await mappingService.getStats();
  res.json(stats);
}));

/**
 * GET /api/mapping/:id
 * Get a single mapping with full details
 */
mappingRoutes.get('/:id', asyncHandler(async (req, res) => {
  const mapping = await mappingService.getMappingById(req.params.id);
  
  if (!mapping) {
    return res.status(404).json({ error: 'Mapping not found' });
  }

  res.json(mapping);
}));

/**
 * POST /api/mapping/:id/approve
 * Approve a pending mapping
 */
mappingRoutes.post('/:id/approve', asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const mapping = await mappingService.approveMapping(req.params.id, notes);
  res.json(mapping);
}));

/**
 * POST /api/mapping/:id/reject
 * Reject a pending mapping
 */
mappingRoutes.post('/:id/reject', asyncHandler(async (req, res) => {
  const { notes, alternativeMasterId } = req.body;
  const mapping = await mappingService.rejectMapping(req.params.id, notes, alternativeMasterId);
  res.json(mapping);
}));

/**
 * POST /api/mapping/manual
 * Create a manual mapping
 */
mappingRoutes.post('/manual', asyncHandler(async (req, res) => {
  const { masterId, rawId, notes, isCompetitor, competitorBrand } = req.body;
  const mapping = await mappingService.createManualMapping({
    masterId,
    rawId,
    notes,
    isCompetitor,
    competitorBrand
  });
  res.status(201).json(mapping);
}));

/**
 * POST /api/mapping/batch
 * Batch process mappings (auto-confirm high confidence, flag low)
 */
mappingRoutes.post('/batch', asyncHandler(async (req, res) => {
  const { autoConfirmThreshold = 0.95, flagThreshold = 0.70 } = req.body;
  const result = await mappingService.batchProcess(autoConfirmThreshold, flagThreshold);
  res.json(result);
}));
