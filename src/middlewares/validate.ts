import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../utils';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`)
        .join(', ');
      next(new BadRequestError(message, 'VALIDATION_ERROR'));
      return;
    }

    next();
  };
}
