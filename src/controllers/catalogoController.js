/**
 * CatalogoController — Handlers dos endpoints de catalogo
 *
 * POST /api/catalogos   -> Cria catalogo + produtos
 * GET  /api/catalogos/:slug -> Busca catalogo publico
 * PUT  /api/catalogos/:id -> Atualiza catalogo (protegido)
 */

import slugService from '../services/slugService.js';
import catalogoDb from '../services/catalogoDb.js';
import supabaseStorage from '../services/supabaseStorage.js';
import { AppError } from '../middleware/errorHandler.js';

export class CatalogoController {
  /**
   * POST /api/catalogos
   * Cria um novo catalogo com produtos
   */
  async create(req, res, next) {
    try {
      const { nome_loja, whatsapp, cor_tema, logo_base64, logo_mimetype, produtos } = req.body;

      if (!nome_loja || !nome_loja.trim()) {
        throw new AppError('Nome da loja e obrigatorio', 400);
      }

      if (!produtos || !produtos.length) {
        throw new AppError('Lista de produtos e obrigatoria', 400);
      }

      // Gera slug
      const slug = slugService.gerarSlug(nome_loja);

      // Cria catalogo sem logo_url
      const catalogo = await catalogoDb.CatalogoDb.create({
        nome_loja: nome_loja.trim(),
        slug: slug,
        whatsapp: whatsapp,
        cor_tema: cor_tema,
        logo_url: null,
      });

      // Upload da logo para Supabase (se fornecida como base64)
      let logoUrl = null;
      if (logo_base64) {
        const buffer = Buffer.from(logo_base64, 'base64');
        const result = await supabaseStorage.uploadLogo(catalogo.id, buffer, logo_mimetype || 'image/png');
        logoUrl = result.publicUrl;
        if (logoUrl) {
          await catalogoDb.CatalogoDb.update(catalogo.id, { logo_url: logoUrl });
        }
      }

      // Prepara produtos
      const produtosParaInserir = produtos.map(function (p) {
        var nomeProd = p.nome || p.Nome_do_Produto || p['Nome do Produto'] || 'Produto';
        var descProd = p.desc || p.descricao || p.Descricao || p['Descricao'] || p['Descrição'] || '';
        var precoProd = p.preco || p.Preco || p['Preco'] || p['Preço'] || '';
        var catProd = p.categoria || p.Categoria || '';
        var codProd = p.codigo || p.Codigo || p['Codigo'] || p['Código'] || '';
        var estProd = p.estoque || p.Estoque || p['Estoque'] || '';
        var imgProd = p.foto || p.Foto || p.Imagem || p.imagem || p.imagem_url || null;

        return {
          nome: nomeProd,
          desc: descProd,
          preco: precoProd,
          categoria: catProd,
          codigo: codProd,
          estoque: estProd,
          imagem_url: imgProd,
        };
      });

      // Insere produtos
      const produtosInseridos = await catalogoDb.ProdutoDb.bulkCreate(catalogo.id, produtosParaInserir);

      // Monta URL publica
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const catalogUrl = baseUrl + '/c/' + slug;

      res.status(201).json({
        success: true,
        catalogo: {
          id: catalogo.id,
          nome_loja: catalogo.nome_loja,
          slug: catalogo.slug,
          catalog_url: catalogUrl,
          logo_url: logoUrl,
          whatsapp: catalogo.whatsapp,
          cor_tema: catalogo.cor_tema,
          created_at: catalogo.created_at,
        },
        total_produtos: produtosInseridos.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/catalogos/:slug
   * Endpoint publico
   */
  async findBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      if (!slug) {
        throw new AppError('Slug nao informado', 400);
      }

      const catalogo = await catalogoDb.CatalogoDb.findBySlug(slug);

      if (!catalogo) {
        throw new AppError('Catalogo nao encontrado', 404);
      }

      const produtos = await catalogoDb.ProdutoDb.findByCatalogoId(catalogo.id);

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

      res.json({
        success: true,
        catalogo: {
          id: catalogo.id,
          nome_loja: catalogo.nome_loja,
          slug: catalogo.slug,
          catalog_url: baseUrl + '/c/' + catalogo.slug,
          logo_url: catalogo.logo_url,
          whatsapp: catalogo.whatsapp,
          cor_tema: catalogo.cor_tema,
          created_at: catalogo.created_at,
        },
        produtos: produtos.map(function (p) {
          return {
            id: p.id,
            nome: p.nome,
            descricao: p.descricao,
            preco: p.preco,
            categoria: p.categoria,
            codigo: p.codigo,
            estoque: p.estoque,
            imagem_url: p.imagem_url,
          };
        }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/catalogos/:id
   * Atualiza catalogo (requer autenticacao)
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;

      const catalogo = await catalogoDb.CatalogoDb.findById(id);
      if (!catalogo) {
        throw new AppError('Catalogo nao encontrado', 404);
      }

      const { nome_loja, whatsapp, cor_tema, logo_base64, logo_mimetype, produtos } = req.body;

      const updates = {};
      if (nome_loja) updates.nome_loja = nome_loja;
      if (whatsapp !== undefined) updates.whatsapp = whatsapp;
      if (cor_tema) updates.cor_tema = cor_tema;

      if (logo_base64) {
        const buffer = Buffer.from(logo_base64, 'base64');
        const result = await supabaseStorage.uploadLogo(id, buffer, logo_mimetype || 'image/png');
        if (result.publicUrl) {
          updates.logo_url = result.publicUrl;
        }
      }

      if (Object.keys(updates).length) {
        await catalogoDb.CatalogoDb.update(id, updates);
      }

      if (produtos && produtos.length) {
        await catalogoDb.ProdutoDb.deleteByCatalogoId(id);

        const novosProdutos = produtos.map(function (p) {
          return {
            nome: p.nome || 'Produto',
            desc: p.desc || '',
            preco: p.preco || '',
            categoria: p.categoria || '',
            codigo: p.codigo || '',
            estoque: p.estoque || '',
            imagem_url: p.imagem_url || null,
          };
        });

        await catalogoDb.ProdutoDb.bulkCreate(id, novosProdutos);
      }

      const updated = await catalogoDb.CatalogoDb.findById(id);
      const updatedProdutos = await catalogoDb.ProdutoDb.findByCatalogoId(id);

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

      res.json({
        success: true,
        catalogo: {
          id: updated.id,
          nome_loja: updated.nome_loja,
          slug: updated.slug,
          catalog_url: baseUrl + '/c/' + updated.slug,
          logo_url: updated.logo_url,
          whatsapp: updated.whatsapp,
          cor_tema: updated.cor_tema,
        },
        total_produtos: updatedProdutos.length,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CatalogoController();
