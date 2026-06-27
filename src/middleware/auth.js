/**
 * Auth Middleware — Proteção de rotas com JWT
 * Extrai e valida o token Bearer do header Authorization
 */

import { verificarToken } from '../services/authService.js';
import { AppError } from './errorHandler.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação não fornecido', 401));
  }

  try {
    const payload = verificarToken(header.split(' ')[1]);
    req.usuarioId = payload.sub;
    next();
  } catch {
    next(new AppError('Token inválido ou expirado', 401));
  }
}
