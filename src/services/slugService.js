/**
 * SlugService — Geração de slugs únicos para URLs de catálogos
 *
 * Formato: "nome-da-loja-6hex"
 * Exemplo: "moda-da-ana-a8f4d2"
 */

import crypto from 'crypto';

/**
 * Remove acentos de uma string
 */
function removeAcentos(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Gera um slug único a partir do nome da loja
 * @param {string} nomeLoja
 * @returns {string} slug no formato "nome-da-loja-a8f4d2"
 */
export function gerarSlug(nomeLoja) {
  if (!nomeLoja || !nomeLoja.trim()) {
    throw new Error('Nome da loja é obrigatório para gerar slug');
  }

  // Remove acentos
  var base = removeAcentos(nomeLoja);

  // Lowercase
  base = base.toLowerCase();

  // Remove caracteres especiais, substitui espaços e não alfanuméricos por hífen
  base = base.replace(/[^a-z0-9]+/g, '-');

  // Remove hífens do início e fim
  base = base.replace(/^-+/, '').replace(/-+$/, '');

  // Gera hash aleatório de 6 caracteres hex
  var hash = crypto.randomBytes(3).toString('hex');

  return base + '-' + hash;
}

export default { gerarSlug };
