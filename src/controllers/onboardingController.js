// src/controllers/onboardingController.js
// Responsável por criar o catálogo (loja) a partir do onboarding.
// Gera um slug seguro (UUID v4) e realiza tudo dentro de uma transação Prisma.

import catalogoDb from "../services/catalogoDb.js";
import slugService from "../services/slugService.js";
import supabaseStorage from "../services/supabaseStorage.js";
import { AppError } from "../middleware/errorHandler.js";
// import prisma from '../services/prisma.js'; // removed – not used

function erroOperacional(err) {
  return err instanceof AppError || err?.isOperational;
}

function frontendOrigin(req) {
  return (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    req.get("origin") ||
    "https://zapcatalogo-weld.vercel.app"
  ).replace(/\/$/, "");
}

function normalizarWhatsApp(numero) {
  const digits = String(numero || "").replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 10) return `55${digits.slice(0, 2)}9${digits.slice(2)}`;
  return digits;
}

function whatsappValido(numero) {
  return /^55\d{2}9\d{8}$/.test(numero);
}

export class OnboardingController {
  /**
   * POST /api/onboarding
   * Recebe: nome_loja, whatsapp, cor_tema (hex), OPTIONAL logo (multipart file)
   * Retorna: { id, slug }
   */
  async create(req, res, next) {
    let etapa = "inicio";
    try {
      etapa = "payload";
      const { nome_loja, whatsapp, cor_tema } = req.body;
      const logoFile = req.file || req.files?.logo?.[0]; // multer memory storage (optional)
      const sheetFile = req.files?.file?.[0] || req.files?.planilha?.[0] || null;

      console.log("[Onboarding] POST /api/onboarding recebido", {
        etapa,
        hasNomeLoja: Boolean(nome_loja),
        hasWhatsapp: Boolean(whatsapp),
        hasCorTema: Boolean(cor_tema),
        hasLogo: Boolean(logoFile),
        hasSheet: Boolean(sheetFile),
        logoSize: logoFile?.size || 0,
        sheetSize: sheetFile?.size || 0,
        env: {
          databaseUrl: Boolean(process.env.DATABASE_URL),
          supabaseUrl: Boolean(process.env.SUPABASE_URL),
          supabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_KEY),
          supabaseBucket: Boolean(process.env.SUPABASE_BUCKET),
        },
      });

      if (!nome_loja || !whatsapp || !cor_tema) {
        throw new AppError(
          "Campos nome, whatsapp e cor_tema são obrigatórios",
          400,
        );
      }

      const whatsappNormalizado = normalizarWhatsApp(whatsapp);
      if (!whatsappValido(whatsappNormalizado)) {
        throw new AppError("Informe um WhatsApp válido com DDD.", 400);
      }

      etapa = "gerar_slug";
      // gera slug amigável a partir do nome da loja
      const slug = slugService.gerarSlug(nome_loja);

      // se houver logo, faz upload para supabase usando o slug como folder
      let logoUrl = null;
      if (logoFile && logoFile.buffer) {
        etapa = "upload_logo";
        const buffer = logoFile.buffer;
        const mimetype = logoFile.mimetype || "image/png";
        const result = await supabaseStorage.uploadLogo(slug, buffer, mimetype);
        if (!result.publicUrl) {
          throw new AppError(
            "Não foi possível enviar a logo da loja. Verifique a configuração do armazenamento e tente novamente.",
            502,
          );
        }
        logoUrl = result.publicUrl;
      }

      etapa = "criar_catalogo";
      // transação atômica: cria catálogo e define logo_url se houver
      const created = await catalogoDb.CatalogoDb.create({
        nome_loja: nome_loja.trim(),
        slug,
        whatsapp: whatsappNormalizado,
        cor_tema,
        logo_url: logoUrl,
      });

      etapa = "montar_resposta";
      const origin = frontendOrigin(req);
      const catalogoUrl = `${origin}/c/${encodeURIComponent(created.slug)}`;
      const adminUrl = `${origin}/admin/${encodeURIComponent(created.slug)}?token=${encodeURIComponent(created.edit_token)}`;

      res.status(201).json({
        success: true,
        catalogo_url: catalogoUrl,
        admin_url: adminUrl,
        edit_token: created.edit_token,
        catalogo: {
          id: created.id,
          slug: created.slug,
          catalogo_url: catalogoUrl,
          admin_url: adminUrl,
          edit_token: created.edit_token,
        },
      });
    } catch (err) {
      console.error("[Onboarding] Erro ao criar catálogo", {
        etapa,
        message: err.message,
        statusCode: err.statusCode || 500,
        stack: err.stack,
      });

      if (erroOperacional(err)) {
        return next(err);
      }

      return next(new AppError(
        "Não foi possível concluir o cadastro da loja. Tente novamente em instantes.",
        500,
      ));
    }
  }
}

export default new OnboardingController();
