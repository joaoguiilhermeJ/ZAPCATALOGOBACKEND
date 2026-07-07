// src/routes/onboardingRoutes.js
import { Router } from 'express';
import multer from 'multer';
import onboardingController from '../controllers/onboardingController.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
// usamos multer memory storage para aceitar logo opcional
const upload = multer({
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

// POST /api/onboarding (multipart para logo ou json body)
router.post('/onboarding', upload.single('logo'), (req, res, next) =>
  onboardingController.create(req, res, next)
);

export default router;
