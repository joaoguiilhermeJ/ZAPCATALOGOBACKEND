/**
 * AuthController — Handlers de autenticacao
 *
 * POST /api/auth/register -> Criar conta
 * POST /api/auth/login    -> Login, retorna JWT
 */

import usuariosDb from '../services/usuariosDb.js';
import { hashSenha, compararSenha, gerarToken } from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, senha, nome } = req.body;

      if (!email || !senha || !nome) {
        throw new AppError('Email, senha e nome sao obrigatorios', 400);
      }

      if (senha.length < 6) {
        throw new AppError('Senha deve ter no minimo 6 caracteres', 400);
      }

      // Verifica se email ja existe
      const existente = await usuariosDb.findByEmail(email);
      if (existente) {
        throw new AppError('Email ja cadastrado', 409);
      }

      const senhaHash = await hashSenha(senha);
      const usuario = await usuariosDb.create({ email, senha_hash: senhaHash, nome });
      const token = gerarToken(usuario.id);

      res.status(201).json({
        success: true,
        token,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        throw new AppError('Email e senha sao obrigatorios', 400);
      }

      const usuario = await usuariosDb.findByEmail(email);
      if (!usuario) {
        throw new AppError('Email ou senha incorretos', 401);
      }

      const senhaValida = await compararSenha(senha, usuario.senha_hash);
      if (!senhaValida) {
        throw new AppError('Email ou senha incorretos', 401);
      }

      const token = gerarToken(usuario.id);

      res.json({
        success: true,
        token,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
