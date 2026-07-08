/**
 * Configuração do Multer para upload de planilhas
 * Usa memoryStorage para preview seguro sem gravar arquivo em disco.
 */

import multer from 'multer';
import config from '../config/index.js';
import { AppError } from './errorHandler.js';

const fileFilter = (_req, file, cb) => {
  const allowedMimes = config.upload.allowedTypes.filter(t => t.startsWith('application'));
  const allowedExts = config.upload.allowedTypes.filter(t => t.startsWith('.'));
  const ext = (file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  const isValid = allowedMimes.includes(file.mimetype) || allowedExts.includes(ext);

  if (isValid) {
    cb(null, true);
  } else {
    cb(new AppError('Formato não permitido. Use arquivos .xlsx ou .xls'));
  }
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: config.upload.maxSize },
});
