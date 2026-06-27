/**
 * UsuariosDb — Persistência de usuários no Neon PostgreSQL
 */

import { query } from './db.js';

export class UsuariosDb {
  /**
   * Cria um novo usuário
   */
  async create({ email, senha_hash, nome }) {
    const result = await query(
      `INSERT INTO usuarios (email, senha_hash, nome)
       VALUES ($1, $2, $3)
       RETURNING id, email, nome, created_at`,
      [email, senha_hash, nome]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email) {
    const result = await query(
      `SELECT * FROM usuarios WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca usuário por ID
   */
  async findById(id) {
    const result = await query(
      `SELECT id, email, nome, created_at FROM usuarios WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }
}

export default new UsuariosDb();
