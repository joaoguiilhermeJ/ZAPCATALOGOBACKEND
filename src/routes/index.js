/**
 * Agregador de rotas da API
 */

import { Router } from 'express';
import uploadRoutes from './uploadRoutes.js';
import paymentRoutes from './paymentRoutes.js';

const router = Router();

router.use(uploadRoutes);
router.use(paymentRoutes);

export default router;
