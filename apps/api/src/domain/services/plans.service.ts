import { ApiError } from '../errors/apiError';
import type { Plan } from '../models/types';
import {
  plansRepository,
  type CreatePlanInput,
  type UpdatePlanInput,
} from '../../infra/repositories/plans.repo';

const notFoundError = (id: string) =>
  new ApiError(404, 'Not Found', `No existe plan con id ${id}`, 'urn:telecom:error:plan-not-found');

/** Plans service: list, get by id, create, update, activate, deactivate, delete. All methods async. */
export const plansService = {
  async listPlans(): Promise<Plan[]> {
    return plansRepository.listAll();
  },

  async getPlanById(id: string): Promise<Plan> {
    const plan = await plansRepository.findById(id);
    if (!plan) throw notFoundError(id);
    return plan;
  },

  async createPlan(input: CreatePlanInput): Promise<Plan> {
    return plansRepository.create(input);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<Plan> {
    const updated = await plansRepository.update(id, input);
    if (!updated) throw notFoundError(id);
    return updated;
  },

  async activatePlan(id: string): Promise<Plan> {
    const updated = await plansRepository.activate(id);
    if (!updated) throw notFoundError(id);
    return updated;
  },

  async deactivatePlan(id: string): Promise<Plan> {
    const updated = await plansRepository.deactivate(id);
    if (!updated) throw notFoundError(id);
    return updated;
  },

  async deletePlan(id: string): Promise<void> {
    const deleted = await plansRepository.delete(id);
    if (!deleted) throw notFoundError(id);
  },
};
