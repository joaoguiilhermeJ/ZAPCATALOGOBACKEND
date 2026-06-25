/**
 * Rotas de upload e template
 * Mantém apenas o roteamento — lógica delegada ao controller
 */

import { Router } from 'express';
import uploadController from '../controllers/uploadController.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.post('/upload', uploadMiddleware.single('file'), (req, res, next) =>
  uploadController.processUpload(req, res, next)
);

router.get('/template', (req, res, next) =>
  uploadController.downloadTemplate(req, res, next)
);

export default router;
