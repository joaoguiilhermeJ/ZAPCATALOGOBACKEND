/**
 * PaymentController — Handlers dos endpoints de pagamento
 * Usa paymentDb (Neon PostgreSQL) em vez de paymentStore (memória)
 */

import crypto from 'crypto';
import mercadoPagoService from '../services/mercadoPagoService.js';
import paymentDb from '../services/paymentDb.js';
import { AppError } from '../middleware/errorHandler.js';

const PRECO_CATALOGO = 15;

export class PaymentController {
  /**
   * POST /api/payment/create
   * Cria uma preferência de pagamento de R$15 no Mercado Pago
   */
  async createPayment(req, res, next) {
    try {
      const externalRef = crypto.randomUUID();

      await paymentDb.create(externalRef);

      const { initPoint, preferenceId } = await mercadoPagoService.createPreference(
        PRECO_CATALOGO,
        'ZapCatálogo — Acesso ao Catálogo Digital',
        externalRef,
        {
          notificationUrl: process.env.MP_WEBHOOK_URL || undefined,
        }
      );

      await paymentDb.setPreferenceId(externalRef, preferenceId);

      res.json({
        success: true,
        initPoint,
        preferenceId,
        externalRef,
        amount: PRECO_CATALOGO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payment/webhook
   * Endpoint para notificações IPN do Mercado Pago
   */
  async handleWebhook(req, res, next) {
    try {
      const { type, data_id } = req.query;

      if (type !== 'payment' && req.body?.type !== 'payment') {
        return res.status(200).json({ received: true });
      }

      const paymentId = data_id || req.body?.data?.id;
      if (!paymentId) {
        return res.status(200).json({ received: true });
      }

      const { status, externalRef } = await mercadoPagoService.getPaymentStatus(paymentId);

      if (externalRef) {
        await paymentDb.linkPayment(externalRef, paymentId);
      }

      await paymentDb.updateStatus(paymentId, status);

      console.log(`[MP Webhook] Pagamento ${paymentId}: ${status}`);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[MP Webhook Error]', error.message);
      res.status(200).json({ received: true });
    }
  }

  /**
   * GET /api/payment/status/:externalRef
   * Verifica status de um pagamento
   */
  async checkStatus(req, res, next) {
    try {
      const { externalRef } = req.params;

      if (!externalRef) {
        throw new AppError('ID de pagamento não informado', 400);
      }

      const payment = await paymentDb.getByExternalRef(externalRef);

      if (!payment) {
        return res.json({
          success: true,
          status: 'not_found',
          approved: false,
        });
      }

      if (payment.payment_id && payment.status === 'pending') {
        try {
          const { status } = await mercadoPagoService.getPaymentStatus(payment.payment_id);
          await paymentDb.updateStatus(payment.payment_id, status);
          payment.status = status;
        } catch {
          // Fallback
        }
      }

      res.json({
        success: true,
        status: payment.status,
        approved: payment.status === 'approved',
        externalRef: payment.id,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
