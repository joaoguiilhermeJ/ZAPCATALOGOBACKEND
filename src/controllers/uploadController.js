/**
 * Controller de upload de planilhas
 * Responsável apenas por receber requisições HTTP e delegar ao service
 */

import spreadsheetService from '../services/spreadsheetService.js';
import { AppError } from '../middleware/errorHandler.js';

export class UploadController {
  async processUpload(req, res, next) {
    try {
      console.log('[UploadPreview] POST /api/upload recebido', {
        filename: req.file?.originalname || null,
        size: req.file?.size || 0,
        mimetype: req.file?.mimetype || null,
      });

      if (!req.file) {
        throw new AppError('Nenhum arquivo enviado', 400);
      }

      if (!req.file.buffer) {
        throw new AppError('Formato de arquivo não suportado', 400);
      }

      const result = spreadsheetService.readSpreadsheetFromBuffer(req.file.buffer);

      console.log('[UploadPreview] Planilha validada', {
        filename: req.file.originalname,
        size: req.file.size,
        rowCount: result.rowCount,
      });

      res.json({
        success: true,
        filename: req.file.originalname,
        ...result,
      });
    } catch (error) {
      console.error('[UploadPreview] Erro ao processar planilha', {
        filename: req.file?.originalname || null,
        size: req.file?.size || 0,
        message: error.message,
      });
      next(error);
    }
  }

  async downloadTemplate(_req, res, next) {
    try {
      const templateBuffer = spreadsheetService.createTemplate();

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ZapCatalogo_Planilha_Modelo.xlsx"'
      );
      res.send(templateBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new UploadController();
