/**
 * Rotas de autenticacao
 */
import { Router } from 'express';
import authController from '../controllers/authController.js';

const router = Router();

router.post('/auth/register', function (req, res, next) {
  authController.register(req, res, next);
});

router.post('/auth/login', function (req, res, next) {
  authController.login(req, res, next);
});

export default router;
