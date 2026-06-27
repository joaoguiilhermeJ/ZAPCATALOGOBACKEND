/**
 * Rotas de catalogo
 */
import { Router } from 'express';
import catalogoController from '../controllers/catalogoController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/catalogos', function (req, res, next) {
  catalogoController.create(req, res, next);
});

router.get('/catalogos/:slug', function (req, res, next) {
  catalogoController.findBySlug(req, res, next);
});

router.put('/catalogos/:id', requireAuth, function (req, res, next) {
  catalogoController.update(req, res, next);
});

export default router;
