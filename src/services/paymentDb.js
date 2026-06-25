/**
 * PaymentDb — Armazenamento de pagamentos no Neon PostgreSQL
 *
 * Substitui o antigo paymentStore.js (Map em memória)
 */

import { query, ensureTables } from './db.js';

export class PaymentDb {
  async init() {
    await ensureTables();
  }

  /**
   * Cria um registro de pagamento pendente
   */
  async create(externalReference) {
    const result = await query(
      `INSERT INTO payments (id, external_reference, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (id) DO UPDATE SET status = 'pending'
       RETURNING *`,
      [externalReference, externalReference]
    );
    return result.rows[0];
  }

  /**
   * Atualiza o preferenceId após criar preferência no MP
   */
  async setPreferenceId(externalRef, preferenceId) {
    await query(
      `UPDATE payments SET preference_id = $1 WHERE id = $2`,
      [preferenceId, externalRef]
    );
  }

  /**
   * Atualiza o status do pagamento (via webhook)
   */
  async updateStatus(paymentId, status) {
    const result = await query(
      `UPDATE payments
       SET status = $1,
           approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END
       WHERE payment_id = $2
       RETURNING *`,
      [status, paymentId]
    );
    return result.rows[0] || null;
  }

  /**
   * Vincula um paymentId recebido no webhook ao registro externo
   */
  async linkPayment(externalRef, paymentId) {
    const result = await query(
      `UPDATE payments SET payment_id = $1 WHERE id = $2 RETURNING *`,
      [paymentId, externalRef]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca um pagamento pelo externalReference
   */
  async getByExternalRef(externalRef) {
    const result = await query(
      `SELECT * FROM payments WHERE id = $1`,
      [externalRef]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca um pagamento pelo paymentId do MP
   */
  async getByPaymentId(paymentId) {
    const result = await query(
      `SELECT * FROM payments WHERE payment_id = $1`,
      [paymentId]
    );
    return result.rows[0] || null;
  }

  /**
   * Verifica se um externalReference tem pagamento aprovado
   */
  async isApproved(externalRef) {
    const result = await query(
      `SELECT status FROM payments WHERE id = $1 AND status = 'approved'`,
      [externalRef]
    );
    return result.rows.length > 0;
  }
}

export default new PaymentDb();
