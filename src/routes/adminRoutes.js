import { Router } from "express";
import multer from "multer";
import adminController from "../controllers/adminController.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return callback(new AppError("Formato inválido. Use JPG, PNG ou WebP.", 400));
    }
    callback(null, true);
  },
});

router.get("/admin/catalogos/:slug", (req, res, next) =>
  adminController.getCatalogo(req, res, next)
);

router.put("/admin/catalogos/:slug", (req, res, next) =>
  adminController.updateCatalogo(req, res, next)
);

router.put("/admin/produtos/:id", (req, res, next) =>
  adminController.updateProduto(req, res, next)
);

router.patch("/admin/produtos/:id/imagem", imageUpload.single("imagem"), (req, res, next) =>
  adminController.updateImagemProduto(req, res, next)
);

router.patch("/admin/produtos/:id/ativo", (req, res, next) =>
  adminController.updateProdutoAtivo(req, res, next)
);

router.patch("/admin/produtos/:id/disponibilidade", (req, res, next) =>
  adminController.updateProdutoDisponibilidade(req, res, next)
);

export default router;
