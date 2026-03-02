import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../domain/errors/apiError';

export const hasPermission = (granted: string[], required: string): boolean => {
  if (granted.includes('*')) {
    return true;
  }

  if (granted.includes(required)) {
    return true;
  }

  const [namespace] = required.split(':');
  if (!namespace) {
    return false;
  }

  return granted.includes(`${namespace}:*`);
};

export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Unauthorized', 'Authentication required.', 'urn:telecom:error:missing-token'));
      return;
    }

    const granted = req.user.permissions;
    const authorized = requiredPermissions.every((permission) => hasPermission(granted, permission));

    if (!authorized) {
      next(
        new ApiError(403, 'Forbidden', 'Insufficient permissions.', 'urn:telecom:error:missing-permission'),
      );
      return;
    }

    next();
  };
};

/** Requires at least one of the given permissions (OR). */
export const requireAnyPermission = (requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Unauthorized', 'Authentication required.', 'urn:telecom:error:missing-token'));
      return;
    }

    const granted = req.user.permissions;
    const authorized = requiredPermissions.some((permission) => hasPermission(granted, permission));

    if (!authorized) {
      next(
        new ApiError(403, 'Forbidden', 'Insufficient permissions.', 'urn:telecom:error:missing-permission'),
      );
      return;
    }

    next();
  };
};
