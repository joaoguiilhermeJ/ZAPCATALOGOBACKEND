/**
 * Rotas de pagamento
 * Mantém apenas o roteamento — lógica delegada ao controller
 */

import { Router } from 'express';
import paymentController from '../controllers/paymentController.js';

const router = Router();

router.post('/payment/create', (req, res, next) =>
  paymentController.createPayment(req, res, next)
);

router.post('/payment/webhook', (req, res, next) =>
  paymentController.handleWebhook(req, res, next)
);

router.get('/payment/status/:externalRef', (req, res, next) =>
  paymentController.checkStatus(req, res, next)
);

export default router;
