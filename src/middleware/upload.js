/**
 * Configuração do Multer para upload de planilhas
 * Usa memoryStorage em ambiente serverless (Vercel) e diskStorage localmente
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import { AppError } from './errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detecta ambiente Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

let storage;

if (isVercel) {
  // Memory storage — compatível com serverless (Vercel não tem fs persistente)
  storage = multer.memoryStorage();
} else {
  // Disk storage — ambiente local
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
}

const fileFilter = (_req, file, cb) => {
  const allowedMimes = config.upload.allowedTypes.filter(t => t.startsWith('application'));
  const allowedExts = config.upload.allowedTypes.filter(t => t.startsWith('.'));
  const ext = path.extname(file.originalname).toLowerCase();
  const isValid = allowedMimes.includes(file.mimetype) || allowedExts.includes(ext);

  if (isValid) {
    cb(null, true);
  } else {
    cb(new AppError('Formato não permitido. Use arquivos .xlsx ou .xls'), 400);
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSize },
});
