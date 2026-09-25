import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

export const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.SQL_HOST);

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    if (!isDbConfigured) {
      console.warn('[AI Studio] Database not configured (no DATABASE_URL or SQL_HOST) — using resilient in-memory stores');
    }
    const connectionConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.SQL_HOST || '127.0.0.1',
          user: process.env.SQL_USER || 'mock',
          password: process.env.SQL_PASSWORD || 'mock',
          database: process.env.SQL_DB_NAME || 'mock',
        };
    global._postgresPool = new Pool({
      ...connectionConfig,
      max: 10,
      connectionTimeoutMillis: isDbConfigured ? 10000 : 1000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err: Error) => {
      console.warn('Postgres SQL pool notification (safe fallback active):', err?.message || err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

