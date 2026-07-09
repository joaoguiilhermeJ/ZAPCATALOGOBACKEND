// src/routes/onboardingRoutes.js
import { Router } from 'express';
import multer from 'multer';
import onboardingController from '../controllers/onboardingController.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
// usamos multer memory storage para aceitar logo opcional e ignorar planilha
// quando o frontend enviar tudo no mesmo multipart.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedSheets = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const sheetExt = /\.(xlsx|xls)$/i.test(file.originalname || '');
    const isLogo = file.fieldname === 'logo' && allowedImages.includes(file.mimetype);
    const isSheet = ['file', 'planilha'].includes(file.fieldname) && (allowedSheets.includes(file.mimetype) || sheetExt);
    if (!isLogo && !isSheet) {
      return callback(new AppError('Formato inválido. Use JPG, PNG, WebP, XLSX ou XLS.', 400));
    }
    callback(null, true);
  },
});

// POST /api/onboarding (multipart para logo opcional ou json body)
router.post('/onboarding', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'planilha', maxCount: 1 },
]), (req, res, next) =>
  onboardingController.create(req, res, next)
);

export default router;
