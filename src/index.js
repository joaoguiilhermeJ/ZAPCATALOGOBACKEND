/**
 * ZapCatálogo — Servidor Express (Backend puro, sem frontend)
 * Ponto de entrada da API para deploy no Render
 */

import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import paymentDb from './services/paymentDb.js';
import { ensureCatalogTables, ensureUserTables } from './services/db.js';

const app = express();

// ── Middlewares globais ──
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── API REST ──
app.use('/api', apiRoutes);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Tratamento global de erros ──
app.use(errorHandler);

// ── Inicialização ──
const PORT = config.port;

// Inicializa tabelas no banco
Promise.all([
    paymentDb.init(),
    ensureCatalogTables(),
    ensureUserTables(),
  ])
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
  ╔═══════════════════════════════════════════╗
  ║        ZapCatálogo  API (backend)         ║
  ╠═══════════════════════════════════════════╣
  ║  🚀  Porta: ${String(PORT).padEnd(35)}║
  ║  📁  Modo: ${config.env.padEnd(35)}║
  ╚═══════════════════════════════════════════╝
      `);
    });
  })
  .catch((err) => {
    console.error('[DB] Erro ao inicializar banco:', err.message);
    process.exit(1);
  });

export default app;
