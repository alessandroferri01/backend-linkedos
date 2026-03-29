import { Request, Response, NextFunction } from 'express';
import { AppError, sendError, logger } from '../utils';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', {
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
    }
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
  });

  sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
}
