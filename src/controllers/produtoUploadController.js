/**
 * ProdutoUploadController — Upload de planilha e processamento de produtos
 *
 * POST /api/produtos/upload
 *   -> Recebe .xlsx/.xls via multipart
 *   -> Lê com exceljs (pula cabeçalho)
 *   -> Extrai produtos (Nome, Preço, Descrição, Categoria, Variações, Código, Estoque)
 *   -> Salva no banco atrelado a um lojista genérico de teste
 *   -> Retorna JSON com produtos extraídos + metadados
 */

import exceljs from 'exceljs';
import { query } from '../services/db.js';
import { AppError } from '../middleware/errorHandler.js';
import supabaseStorage from '../services/supabaseStorage.js';

const LOJISTA_TESTE_ID = '00000000-0000-0000-0000-000000000001'; // kept for legacy fallback
const CATALOGO_TESTE_ID = '00000000-0000-0000-0000-000000000001';

function normalizarCabecalho(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizarNomeProduto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarCodigo(valor) {
  return String(valor || '').trim().toLowerCase();
}

function obterEditToken(req) {
  return String(
    req.body?.edit_token ||
    req.body?.token ||
    req.query?.edit_token ||
    req.query?.token ||
    req.get('x-edit-token') ||
    ''
  ).trim();
}

function uuidValido(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor || ''));
}

async function validarCatalogoEdicao(req) {
  const editToken = obterEditToken(req);
  const catalogoId = req.body?.catalogo_id || req.body?.catalogId || req.query?.catalogo_id || req.query?.catalogId;
  const slug = req.body?.slug || req.query?.slug;

  if (!editToken) {
    throw new AppError('edit_token obrigatório para alterar produtos', 401);
  }
  if (!catalogoId && !slug) {
    throw new AppError('catalogo_id ou slug obrigatório para alterar produtos', 400);
  }
  if (catalogoId && !uuidValido(catalogoId)) {
    throw new AppError('catalogo_id inválido', 400);
  }

  const result = await query(
    `SELECT id, slug FROM catalogos
     WHERE edit_token = $1 AND ($2::uuid IS NOT NULL AND id = $2::uuid OR $3::text IS NOT NULL AND slug = $3::text)`,
    [editToken, catalogoId || null, slug || null]
  );
  if (!result.rowCount) {
    throw new AppError('Token inválido para este catálogo', 403);
  }
  return result.rows[0];
}

async function validarProdutoEdicao(produtoId, editToken) {
  if (!editToken) {
    throw new AppError('edit_token obrigatório para alterar imagem do produto', 401);
  }

  const result = await query(
    `SELECT p.id, p.catalogo_id
       FROM produtos p
       JOIN catalogos c ON c.id = p.catalogo_id
      WHERE p.id = $1 AND c.edit_token = $2`,
    [produtoId, editToken]
  );
  if (!result.rowCount) {
    throw new AppError('Token inválido ou produto não encontrado', 403);
  }
  return result.rows[0];
}

