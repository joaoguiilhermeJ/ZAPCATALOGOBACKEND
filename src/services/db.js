/**
 * db.js — Conexão com Neon PostgreSQL (serverless)
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;

function getPool() {
  if (!DATABASE_URL) {
    console.warn('[DB] DATABASE_URL não configurada — usando fallback vazio');
    return null;
  }
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

/**
 * Executa uma query SQL no banco
 */
export async function query(text, params = []) {
  const p = getPool();
  if (!p) return { rows: [] };
  const start = Date.now();
  const result = await p.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB] Query executada em ${duration}ms — ${text.slice(0, 60)}...`);
  return result;
}

/**
 * Testa a conexão com o banco
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    return { connected: true, time: result.rows[0].now };
  } catch (error) {
    console.error('[DB] Erro de conexão:', error.message);
    return { connected: false, error: error.message };
  }
}

/**
 * Cria a tabela de pagamentos se não existir
 */
export async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      external_reference TEXT UNIQUE NOT NULL,
      preference_id TEXT,
      payment_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      approved_at TIMESTAMP
    );
  `);
  console.log('[DB] Tabela "payments" garantida');
}

export default { query, testConnection, ensureTables };
