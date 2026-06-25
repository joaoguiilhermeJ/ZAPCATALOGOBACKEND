/**
 * Controller de upload de planilhas
 * Responsável apenas por receber requisições HTTP e delegar ao service
 */

import spreadsheetService from '../services/spreadsheetService.js';
import { AppError } from '../middleware/errorHandler.js';

export class UploadController {
  async processUpload(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('Nenhum arquivo enviado', 400);
      }

      let result;

      if (req.file.buffer) {
        // Memory storage (Vercel / serverless) — lê do buffer
        result = spreadsheetService.readSpreadsheetFromBuffer(req.file.buffer);
      } else if (req.file.path) {
        // Disk storage (local) — lê do caminho
        result = spreadsheetService.readSpreadsheet(req.file.path);
        spreadsheetService.cleanup(req.file.path);
      } else {
        throw new AppError('Formato de arquivo não suportado', 400);
      }

      res.json({
        success: true,
        filename: req.file.originalname,
        ...result,
      });
    } catch (error) {
      // Limpa arquivo mesmo em caso de erro (apenas disk storage)
      if (req.file?.path) {
        spreadsheetService.cleanup(req.file.path);
      }
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
