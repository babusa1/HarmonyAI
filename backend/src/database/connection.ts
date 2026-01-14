/**
 * Database Connection Pool
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'harmonizeiq',
  user: process.env.DB_USER || 'harmonize_admin',
  password: process.env.DB_PASSWORD || 'harmonize_secret_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

/**
 * Initialize database connection and verify connectivity
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    
    // Verify connection
    await client.query('SELECT NOW()');
    
    // Check for required extensions
    const extensionCheck = await client.query(`
      SELECT 
        EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector,
        EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') as has_uuid
    `);
    
    const { has_vector, has_uuid } = extensionCheck.rows[0];
    
    if (!has_vector) {
      logger.warn('pgvector extension not found - vector similarity search will not work');
    }
    
    if (!has_uuid) {
      logger.warn('uuid-ossp extension not found');
    }
    
    client.release();
    logger.info('Database connection verified successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Execute a query with automatic connection handling
 */
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    logger.error('Query error:', { text: text.substring(0, 100), error });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
