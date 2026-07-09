import { query } from "../services/db.js";
import { AppError } from "../middleware/errorHandler.js";
import supabaseStorage from "../services/supabaseStorage.js";

function frontendOrigin(req) {
  return (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    req.get("origin") ||
    "https://zapcatalogo-weld.vercel.app"
  ).replace(/\/$/, "");
}

function exigirToken(req) {
  const token = String(req.query.token || "").trim();
  if (!token) throw new AppError("Token de edição obrigatório", 401);
  return token;
}

function catalogoPayload(catalogo, req, token) {
  const origin = frontendOrigin(req);
  return {
    id: catalogo.id,
    nome_loja: catalogo.nome_loja,
    slug: catalogo.slug,
    whatsapp: catalogo.whatsapp,
    cor_tema: catalogo.cor_tema,
    logo_url: catalogo.logo_url,
    catalogo_url: `${origin}/c/${encodeURIComponent(catalogo.slug)}`,
    admin_url: `${origin}/admin/${encodeURIComponent(catalogo.slug)}?token=${encodeURIComponent(token)}`,
  };
}

async function buscarCatalogoPorToken(slug, token) {
  const result = await query(
    `SELECT id, nome_loja, slug, whatsapp, cor_tema, logo_url
       FROM catalogos
      WHERE slug = $1 AND edit_token = $2`,
    [slug, token],
  );
  if (!result.rowCount) throw new AppError("Token inválido ou catálogo não encontrado", 403);
  return result.rows[0];
}

async function buscarProdutoPorToken(id, token) {
  const result = await query(
    `SELECT p.*, c.slug, c.edit_token
       FROM produtos p
       JOIN catalogos c ON c.id = p.catalogo_id
      WHERE p.id = $1 AND c.edit_token = $2`,
    [id, token],
  );
  if (!result.rowCount) throw new AppError("Token inválido ou produto não encontrado", 403);
  return result.rows[0];
}

function camposPermitidos(body, permitidos) {
  const fields = {};
  for (const key of permitidos) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  return fields;
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "on"].includes(value.toLowerCase());
  return Boolean(value);
}

async function updatePorId(tabela, id, fields) {
  const entries = Object.entries(fields);
  if (!entries.length) throw new AppError("Nenhum campo válido para atualizar", 400);

  const sets = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of entries) {
    sets.push(`${key} = $${idx}`);
    values.push(value === "" ? null : value);
    idx++;
  }
  values.push(id);
  const result = await query(
    `UPDATE ${tabela} SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return result.rows[0] || null;
}

export class AdminController {
  async getCatalogo(req, res, next) {
    try {
      const token = exigirToken(req);
      const catalogo = await buscarCatalogoPorToken(req.params.slug, token);
      const produtos = await query(
        `SELECT id, catalogo_id, nome, descricao, preco, categoria, variacoes, codigo, estoque, imagem_url, ativo, disponivel, motivo_indisponivel, created_at
           FROM produtos
          WHERE catalogo_id = $1
          ORDER BY created_at ASC`,
        [catalogo.id],
      );

      res.json({
        success: true,
        catalogo: catalogoPayload(catalogo, req, token),
        produtos: produtos.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCatalogo(req, res, next) {
    try {
      const token = exigirToken(req);
      const catalogo = await buscarCatalogoPorToken(req.params.slug, token);
      const fields = camposPermitidos(req.body, ["nome_loja", "whatsapp", "cor_tema", "logo_url"]);
      const updated = await updatePorId("catalogos", catalogo.id, fields);
      res.json({ success: true, catalogo: catalogoPayload(updated, req, token) });
    } catch (err) {
      next(err);
    }
  }

  async updateProduto(req, res, next) {
    try {
      const token = exigirToken(req);
      await buscarProdutoPorToken(req.params.id, token);
      const fields = camposPermitidos(req.body, [
        "nome",
        "descricao",
        "preco",
        "categoria",
        "variacoes",
        "imagem_url",
        "ativo",
        "disponivel",
        "motivo_indisponivel",
      ]);
      if (fields.ativo !== undefined) fields.ativo = parseBoolean(fields.ativo);
      if (fields.disponivel !== undefined) fields.disponivel = parseBoolean(fields.disponivel);
      const produto = await updatePorId("produtos", req.params.id, fields);
      res.json({ success: true, produto });
    } catch (err) {
      next(err);
    }
  }

  async updateImagemProduto(req, res, next) {
    try {
      const token = exigirToken(req);
      const produto = await buscarProdutoPorToken(req.params.id, token);
      if (!req.file?.buffer) throw new AppError("Imagem não enviada", 400);

      const result = await supabaseStorage.uploadProductImage(
        produto.catalogo_id,
        produto.id,
        req.file.buffer,
        req.file.mimetype || "image/jpeg",
      );
      if (!result.publicUrl) {
        throw new AppError("Não foi possível enviar a imagem do produto", 503);
      }

      const updated = await query(
        `UPDATE produtos
            SET imagem_url = $1, imagem_updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [result.publicUrl, produto.id],
      );
      res.json({ success: true, produto: updated.rows[0] });
    } catch (err) {
      next(err);
    }
  }

  async updateProdutoAtivo(req, res, next) {
    try {
      const token = exigirToken(req);
      await buscarProdutoPorToken(req.params.id, token);
      const ativo = parseBoolean(req.body?.ativo);
      const produto = await updatePorId("produtos", req.params.id, { ativo });
      res.json({ success: true, produto });
    } catch (err) {
      next(err);
    }
  }

  async updateProdutoDisponibilidade(req, res, next) {
    try {
      const token = exigirToken(req);
      await buscarProdutoPorToken(req.params.id, token);
      const fields = camposPermitidos(req.body, ["disponivel", "motivo_indisponivel"]);
      if (fields.disponivel !== undefined) fields.disponivel = parseBoolean(fields.disponivel);
      const produto = await updatePorId("produtos", req.params.id, fields);
      res.json({ success: true, produto });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminController();
