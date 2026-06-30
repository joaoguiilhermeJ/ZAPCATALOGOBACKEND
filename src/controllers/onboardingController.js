// src/controllers/onboardingController.js
// Responsável por criar o catálogo (loja) a partir do onboarding.
// Gera um slug seguro (UUID v4) e realiza tudo dentro de uma transação Prisma.

import { randomUUID } from 'crypto';
import catalogoDb from '../services/catalogoDb.js';
import supabaseStorage from '../services/supabaseStorage.js';
import { AppError } from '../middleware/errorHandler.js';
import prisma from '../services/prisma.js'; // assume there is a prisma export

export class OnboardingController {
  /**
   * POST /api/onboarding
   * Recebe: nome_loja, whatsapp, cor_tema (hex), OPTIONAL logo (multipart file)
   * Retorna: { id, slug }
   */
  async create(req, res, next) {
    try {
      const { nome_loja, whatsapp, cor_tema } = req.body;
      const logoFile = req.file; // multer memory storage (optional)

      if (!nome_loja || !whatsapp || !cor_tema) {
        throw new AppError('Campos nome, whatsapp e cor_tema são obrigatórios', 400);
      }

      // gera slug (UUID v4) que será usado como hash de segurança
      const slug = randomUUID();

      // se houver logo, faz upload para supabase usando o slug como folder
      let logoUrl = null;
      if (logoFile && logoFile.buffer) {
        const buffer = logoFile.buffer;
        const mimetype = logoFile.mimetype || 'image/png';
        const result = await supabaseStorage.uploadLogo(slug, buffer, mimetype);
        logoUrl = result.publicUrl;
      }

      // transação atômica: cria catálogo e define logo_url se houver
      const created = await prisma.$transaction(async (tx) => {
        const cat = await catalogoDb.CatalogoDb.create({
          nome_loja: nome_loja.trim(),
          slug,
          whatsapp,
          cor_tema,
          logo_url: logoUrl,
        }, tx);
        return cat;
      });

      res.status(201).json({
        success: true,
        catalogo: {
          id: created.id,
          slug: created.slug,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new OnboardingController();