import type { ProblemDetails } from '../models/types';

export class ApiError extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly title: string;
  public readonly errors?: Record<string, string[]>;

  constructor(
    status: number,
    title: string,
    detail: string,
    type = 'about:blank',
    errors?: Record<string, string[]>,
  ) {
    super(detail);
    this.status = status;
    this.title = title;
    this.type = type;
    this.errors = errors;
  }

  toProblemDetails(instance: string, correlationId: string): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.message,
      instance,
      correlationId,
      ...(this.errors ? { errors: this.errors } : {}),
    };
  }
}
