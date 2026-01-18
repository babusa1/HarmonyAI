/**
 * HarmonizeIQ Backend API
 * Main entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { router as apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initializeDatabase } from './database/connection.js';
import { swaggerSpec } from './config/swagger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI to load
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:9000',
  credentials: true,
}));

// Request processing
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'harmonizeiq-backend',
    timestamp: new Date().toISOString()
  });
});

// Swagger API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HarmonizeIQ API Docs'
}));

// Swagger JSON endpoint
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api', apiRouter);

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connection established');

    app.listen(PORT, () => {
      logger.info(`🚀 HarmonizeIQ Backend running on http://localhost:${PORT}`);
      logger.info(`📊 API Documentation: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app };
