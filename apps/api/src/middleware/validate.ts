import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../domain/errors/apiError';

const mapIssues = (issues: Array<{ path: PropertyKey[]; message: string }>) => {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const key =
      issue.path.length > 0 ? issue.path.map((part) => String(part)).join('.') : 'body';
    errors[key] = [...(errors[key] ?? []), issue.message];
  }

  return errors;
};

export function validate(schema: ZodTypeAny, target: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = target === 'body' ? req.body : req.query;
    const result = schema.safeParse(value);

    if (!result.success) {
      next(
        new ApiError(
          400,
          'Validation Error',
          `${target === 'body' ? 'Request body' : 'Request query'} validation failed.`,
          'urn:telecom:error:validation',
          mapIssues(result.error.issues),
        ),
      );
      return;
    }

    if (target === 'body') {
      req.body = result.data;
    } else {
      req.query = result.data as Request['query'];
    }

    next();
  };
}

export const validateBody = (schema: ZodTypeAny) => validate(schema, 'body');

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(
        new ApiError(
          400,
          'Validation Error',
          'Path parameter validation failed.',
          'urn:telecom:error:validation',
          mapIssues(result.error.issues),
        ),
      );
      return;
    }

    req.params = result.data as Request['params'];
    next();
  };
};
