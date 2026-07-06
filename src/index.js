/**
 * ZapCatálogo — Servidor Express (Backend puro, sem frontend)
 * Ponto de entrada da API para deploy no Render
 */

import express from "express";
import cors from "cors";
import config from "./config/index.js";
import apiRoutes from "./routes/index.js";
import lojaController from "./controllers/lojaController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import paymentDb from "./services/paymentDb.js";
import { ensureCatalogTables, ensureUserTables } from "./services/db.js";

const app = express();

// ── Middlewares globais ──
// Ajuste de CORS: garante que a origem da Vercel esteja permitida em produção
const defaultVercelOrigin = "https://zapcatalogo-weld.vercel.app";
let corsOption = config.cors.origin;
try {
  if (corsOption === true) {
    // permite refletir origem
    app.use(cors());
  } else {
    // normaliza para array
    const allowed = Array.isArray(corsOption)
      ? [...corsOption]
      : corsOption
        ? [corsOption]
        : [];
    if (!allowed.includes(defaultVercelOrigin))
      allowed.push(defaultVercelOrigin);
    app.use(cors({ origin: allowed }));
  }
} catch (e) {
  // fallback permissivo (usar apenas em emergências)
  console.error(
    "[CORS] Erro ao configurar CORS, usando fallback permissivo",
    e.message,
  );
  app.use(cors());
}
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Health Check ──
const healthCheck = (_req, res) => {
  res.json({
    status: "online",
    service: "ZapCatálogo API",
    environment: config.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

app.get("/health", healthCheck);
app.get("/api/health", healthCheck);

// ── API REST ──
// Rota explícita para compatibilidade: garante existência de /api/loja/:slug
app.get("/api/loja/:slug", (req, res, next) =>
  lojaController.getBySlug(req, res, next),
);

app.use("/api", apiRoutes);

// ── Tratamento global de erros ──
app.use(errorHandler);

// ── Inicialização ──
const PORT = config.port;

// Inicializa tabelas no banco
(async function initDB() {
  await paymentDb.init();
  await ensureUserTables();
  await ensureCatalogTables();
})()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
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
    console.error("[DB] Erro ao inicializar banco:", err.message);
    process.exit(1);
  });

export default app;
