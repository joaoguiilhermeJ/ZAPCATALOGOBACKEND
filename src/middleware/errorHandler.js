/**
 * Middleware global de tratamento de erros
 */

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo excede o limite permitido.'
      : 'Erro ao processar upload.';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      success: false,
      error: message,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Erro interno do servidor';

  if (!err.isOperational) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
