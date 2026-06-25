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

const app = express();

// ── Middlewares globais ──
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── API REST ──
app.use('/api', apiRoutes);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Tratamento global de erros ──
app.use(errorHandler);

// ── Inicialização ──
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (!isVercel) {
  // Inicializa tabelas no banco
  paymentDb.init()
    .then(() => {
      app.listen(config.port, () => {
        console.log(`
  ╔═══════════════════════════════════════════╗
  ║        ZapCatálogo  API (backend)         ║
  ╠═══════════════════════════════════════════╣
  ║  🚀  http://localhost:${String(config.port).padEnd(30)}║
  ║  📁  Modo: ${config.env.padEnd(35)}║
  ╚═══════════════════════════════════════════╝
        `);
      });
    })
    .catch((err) => {
      console.error('[DB] Erro ao inicializar banco:', err.message);
      process.exit(1);
    });
}

export default app;
