// src/controllers/lojaController.js
// Endpoint público para buscar um catálogo pelo slug (hash seguro)

import { query } from '../services/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class LojaController {
  /**
   * GET /api/loja/:slug
   * Retorna dados da loja + produtos
   */
  async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      if (!slug) throw new AppError('Slug ausente', 400);

      // Busca o catálogo
      const catRes = await query('SELECT * FROM catalogos WHERE slug = $1', [slug]);
      if (!catRes.rowCount) throw new AppError('Catálogo não encontrado', 404);
      const catalogo = catRes.rows[0];

      // Busca produtos
      const prodRes = await query('SELECT * FROM produtos WHERE catalogo_id = $1', [catalogo.id]);

      res.json({
        success: true,
        catalogo: {
          id: catalogo.id,
          nome_loja: catalogo.nome_loja,
          slug: catalogo.slug,
          whatsapp: catalogo.whatsapp,
          cor_tema: catalogo.cor_tema,
          logo_url: catalogo.logo_url,
        },
        produtos: prodRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new LojaController();