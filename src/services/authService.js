/**
 * AuthService — JWT sign/verify e bcrypt hash/compare
 * Sem dependência de estado — funções puras
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'zapcatalogo-dev-fallback-secret-key';
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

/**
 * Hash de senha com bcrypt
 */
export function hashSenha(senhaPlana) {
  return bcrypt.hash(senhaPlana, SALT_ROUNDS);
}

/**
 * Compara senha plana com hash
 */
export function compararSenha(senhaPlana, hash) {
  return bcrypt.compare(senhaPlana, hash);
}

/**
 * Gera um JWT para o usuário
 */
export function gerarToken(usuarioId) {
  return jwt.sign({ sub: usuarioId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verifica e decodifica um JWT
 * Retorna o payload ou lança erro
 */
export function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export default { hashSenha, compararSenha, gerarToken, verificarToken };
