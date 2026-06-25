/**
 * ZapCatálogo — Entry-point Serverless para Vercel
 * Apenas API — sem static do frontend
 */

import express from 'express';
import cors from 'cors';
import config from '../src/config/index.js';
import apiRoutes from '../src/routes/index.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import paymentDb from '../src/services/paymentDb.js';

const app = express();

app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api', apiRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(errorHandler);

// Inicializa tabelas
paymentDb.init().catch((err) => {
  console.error('[DB] Erro ao inicializar banco:', err.message);
});

export default app;
