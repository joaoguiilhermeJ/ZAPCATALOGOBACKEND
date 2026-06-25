/**
 * MercadoPagoService — Integração com API do Mercado Pago (Checkout Pro)
 */

import { MercadoPagoConfig, Preference } from 'mercadopago';

const accessToken = process.env.MP_ACCESS_TOKEN;

let client = null;

function getClient() {
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN não configurado no .env');
  }
  if (!client) {
    client = new MercadoPagoConfig({ accessToken });
  }
  return client;
}

export class MercadoPagoService {
  /**
   * Cria uma preferência de pagamento no Mercado Pago
   *
   * @param {number} amount - Valor do pagamento (ex: 15)
   * @param {string} description - Descrição do produto
   * @param {string} externalRef - ID único de referência externa
   * @param {object} options - Opcionais (backUrls, notificationUrl)
   * @returns {Promise<{initPoint: string, preferenceId: string}>}
   */
  async createPreference(amount, description, externalRef, options = {}) {
    const preference = new Preference(getClient());

    const body = {
      items: [
        {
          id: externalRef,
          title: description,
          description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount,
        },
      ],
      external_reference: externalRef,
      back_urls: {
        success: options.successUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/pagamento.html?status=approved`,
        failure: options.failureUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/pagamento.html?status=failure`,
        pending: options.pendingUrl || `${process.env.BASE_URL || 'http://localhost:3000'}/pagamento.html?status=pending`,
      },
      auto_return: 'approved',
      notification_url: options.notificationUrl || `${process.env.BASE_URL || 'https://localhost:3000'}/api/payment/webhook`,
    };

    const result = await preference.create({ body });

    return {
      initPoint: result.init_point || result.sandbox_init_point,
      preferenceId: result.id,
    };
  }

  /**
   * Obtém o status de um pagamento pelo ID do Mercado Pago
   *
   * @param {number} paymentId - ID do pagamento no MP
   * @returns {Promise<{status: string, externalRef: string|null}>}
   */
  async getPaymentStatus(paymentId) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao consultar pagamento: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      status: data.status,
      externalRef: data.external_reference || null,
    };
  }
}

export default new MercadoPagoService();
