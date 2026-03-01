import { workOrderRepository } from '../../infra/repositories/workorder.repo';
import { inventoryService } from '../../domain/services/invetory.service';
import { auditRepository } from '../../infra/repositories/audit.repo';
import { AUDIT_ACTIONS } from '../../domain/models/types';
import { assertTransition } from '../../domain/stateMachine/workOrderStateMachine';

class WorkOrderController {
  async transitionState(req: any, res: any) {
    try {
      const { id } = req.params;
      const { nextState } = req.body;

      const workOrder = await workOrderRepository.findById(id);

      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      assertTransition(workOrder.status, nextState, workOrder.type);

      const previousState = workOrder.status;
      workOrder.status = nextState;

      // RB-05: Si se cancela, liberar inventario
      if (nextState === "CANCELLED") {
        await inventoryService.releaseForRequest(workOrder.id);
      }

      // save updated work order (using update since repository has no save)
      await workOrderRepository.update(workOrder.id, { status: workOrder.status });

      // Auditoría
      await auditRepository.insert({
        id: `audit_${Date.now()}`, // simple unique id
        at: new Date().toISOString(),
        actorUserId: req.user?.id ?? null,
        entityType: "WORK_ORDER",
        entityId: workOrder.id,
        action: AUDIT_ACTIONS.WORKORDER_STATUS,
        before: { status: previousState },
        after: { status: nextState },
        correlationId: req.correlationId,
      });

      return res.json(workOrder);
    } catch (error: any) {
      return res.status(409).json({
        message: error.message,
      });
    }
  }
}

export const workOrderController = new WorkOrderController();
export default workOrderController;
