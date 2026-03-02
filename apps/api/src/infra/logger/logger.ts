import type { Request } from 'express';
import type { LoggerContext } from '../../domain/models/types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const safeSerialize = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ level: 'error', message: 'Failed to serialize log payload' });
  }
};

const normalizeArgs = (
  arg1: string | Record<string, unknown>,
  arg2?: LoggerContext | string,
): { message: string; context: Record<string, unknown> } => {
  if (typeof arg1 === 'string') {
    return { message: arg1, context: (arg2 as LoggerContext | undefined) ?? {} };
  }

  return {
    message: typeof arg2 === 'string' ? arg2 : 'log',
    context: arg1,
  };
};

const emit = (level: LogLevel, arg1: string | Record<string, unknown>, arg2?: LoggerContext | string): void => {
  const { message, context } = normalizeArgs(arg1, arg2);
  const payload = {
    level,
    message,
    at: new Date().toISOString(),
    ...context,
  };

  const serialized = safeSerialize(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  debug: (arg1: string | Record<string, unknown>, arg2?: LoggerContext | string): void =>
    emit('debug', arg1, arg2),
  info: (arg1: string | Record<string, unknown>, arg2?: LoggerContext | string): void =>
    emit('info', arg1, arg2),
  warn: (arg1: string | Record<string, unknown>, arg2?: LoggerContext | string): void =>
    emit('warn', arg1, arg2),
  error: (arg1: string | Record<string, unknown>, arg2?: LoggerContext | string): void =>
    emit('error', arg1, arg2),
};

export function getCorrelationId(req: Request): string | undefined {
  return req.correlationId;
}

export function baseReqLog(req: Request) {
  return {
    correlationId: getCorrelationId(req),
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
  };
}
