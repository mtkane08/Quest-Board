import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { Errors } from '../lib/errors.js';

/**
 * Every request body is schema-validated (spec Section 38) before it
 * reaches a route handler — handlers can trust `req.body`'s shape.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(Errors.validation(result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
