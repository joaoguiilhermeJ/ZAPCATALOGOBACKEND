/**
 * Rotas de upload e consulta de produtos via planilha
 */

import { Router } from 'express';
import multer from 'multer';
import produtoUploadController from '../controllers/produtoUploadController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/produtos/upload', upload.single('file'), (req, res, next) =>
  produtoUploadController.upload(req, res, next)
);

router.get('/produtos/ultimos', (req, res, next) =>
  produtoUploadController.ultimos(req, res, next)
);

export default router;