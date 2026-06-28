/**
 * Agregador de rotas da API
 */

import { Router } from 'express';
import uploadRoutes from './uploadRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import catalogoRoutes from './catalogoRoutes.js';
import authRoutes from './authRoutes.js';
import produtoRoutes from './produtoRoutes.js';

const router = Router();

router.use(uploadRoutes);
router.use(paymentRoutes);
router.use(catalogoRoutes);
router.use(authRoutes);
router.use(produtoRoutes);

export default router;
