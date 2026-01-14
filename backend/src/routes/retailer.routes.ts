/**
 * Retailer Raw Data Routes
 */

import { Router } from 'express';
import { RetailerService } from '../services/retailer.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const retailerRoutes = Router();
const retailerService = new RetailerService();

/**
 * GET /api/retailer
 * List all retailer raw data
 */
retailerRoutes.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    source,
    status,
    search 
  } = req.query;

  const result = await retailerService.getRawData({
    page: Number(page),
    limit: Number(limit),
    source: source as string,
    status: status as string,
    search: search as string
  });

  res.json(result);
}));

/**
 * GET /api/retailer/:id
 * Get a single raw data record
 */
retailerRoutes.get('/:id', asyncHandler(async (req, res) => {
  const data = await retailerService.getRawDataById(req.params.id);
  
  if (!data) {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.json(data);
}));

/**
 * GET /api/retailer/sources
 * Get all source systems (retailers)
 */
retailerRoutes.get('/meta/sources', asyncHandler(async (req, res) => {
  const sources = await retailerService.getSources();
  res.json(sources);
}));

/**
 * GET /api/retailer/:id/matches
 * Get potential matches for a raw record
 */
retailerRoutes.get('/:id/matches', asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const matches = await retailerService.getMatches(req.params.id, Number(limit));
  res.json(matches);
}));

/**
 * POST /api/retailer/:id/process
 * Process a raw record (generate embedding, find matches)
 */
retailerRoutes.post('/:id/process', asyncHandler(async (req, res) => {
  const result = await retailerService.processRawData(req.params.id);
  res.json(result);
}));
