/**
 * CatalogoDb — Persistência de catálogos e produtos no Neon PostgreSQL
 * Segue o mesmo padrão do paymentDb.js
 */

import { query } from './db.js';

export class CatalogoDb {
  /**
   * Cria um novo catálogo
   */
  async create({ nome_loja, slug, whatsapp, cor_tema, logo_url }) {
    const result = await query(
      `INSERT INTO catalogos (nome_loja, slug, whatsapp, cor_tema, logo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome_loja, slug, whatsapp || null, cor_tema || '#128C7E', logo_url || null]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca um catálogo pelo slug
   */
  async findBySlug(slug) {
    const result = await query(
      `SELECT * FROM catalogos WHERE slug = $1`,
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca um catálogo pelo ID
   */
  async findById(id) {
    const result = await query(
      `SELECT * FROM catalogos WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Atualiza campos de um catálogo
   */
  async update(id, fields) {
    const sets = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (!sets.length) return null;

    sets.push(`updated_at = NOW()`);

    values.push(id);
    const result = await query(
      `UPDATE catalogos SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Deleta um catálogo (cascade deleta produtos)
   */
  async delete(id) {
    const result = await query(
      `DELETE FROM catalogos WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }
}

export class ProdutoDb {
  /**
   * Insere múltiplos produtos de uma vez
   */
  async bulkCreate(catalogoId, produtos) {
    if (!produtos || !produtos.length) return [];

    const values = [];
    const placeholders = [];
    let idx = 1;

    for (const p of produtos) {
      placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`);
      values.push(
        catalogoId,
        p.nome || 'Produto',
        p.desc || null,
        p.preco || null,
        p.categoria || null,
        p.variacoes || null,
        p.codigo || null,
        p.estoque || null,
        p.imagem_url || null
      );
      idx += 9;
    }

    const result = await query(
      `INSERT INTO produtos (catalogo_id, nome, descricao, preco, categoria, variacoes, codigo, estoque, imagem_url)
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows;
  }

  /**
   * Busca todos os produtos de um catálogo
   */
  async findByCatalogoId(catalogoId) {
    const result = await query(
      `SELECT * FROM produtos WHERE catalogo_id = $1 ORDER BY created_at ASC`,
      [catalogoId]
    );
    return result.rows;
  }

  /**
   * Deleta todos os produtos de um catálogo
   */
  async deleteByCatalogoId(catalogoId) {
    await query(
      `DELETE FROM produtos WHERE catalogo_id = $1`,
      [catalogoId]
    );
  }
}

export default { CatalogoDb: new CatalogoDb(), ProdutoDb: new ProdutoDb() };
