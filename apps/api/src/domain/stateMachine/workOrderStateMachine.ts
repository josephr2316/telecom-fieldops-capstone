import { ApiError } from '../errors/apiError';
import type { WorkOrderType, WorkOrderStatus } from '../models/types';
import { transitions } from './transitions';

/**
 * return the list of allowed next statuses for a given type/current state.
 */
export function allowedTransitions(
  type: WorkOrderType,
  current: WorkOrderStatus,
): WorkOrderStatus[] {
  const typeMap = transitions[type] || {};
  const base = typeMap[current] || [];
  // always allow CANCELLED and CONFLICT (unless we're already completed)
  const extra: WorkOrderStatus[] = [];
  if (current !== 'COMPLETED') {
    if (!base.includes('CANCELLED')) extra.push('CANCELLED');
    if (!base.includes('CONFLICT')) extra.push('CONFLICT');
  }
  return Array.from(new Set([...base, ...extra]));
}

/**
 * Throws ApiError 409 if transition is invalid; also enforces golden rule about
 * verification before completion and other type-specific invariants.
 */
export function validateTransition(
  type: WorkOrderType,
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): void {
  const allowed = allowedTransitions(type, from);
  if (!allowed.includes(to)) {
    throw new ApiError(
      409,
      'Conflict',
      `Invalid status transition from ${from} to ${to} for type ${type}`,
      'urn:telecom:error:invalid_transition',
    );
  }

  // golden rule: cannot go to COMPLETED without passing through VERIFICATION
  if (
    to === 'COMPLETED' &&
    type !== 'MONTHLY_PAYMENT' &&
    from !== 'VERIFICATION' &&
    from !== 'RECEIPT_ISSUED' // monthly payment path
  ) {
    throw new ApiError(
      409,
      'Conflict',
      'Cannot complete without verification',
      'urn:telecom:error:invalid_transition',
    );
  }
}

// helpers used by controllers and for convenience
export function canTransition(
  current: WorkOrderStatus,
  next: WorkOrderStatus,
  type: WorkOrderType,
): boolean {
  try {
    validateTransition(type, current, next);
    return true;
  } catch {
    return false;
  }
}

export function assertTransition(
  current: WorkOrderStatus,
  next: WorkOrderStatus,
  type: WorkOrderType,
) {
  validateTransition(type, current, next);
}

