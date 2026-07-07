/**
 * Agregador de rotas da API
 */

import { Router } from "express";
import uploadRoutes from "./uploadRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import authRoutes from "./authRoutes.js";
import onboardingRoutes from "./onboardingRoutes.js";
import lojaRoutes from "./lojaRoutes.js";
import produtoRoutes from "./produtoRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = Router();

router.use(uploadRoutes);
router.use(paymentRoutes);
router.use(authRoutes);
router.use(onboardingRoutes);
router.use(produtoRoutes);
router.use(lojaRoutes);
router.use(adminRoutes);

export default router;
