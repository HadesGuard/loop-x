import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error.middleware';

function handleZodError(error: unknown, next: NextFunction) {
  if (error instanceof ZodError) {
    const errors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    const validationError = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    validationError.errors = errors;
    next(validationError);
  } else {
    next(error);
  }
}

export const validate = (schema: ZodSchema, source: 'body' | 'query' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = source === 'query' ? req.query : req.body;
      const parsed = schema.parse(data);
      // Assign parsed (stripped) result back to prevent mass assignment
      if (source === 'query') {
        req.query = parsed;
      } else {
        req.body = parsed;
      }
      next();
    } catch (error) {
      handleZodError(error, next);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed;
      next();
    } catch (error) {
      handleZodError(error, next);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      handleZodError(error, next);
    }
  };
};
