// src/routes/lojaRoutes.js
import { Router } from 'express';
import lojaController from '../controllers/lojaController.js';

const router = Router();

router.get('/loja/:slug', (req, res, next) => lojaController.getBySlug(req, res, next));
router.get('/catalogo/:slug', (req, res, next) => lojaController.getBySlug(req, res, next));

export default router;