export class ProdutoUploadController {
  /**
   * Garante que o lojista teste e catálogo teste existem no banco
   */
  async ensureTestSeed() {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Seed] Seed de teste ignorado em produção');
      return;
    }

    await query(`
      INSERT INTO usuarios (id, email, senha_hash, nome)
      VALUES ($1, 'teste@zapcatalogo.app', '$2a$10$placeholder', 'Lojista Teste')
      ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          nome = EXCLUDED.nome
    `, [LOJISTA_TESTE_ID]);

    await query(`
      INSERT INTO catalogos (id, nome_loja, slug, usuario_id, edit_token)
      VALUES ($1, 'Minha Loja', 'minha-loja-' || substr(md5(random()::text), 1, 8), $2, encode(gen_random_bytes(32), 'hex'))
      ON CONFLICT (id) DO UPDATE
      SET usuario_id = COALESCE(catalogos.usuario_id, EXCLUDED.usuario_id),
          edit_token = COALESCE(NULLIF(catalogos.edit_token, ''), EXCLUDED.edit_token),
          updated_at = NOW()
    `, [CATALOGO_TESTE_ID, LOJISTA_TESTE_ID]);

    console.log('[Seed] Lojista e catálogo de teste garantidos');
  }

  /**
   * POST /api/produtos/upload
   */
  async upload(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('Nenhum arquivo enviado. Envie uma planilha .xlsx ou .xls', 400);
      }

      const catalogo = await validarCatalogoEdicao(req);
      const catalogId = catalogo.id;
      const buffer = req.file.buffer;
      const filename = req.file.originalname;

      // Lê a planilha com exceljs
      const workbook = new exceljs.Workbook();
      await workbook.xlsx.load(buffer);

      // Procura a aba que contém dados de produtos (com "Nome" no cabeçalho)
      // Se não achar, usa a primeira aba com dados
      let worksheet = null;
      for (const ws of workbook.worksheets) {
        const firstRow = ws.getRow(1);
        let hasNome = false;
        firstRow.eachCell((cell) => {
          const val = (cell.value || '').toString().toLowerCase().trim();
          if (/nome/.test(val) || /produto/.test(val)) hasNome = true;
        });
        if (hasNome) { worksheet = ws; break; }
      }

      // Fallback: primeira aba que não seja "Instruções"
      if (!worksheet) {
        for (const ws of workbook.worksheets) {
          const name = (ws.name || '').toLowerCase().trim();
          if (name !== 'instruções' && name !== 'instrucoes') {
            worksheet = ws;
            break;
          }
        }
      }

      // Último fallback: primeira aba
      if (!worksheet) worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new AppError('Planilha vazia ou formato inválido', 400);
      }

      console.log(`[Upload] Usando aba: "${worksheet.name}"`);

      const produtos = [];
      let totalLinhas = 0;
      let linhasValidas = 0;

      // Mapeia cabeçalho para encontrar colunas
      const headerRow = worksheet.getRow(1);
      const colMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const val = normalizarCabecalho(cell.value);
        if (['nome do produto', 'produto', 'nome'].includes(val)) colMap.nome = colNumber;
        if (['preco', 'valor'].includes(val)) colMap.preco = colNumber;
        if (['descricao'].includes(val)) colMap.descricao = colNumber;
        if (val === 'categoria') colMap.categoria = colNumber;
        if (['variacoes', 'sabores', 'opcoes', 'tamanhos'].includes(val)) colMap.variacoes = colNumber;
        if (['codigo'].includes(val)) colMap.codigo = colNumber;
        if (/estoque|qtd/.test(val)) colMap.estoque = colNumber;
      });

      // Se não conseguiu mapear colunas, tenta posicional
      if (!colMap.nome) {
        colMap.nome = 1;
        colMap.preco = colMap.preco || 2;
        colMap.descricao = colMap.descricao || 3;
        colMap.categoria = colMap.categoria || 4;
        colMap.codigo = colMap.codigo || 5;
        colMap.estoque = colMap.estoque || 6;
      }

      // Itera linhas a partir da 2 (pula cabeçalho)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // pula cabeçalho
        totalLinhas++;

        const nomeCell = row.getCell(colMap.nome);
        const nome = (nomeCell.value || '').toString().trim();
        if (!nome || nome.length === 0) return; // pula linhas vazias
        // Pula linhas de instrução (emoji, setas, números de passo)
        if (/^[📋📌⬆👉🔹➡️*\d+.]/.test(nome) || /^(instru|como|preencha|importante|obs|dica)/i.test(nome)) return;

        linhasValidas++;

        function cellValue(colKey) {
          if (!colMap[colKey]) return '';
          const cell = row.getCell(colMap[colKey]);
          if (cell.value === null || cell.value === undefined) return '';
          return cell.value.toString().trim();
        }

        const produto = {
          nome,
          preco: cellValue('preco'),
          descricao: cellValue('descricao'),
          categoria: cellValue('categoria'),
          variacoes: cellValue('variacoes'),
          codigo: cellValue('codigo'),
          estoque: cellValue('estoque'),
        };

        produtos.push(produto);
      });

      if (produtos.length === 0) {
        throw new AppError('Nenhum produto encontrado na planilha. Verifique se há dados a partir da linha 2.', 400);
      }

      const existentesResult = await query(
        `SELECT id, nome, codigo, imagem_url, imagem_updated_at, ativo
         FROM produtos
         WHERE catalogo_id = $1
         ORDER BY created_at ASC`,
        [catalogId]
      );
      const existentes = existentesResult.rows;
      const porCodigo = new Map();
      const porNome = new Map();
      existentes.forEach((produto) => {
        const codigo = normalizarCodigo(produto.codigo);
        if (codigo && !porCodigo.has(codigo)) porCodigo.set(codigo, produto);
        const nome = normalizarNomeProduto(produto.nome);
        if (nome && !porNome.has(nome)) porNome.set(nome, produto);
      });

      const usados = new Set();
      const importados = [];

      for (const p of produtos) {
        const codigo = normalizarCodigo(p.codigo);
        const nome = normalizarNomeProduto(p.nome);
        let existente = codigo ? porCodigo.get(codigo) : null;
        if (!existente && nome) existente = porNome.get(nome);

        if (existente && !usados.has(existente.id)) {
          const updated = await query(
            `UPDATE produtos
             SET nome = $1,
                 descricao = $2,
                 preco = $3,
                 categoria = $4,
                 variacoes = $5,
                 codigo = $6,
                 estoque = $7
             WHERE id = $8
             RETURNING *`,
            [
              p.nome,
              p.descricao || null,
              p.preco || null,
              p.categoria || null,
              p.variacoes || null,
              p.codigo || null,
              p.estoque || null,
              existente.id,
            ]
          );
          usados.add(existente.id);
          importados.push(updated.rows[0]);
          continue;
        }

        const inserted = await query(
          `INSERT INTO produtos (catalogo_id, nome, descricao, preco, categoria, variacoes, codigo, estoque, ativo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
           RETURNING *`,
          [
            catalogId,
            p.nome,
            p.descricao || null,
            p.preco || null,
            p.categoria || null,
            p.variacoes || null,
            p.codigo || null,
            p.estoque || null,
          ]
        );
        usados.add(inserted.rows[0].id);
        importados.push(inserted.rows[0]);
      }

      const ausentes = existentes
        .filter((produto) => !usados.has(produto.id))
        .map((produto) => produto.id);
      if (ausentes.length) {
        await query(
          `UPDATE produtos
           SET ativo = false
           WHERE catalogo_id = $1 AND id = ANY($2::uuid[])`,
          [catalogId, ausentes]
        );
      }

      console.log(`[Upload] ${produtos.length} produtos salvos do arquivo "${filename}"`);

      res.status(200).json({
        success: true,
        filename,
        totalLinhas,
        linhasValidas,
        produtos: importados,
        count: produtos.length,
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/produtos/:id/imagem — associa uma imagem a um produto.
   */
  async uploadImagem(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('Envie uma imagem no campo "imagem"', 400);
      }
      if (!uuidValido(req.params.id)) {
        throw new AppError('ID de produto inválido', 400);
      }

      const produto = await validarProdutoEdicao(req.params.id, obterEditToken(req));

      const uploaded = await supabaseStorage.uploadProductImage(
        produto.catalogo_id,
        produto.id,
        req.file.buffer,
        req.file.mimetype
      );
      if (!uploaded.publicUrl) {
        throw new AppError('Não foi possível enviar a imagem do produto. Tente novamente.', 503);
      }

      await query(
        'UPDATE produtos SET imagem_url = $1, imagem_updated_at = NOW() WHERE id = $2',
        [uploaded.publicUrl, produto.id]
      );

      res.json({ success: true, imagem_url: uploaded.publicUrl });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/produtos/ultimos — retorna últimos produtos importados
   */
  async ultimos(req, res, next) {
    try {
      const result = await query(
        `SELECT p.*, c.nome_loja, c.slug, c.cor_tema, c.whatsapp, c.logo_url
         FROM produtos p
         JOIN catalogos c ON c.id = p.catalogo_id
         WHERE p.catalogo_id = $1
         ORDER BY p.created_at ASC`,
        [CATALOGO_TESTE_ID]
      );

      // Pega dados do catálogo
      const catResult = await query(
        `SELECT * FROM catalogos WHERE id = $1`,
        [CATALOGO_TESTE_ID]
      );
      const catalogo = catResult.rows[0] || null;

      res.json({
        success: true,
        catalogo: catalogo ? {
          id: catalogo.id,
          nome_loja: catalogo.nome_loja,
          slug: catalogo.slug,
          whatsapp: catalogo.whatsapp,
          cor_tema: catalogo.cor_tema,
          logo_url: catalogo.logo_url,
          catalog_url: (process.env.BASE_URL || 'http://localhost:3000') + '/c/' + catalogo.slug,
        } : null,
        produtos: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProdutoUploadController();
