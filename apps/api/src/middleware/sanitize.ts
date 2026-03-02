import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import type { NextFunction, Request, Response } from 'express';

const window = new JSDOM('').window as unknown as Window & typeof globalThis;
const DOMPurify = createDOMPurify(window);

const sanitizeString = (value: string): string =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

const sanitizeDeep = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDeep);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([key, nested]) => [key, sanitizeDeep(nested)]));
  }

  return value;
};

export const sanitizeResponseMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    const sanitizedBody = sanitizeDeep(body);
    return originalJson(sanitizedBody);
  }) as Response['json'];

  next();
};
