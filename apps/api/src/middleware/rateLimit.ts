import rateLimit from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import type { ProblemDetails } from '../domain/models/types';
import { logger } from '../infra/logger/logger';
import { env } from '../config/env';

const toProblem = (req: Request, detail: string): ProblemDetails => ({
  type: 'urn:telecom:error:rate-limit',
  title: 'Too Many Requests',
  status: 429,
  detail,
  instance: req.originalUrl || req.path,
  correlationId: req.correlationId,
});

const buildLimiter = (max: number, detail: string) => {
  if (env.nodeEnv === 'test') {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }

  return rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        correlationId: req.correlationId,
        action: 'RATE_LIMIT',
        path: req.originalUrl,
        method: req.method,
      });
      res.status(429).json(toProblem(req, detail));
    },
  });
};

export const loginRateLimit = buildLimiter(
  5,
  'Too many login attempts from this IP. Please retry in one minute.',
);

export const createRateLimit = buildLimiter(
  15,
  'Too many create operations from this IP. Please retry in one minute.',
);
