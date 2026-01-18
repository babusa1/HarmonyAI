/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HarmonizeIQ Backend API',
      version,
      description: `
# HarmonizeIQ Data Harmonization Platform API

This API powers the HarmonizeIQ platform for CPG data harmonization.

## Features
- **Catalog Management**: Manage manufacturer product catalogs
- **Retailer Data**: Upload and process retailer product data
- **Data Matching**: AI-powered product matching with human-in-the-loop
- **Analytics**: Dashboard metrics and insights

## Authentication
Currently using API keys (future: JWT authentication)

## Rate Limits
- 100 requests/minute for standard endpoints
- 10 requests/minute for batch processing
      `,
      contact: {
        name: 'HarmonizeIQ Support',
        email: 'support@harmonizeiq.com'
      },
      license: {
        name: 'Proprietary',
      }
    },
    servers: [
      {
        url: 'http://localhost:9001',
        description: 'Development server'
      },
      {
        url: 'https://api.harmonizeiq.com',
        description: 'Production server'
      }
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Catalog', description: 'Manufacturer catalog management' },
      { name: 'Upload', description: 'Data upload and processing' },
      { name: 'Mappings', description: 'Product mapping and HITL review' },
      { name: 'Dashboard', description: 'Analytics and metrics' },
      { name: 'Export', description: 'Data export functionality' }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            gtin: { type: 'string', example: '0012000001234' },
            canonicalName: { type: 'string', example: 'Mountain Dew Original 20oz' },
            brand: { type: 'string', example: 'Mountain Dew' },
            category: { type: 'string', example: 'Beverages' },
            sizeValue: { type: 'number', example: 20 },
            sizeUnit: { type: 'string', example: 'oz' },
            mappedCount: { type: 'number', example: 5 }
          }
        },
        RetailerData: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            externalSku: { type: 'string', example: 'WMT-123456' },
            rawDescription: { type: 'string', example: 'MTN DEW ORIG 20Z' },
            normalizedDescription: { type: 'string', example: 'Mountain Dew Original 20oz' },
            sourceSystem: { type: 'string', example: 'walmart' },
            processingStatus: { type: 'string', enum: ['pending', 'processed', 'error'] }
          }
        },
        Mapping: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            masterId: { type: 'string', format: 'uuid' },
            rawId: { type: 'string', format: 'uuid' },
            semanticScore: { type: 'number', example: 0.85 },
            attributeScore: { type: 'number', example: 0.90 },
            finalConfidence: { type: 'number', example: 0.87 },
            status: { type: 'string', enum: ['pending', 'verified', 'rejected', 'auto_confirmed'] }
          }
        },
        DashboardMetrics: {
          type: 'object',
          properties: {
            totalProducts: { type: 'number' },
            totalMappings: { type: 'number' },
            pendingReview: { type: 'number' },
            autoConfirmedRate: { type: 'number' },
            avgConfidence: { type: 'number' }
          }
        },
        UploadResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            recordsProcessed: { type: 'number' },
            recordsFailed: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
