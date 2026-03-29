import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

interface ErrorResponse {
  success: false;
  data: null;
  error: {
    message: string;
    code: string;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: SuccessResponse<T> = {
    success: true,
    data,
    error: null,
  };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, message: string, code: string, statusCode = 500): void {
  const body: ErrorResponse = {
    success: false,
    data: null,
    error: { message, code },
  };
  res.status(statusCode).json(body);
}
