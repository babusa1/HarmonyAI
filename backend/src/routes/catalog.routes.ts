/**
 * Manufacturer Catalog Routes (Golden Record)
 */

import { Router } from 'express';
import { CatalogService } from '../services/catalog.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const catalogRoutes = Router();
const catalogService = new CatalogService();

/**
 * GET /api/catalog
 * List all products in the manufacturer catalog
 */
catalogRoutes.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    brand, 
    category,
    search 
  } = req.query;

  const result = await catalogService.getProducts({
    page: Number(page),
    limit: Number(limit),
    brand: brand as string,
    category: category as string,
    search: search as string
  });

  res.json(result);
}));

/**
 * GET /api/catalog/:id
 * Get a single product by ID
 */
catalogRoutes.get('/:id', asyncHandler(async (req, res) => {
  const product = await catalogService.getProductById(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
}));

/**
 * GET /api/catalog/brands
 * Get all unique brands
 */
catalogRoutes.get('/meta/brands', asyncHandler(async (req, res) => {
  const brands = await catalogService.getBrands();
  res.json(brands);
}));

/**
 * GET /api/catalog/categories
 * Get all categories
 */
catalogRoutes.get('/meta/categories', asyncHandler(async (req, res) => {
  const categories = await catalogService.getCategories();
  res.json(categories);
}));

/**
 * POST /api/catalog
 * Create a new product in the catalog
 */
catalogRoutes.post('/', asyncHandler(async (req, res) => {
  const product = await catalogService.createProduct(req.body);
  res.status(201).json(product);
}));

/**
 * PUT /api/catalog/:id
 * Update an existing product
 */
catalogRoutes.put('/:id', asyncHandler(async (req, res) => {
  const product = await catalogService.updateProduct(req.params.id, req.body);
  res.json(product);
}));
