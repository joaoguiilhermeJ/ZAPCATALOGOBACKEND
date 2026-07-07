// src/controllers/lojaController.js
// Endpoint público para buscar um catálogo pelo slug (hash seguro)

import { query } from "../services/db.js";
import { AppError } from "../middleware/errorHandler.js";

export class LojaController {
  /**
   * GET /api/loja/:slug
   * Retorna dados da loja + produtos
   */
  async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      if (!slug) throw new AppError("Slug ausente", 400);

      // Busca o catálogo
      const catRes = await query("SELECT * FROM catalogos WHERE slug = $1", [
        slug,
      ]);
      if (!catRes.rowCount) throw new AppError("Catálogo não encontrado", 404);
      const catalogo = catRes.rows[0];

      // Busca produtos ativos. O fallback mantém ambientes antigos funcionando
      // enquanto a coluna produtos.ativo ainda não foi criada.
      let prodRes;
      try {
        prodRes = await query(
          `SELECT id, nome, descricao, preco, categoria, imagem_url, variacoes, codigo, ativo
           FROM produtos
           WHERE catalogo_id = $1 AND COALESCE(ativo, true) = true
           ORDER BY created_at ASC`,
          [catalogo.id],
        );
      } catch (err) {
        if (err?.code !== "42703") throw err;
        prodRes = await query(
          `SELECT id, nome, descricao, preco, categoria, imagem_url, variacoes, codigo
           FROM produtos
           WHERE catalogo_id = $1
           ORDER BY created_at ASC`,
          [catalogo.id],
        );
      }

      // Monta representação compatível com clientes antigos e novos
      const catalogoPayload = {
        id: catalogo.id,
        nome_loja: catalogo.nome_loja,
        slug: catalogo.slug,
        whatsapp: catalogo.whatsapp,
        cor_tema: catalogo.cor_tema,
        logo_url: catalogo.logo_url,
      };

      const lojistaPayload = {
        id: catalogo.id,
        nome: catalogo.nome_loja,
        slug: catalogo.slug,
        whatsapp: catalogo.whatsapp,
        configuracao: {
          corTema: catalogo.cor_tema,
          logoUrl: catalogo.logo_url,
        },
      };

      res.json({
        success: true,
        catalogo: catalogoPayload,
        produtos: prodRes.rows,
        // Forma compatível com a sugestão (payload.data.lojista / payload.data.produtos)
        data: {
          lojista: lojistaPayload,
          produtos: prodRes.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new LojaController();
