import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const HEADER_NAME = 'x-correlation-id';

const handler = (req: Request, res: Response, next: NextFunction): void => {
  const incomingHeader = req.headers[HEADER_NAME];
  const incoming = typeof incomingHeader === 'string' ? incomingHeader : undefined;
  const correlationId = incoming && incoming.trim().length > 0 ? incoming.trim() : `c_${randomUUID()}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};

export const correlationIdMiddleware = handler;

export function correlationId() {
  return handler;
}
