/**
 * Analytics & Reporting Routes
 */

import { Router } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const analyticsRoutes = Router();
const analyticsService = new AnalyticsService();

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary statistics
 */
analyticsRoutes.get('/dashboard', asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats();
  res.json(stats);
}));

/**
 * GET /api/analytics/sales
 * Get harmonized sales data
 */
analyticsRoutes.get('/sales', asyncHandler(async (req, res) => {
  const { 
    startDate,
    endDate,
    brand,
    category,
    retailer,
    granularity = 'monthly'
  } = req.query;

  const result = await analyticsService.getSalesData({
    startDate: startDate as string,
    endDate: endDate as string,
    brand: brand as string,
    category: category as string,
    retailer: retailer as string,
    granularity: granularity as 'daily' | 'weekly' | 'monthly'
  });

  res.json(result);
}));

/**
 * GET /api/analytics/benchmark
 * Get competitor benchmarking data
 */
analyticsRoutes.get('/benchmark', asyncHandler(async (req, res) => {
  const {
    category,
    ourBrand,
    competitorBrand,
    startDate,
    endDate
  } = req.query;

  const result = await analyticsService.getCompetitorBenchmark({
    category: category as string,
    ourBrand: ourBrand as string,
    competitorBrand: competitorBrand as string,
    startDate: startDate as string,
    endDate: endDate as string
  });

  res.json(result);
}));

/**
 * GET /api/analytics/market-share
 * Get market share analysis
 */
analyticsRoutes.get('/market-share', asyncHandler(async (req, res) => {
  const { category, period = 'last_12_months' } = req.query;

  const result = await analyticsService.getMarketShare({
    category: category as string,
    period: period as string
  });

  res.json(result);
}));

/**
 * GET /api/analytics/trends
 * Get sales trends over time
 */
analyticsRoutes.get('/trends', asyncHandler(async (req, res) => {
  const { brand, category, months = 12 } = req.query;

  const result = await analyticsService.getSalesTrends({
    brand: brand as string,
    category: category as string,
    months: Number(months)
  });

  res.json(result);
}));

/**
 * GET /api/analytics/top-products
 * Get top performing products
 */
analyticsRoutes.get('/top-products', asyncHandler(async (req, res) => {
  const { 
    limit = 10, 
    metric = 'revenue',
    category,
    includeCompetitors = false
  } = req.query;

  const result = await analyticsService.getTopProducts({
    limit: Number(limit),
    metric: metric as 'revenue' | 'units',
    category: category as string,
    includeCompetitors: includeCompetitors === 'true'
  });

  res.json(result);
}));

/**
 * POST /api/analytics/export
 * Export analytics data
 */
analyticsRoutes.post('/export', asyncHandler(async (req, res) => {
  const { reportType, filters, format = 'csv' } = req.body;

  const result = await analyticsService.exportReport({
    reportType,
    filters,
    format
  });

  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${Date.now()}.${format}"`);
  res.send(result);
}));
