/**
 * SupabaseStorage — Upload e gerenciamento de imagens no Supabase Storage
 *
 * Bucket público configurado por SUPABASE_BUCKET (padrão: "prdutos").
 */

import supabase from "../config/supabase.js";

function getClient() {
  return supabase;
}

function getBucket() {
  return process.env.SUPABASE_BUCKET || "prdutos";
}

export class SupabaseStorageService {
  /**
   * Faz upload da logo da loja
   * @param {string} catalogoId - UUID do catálogo
   * @param {Buffer|Uint8Array} buffer - Conteúdo da imagem
   * @param {string} mimetype - Tipo MIME (ex: image/png)
   * @returns {Promise<{publicUrl: string|null}>}
   */
  async uploadLogo(catalogoId, buffer, mimetype) {
    const sb = getClient();
    if (!sb) return { publicUrl: null };

    const filePath = `logos/${catalogoId}/logo.png`;
    const bucket = getBucket();

    const { error } = await sb.storage.from(bucket).upload(filePath, buffer, {
      contentType: mimetype || "image/png",
      upsert: true,
    });

    if (error) {
      console.error("[Supabase] Erro ao fazer upload da logo:", error.message);
      return { publicUrl: null };
    }

    const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
    return { publicUrl: data.publicUrl };
  }

  /**
   * Remove a logo da loja
   */
  async deleteLogo(catalogoId) {
    const sb = getClient();
    if (!sb) return;

    await sb.storage
      .from(getBucket())
      .remove([`logos/${catalogoId}/logo.png`]);
  }

  /**
   * Faz upload da imagem de um produto
   * @param {string} catalogoId
   * @param {string} produtoId - UUID do produto
   * @param {Buffer|Uint8Array} buffer
   * @param {string} mimetype
   * @param {string} ext - Extensão do arquivo (ex: .jpg)
   * @returns {Promise<{publicUrl: string|null}>}
   */
  async uploadProductImage(catalogoId, produtoId, buffer, mimetype) {
    const sb = getClient();
    if (!sb) return { publicUrl: null };

    const extMap = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const ext = extMap[mimetype] || ".jpg";
    const filePath = `${catalogoId}/${produtoId}${ext}`;
    const bucket = getBucket();

    const { error } = await sb.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: mimetype || "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error(
        "[Supabase] Erro ao fazer upload de produto:",
        error.message,
      );
      return { publicUrl: null };
    }

    const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
    return { publicUrl: data.publicUrl };
  }

  /**
   * Faz upload de imagem a partir de uma URL remota
   * Faz fetch da URL, baixa o conteúdo e envia ao Supabase
   */
  async uploadProductImageFromUrl(catalogoId, produtoId, imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return { publicUrl: null };

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await response.arrayBuffer());

      return this.uploadProductImage(
        catalogoId,
        produtoId,
        buffer,
        contentType,
      );
    } catch (err) {
      console.error("[Supabase] Erro ao baixar imagem de URL:", err.message);
      return { publicUrl: null };
    }
  }

  /**
   * Deleta a imagem de um produto
   */
  async deleteProductImage(catalogoId, produtoId) {
    const sb = getClient();
    if (!sb) return;

    // Tenta .jpg e .png (não sabemos qual extensão foi usada)
    await sb.storage
      .from(getBucket())
      .remove([
        `${catalogoId}/${produtoId}.jpg`,
        `${catalogoId}/${produtoId}.png`,
        `${catalogoId}/${produtoId}.webp`,
      ]);
  }
}

export default new SupabaseStorageService();
