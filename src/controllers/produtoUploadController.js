/**
 * ProdutoUploadController — Upload de planilha e processamento de produtos
 *
 * POST /api/produtos/upload
 *   -> Recebe .xlsx/.xls via multipart
 *   -> Lê com exceljs (pula cabeçalho)
 *   -> Extrai produtos (Nome, Preço, Descrição, Categoria, Código, Estoque)
 *   -> Salva no banco atrelado a um lojista genérico de teste
 *   -> Retorna JSON com produtos extraídos + metadados
 */

import exceljs from 'exceljs';
import { query } from '../services/db.js';
import { AppError } from '../middleware/errorHandler.js';
import supabaseStorage from '../services/supabaseStorage.js';

const LOJISTA_TESTE_ID = '00000000-0000-0000-0000-000000000001'; // kept for legacy fallback
const CATALOGO_TESTE_ID = '00000000-0000-0000-0000-000000000001';

export class ProdutoUploadController {
  /**
   * Garante que o lojista teste e catálogo teste existem no banco
   */
  async ensureTestSeed() {
    await query(`
      INSERT INTO usuarios (id, email, senha_hash, nome)
      VALUES ($1, 'teste@zapcatalogo.app', '$2a$10$placeholder', 'Lojista Teste')
      ON CONFLICT (id) DO NOTHING
    `, [LOJISTA_TESTE_ID]);

    await query(`
      INSERT INTO catalogos (id, nome_loja, slug, usuario_id)
      VALUES ($1, 'Minha Loja', 'minha-loja-' || substr(md5(random()::text), 1, 8), $2)
      ON CONFLICT (id) DO NOTHING
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
        const val = (cell.value || '').toString().toLowerCase().trim();
        if (/nome/.test(val) || /produto/.test(val)) colMap.nome = colNumber;
        if (/preço|preco/.test(val)) colMap.preco = colNumber;
        if (/descri/.test(val)) colMap.descricao = colNumber;
        if (/categ/.test(val)) colMap.categoria = colNumber;
        if (/código|codigo/.test(val)) colMap.codigo = colNumber;
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
          codigo: cellValue('codigo'),
          estoque: cellValue('estoque'),
        };

        produtos.push(produto);
      });

      if (produtos.length === 0) {
        throw new AppError('Nenhum produto encontrado na planilha. Verifique se há dados a partir da linha 2.', 400);
      }

      // Salva no banco atrelado ao catálogo de teste
      // Usa o catálogo informado (slug ou id) – o cliente deve enviar catalogId no body
      const catalogId = req.body.catalogId;
      if (!catalogId) {
        throw new AppError('catalogId ausente no corpo da requisição', 400);
      }
      // Verifica se o catalogo existe
      const catalogCheck = await query('SELECT id FROM catalogos WHERE id = $1', [catalogId]);
      if (!catalogCheck.rowCount) {
        throw new AppError('Catálogo não encontrado para o catalogId fornecido', 404);
      }

      // Apaga produtos antigos do catálogo (se houver)
      await query('DELETE FROM produtos WHERE catalogo_id = $1', [catalogId]);

      // Insere lote
      const values = [];
      const placeholders = [];
      let idx = 1;

      for (const p of produtos) {
        placeholders.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6})`);
        values.push(
          catalogId,
          p.nome,
          p.descricao || null,
          p.preco || null,
          p.categoria || null,
          p.codigo || null,
          p.estoque || null
        );
        idx += 7;
      }

      const inserted = await query(
        `INSERT INTO produtos (catalogo_id, nome, descricao, preco, categoria, codigo, estoque)
         VALUES ${placeholders.join(', ')}
         RETURNING *`,
        values
      );

      console.log(`[Upload] ${produtos.length} produtos salvos do arquivo "${filename}"`);

      res.status(200).json({
        success: true,
        filename,
        totalLinhas,
        linhasValidas,
        produtos: inserted.rows,
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
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
        throw new AppError('ID de produto inválido', 400);
      }

      const productResult = await query(
        'SELECT id, catalogo_id FROM produtos WHERE id = $1',
        [req.params.id]
      );
      const produto = productResult.rows[0];
      if (!produto) {
        throw new AppError('Produto não encontrado', 404);
      }

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
