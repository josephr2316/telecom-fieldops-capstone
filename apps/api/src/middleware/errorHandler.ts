import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../domain/errors/apiError';
import type { ProblemDetails } from '../domain/models/types';
import { logger, baseReqLog } from '../infra/logger/logger';

export class AppError extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly errors?: Record<string, string[]>;

  constructor(params: {
    status: number;
    title: string;
    detail: string;
    type?: string;
    errors?: Record<string, string[]>;
  }) {
    super(params.detail);
    this.name = 'AppError';
    this.status = params.status;
    this.type = params.type ?? 'urn:telecom:error:app';
    this.errors = params.errors;
  }
}

const toInternalProblem = (req: Request): ProblemDetails => ({
  type: 'urn:telecom:error:internal',
  title: 'Internal Server Error',
  status: 500,
  detail: 'Unexpected error.',
  instance: req.originalUrl || req.path,
  correlationId: req.correlationId ?? 'c_unknown',
});

export const notFoundHandler = (req: Request, res: Response): void => {
  const body: ProblemDetails = {
    type: 'urn:telecom:error:not-found',
    title: 'Not Found',
    status: 404,
    detail: 'Resource not found.',
    instance: req.originalUrl || req.path,
    correlationId: req.correlationId ?? 'c_unknown',
  };

  res.status(404).json(body);
};

const normalizeProblem = (req: Request, status: number, title: string, detail: string, type: string) => ({
  type,
  title,
  status,
  detail,
  instance: req.originalUrl || req.path,
  correlationId: req.correlationId ?? 'c_unknown',
});

const coreErrorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json(error.toProblemDetails(req.originalUrl || req.path, req.correlationId));
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      ...normalizeProblem(req, error.status, 'Request failed', error.message, error.type),
      ...(error.errors ? { errors: error.errors } : {}),
    });
    return;
  }

  if ((error as { name?: string })?.name === 'ZodError') {
    const issues = (error as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues ?? [];
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : 'body';
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }

    res.status(400).json({
      ...normalizeProblem(
        req,
        400,
        'Validation Error',
        'Request validation failed.',
        'urn:telecom:error:validation',
      ),
      errors: fieldErrors,
    });
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  const errPayload: Record<string, unknown> = {
    ...baseReqLog(req),
    correlationId: req.correlationId,
    action: 'UNHANDLED_ERROR',
    error: err.message,
    errorName: err.name,
    stack: err.stack,
  };
  if (error && typeof (error as { code?: string }).code === 'string') {
    errPayload.code = (error as { code: string }).code;
  }
  logger.error(errPayload, 'Unhandled error');

  const body = toInternalProblem(req);
  if (process.env.NODE_ENV === 'development') {
    body.detail = err.message;
    (body as unknown as Record<string, unknown>).errorName = err.name;
  }
  res.status(500).json(body);
};

export const errorHandler = () => coreErrorHandler;
