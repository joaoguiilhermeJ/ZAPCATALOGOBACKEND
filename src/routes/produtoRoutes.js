/**
 * Rotas de upload e consulta de produtos via planilha
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import produtoUploadController from '../controllers/produtoUploadController.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const allowedExts = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedMimes.includes(file.mimetype) && !allowedExts.includes(ext)) {
      return callback(new AppError('Formato inválido. Envie uma planilha .xlsx ou .xls.', 400));
    }
    callback(null, true);
  },
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return callback(new AppError('Formato inválido. Use JPG, PNG ou WebP.', 400));
    }
    callback(null, true);
  },
});

router.post('/produtos/upload', upload.single('file'), (req, res, next) =>
  produtoUploadController.upload(req, res, next)
);

router.post('/produtos/:id/imagem', imageUpload.single('imagem'), (req, res, next) =>
  produtoUploadController.uploadImagem(req, res, next)
);

router.get('/produtos/ultimos', (req, res, next) =>
  produtoUploadController.ultimos(req, res, next)
);

export default router;
