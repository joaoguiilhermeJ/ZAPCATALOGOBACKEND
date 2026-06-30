// src/routes/onboardingRoutes.js
import { Router } from 'express';
import multer from 'multer';
import onboardingController from '../controllers/onboardingController.js';

const router = Router();
// usamos multer memory storage para aceitar logo opcional
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/onboarding (multipart para logo ou json body)
router.post('/onboarding', upload.single('logo'), (req, res, next) =>
  onboardingController.create(req, res, next)
);

export default router;