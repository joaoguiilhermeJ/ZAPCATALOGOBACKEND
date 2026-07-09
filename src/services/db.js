/**
 * db.js — Conexão com Neon PostgreSQL (serverless)
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.error('[DB] DATABASE_URL não configurada em produção. Abortando inicialização.');
  process.exit(1);
}

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

/**
 * Cria a tabela de catálogos + produtos se não existir
 */
export async function ensureCatalogTables() {
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await query(`
    CREATE TABLE IF NOT EXISTS catalogos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome_loja TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      whatsapp TEXT,
      cor_tema TEXT DEFAULT '#128C7E',
      logo_url TEXT,
      edit_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      catalogo_id UUID NOT NULL REFERENCES catalogos(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco TEXT,
      categoria TEXT,
      variacoes TEXT,
      codigo TEXT,
      estoque TEXT,
      imagem_url TEXT,
      ativo BOOLEAN DEFAULT true,
      disponivel BOOLEAN DEFAULT true,
      motivo_indisponivel TEXT,
      imagem_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_produtos_catalogo_id ON produtos(catalogo_id);
  `);

  await query(`
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem_updated_at TIMESTAMP;
  `);

  await query(`
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS variacoes TEXT;
  `);

  await query(`
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
  `);

  await query(`
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true;
  `);

  await query(`
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS motivo_indisponivel TEXT;
  `);

  await query(`
    ALTER TABLE produtos ALTER COLUMN ativo SET DEFAULT true;
  `);

  await query(`
    ALTER TABLE produtos ALTER COLUMN disponivel SET DEFAULT true;
  `);

  await query(`
    UPDATE produtos
       SET ativo = true
     WHERE ativo IS NULL;
  `);

  await query(`
    UPDATE produtos
       SET disponivel = true
     WHERE disponivel IS NULL;
  `);

  await query(`
    ALTER TABLE catalogos ADD COLUMN IF NOT EXISTS edit_token TEXT;
  `);

  await query(`
    ALTER TABLE catalogos ALTER COLUMN edit_token SET DEFAULT encode(gen_random_bytes(32), 'hex');
  `);

  await query(`
    UPDATE catalogos
       SET edit_token = encode(gen_random_bytes(32), 'hex')
     WHERE edit_token IS NULL OR edit_token = '';
  `);

  await query(`
    ALTER TABLE catalogos ALTER COLUMN edit_token SET NOT NULL;
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogos_edit_token ON catalogos(edit_token);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_catalogos_slug ON catalogos(slug);
  `);

  // Migration: adiciona usuario_id se não existir
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'catalogos' AND column_name = 'usuario_id'
      ) THEN
        ALTER TABLE catalogos ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  console.log('[DB] Tabelas "catalogos" e "produtos" garantidas');
}

/**
 * Cria a tabela de usuários se não existir
 */
export async function ensureUserTables() {
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      nome TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('[DB] Tabela "usuarios" garantida');
}

export default { query, testConnection, ensureTables, ensureCatalogTables, ensureUserTables };
