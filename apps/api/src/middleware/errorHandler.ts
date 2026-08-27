import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';

export function errorHandler(logger: Logger) {
  // Express identifies error-handling middleware by arity — keep all 4 params.
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      if (err.statusCode >= 500) {
        logger.error(err.message, { requestId: req.requestId, code: err.code });
      }
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message, details: err.details },
      });
      return;
    }

    logger.error('unhandled error', {
      requestId: req.requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
    });
  };
}
