export const PLAN_ENDPOINTS = {
  list: '/api/v1/catalog/plans',
  byId: (planId: string) => `/api/v1/catalog/plans/${planId}`,
  activate: (planId: string) => `/api/v1/catalog/plans/${planId}/activate`,
  deactivate: (planId: string) => `/api/v1/catalog/plans/${planId}/deactivate`,
} as const;
