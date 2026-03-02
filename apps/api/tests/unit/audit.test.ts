/**
 * Unit tests for writeAudit middleware (RF-14 / RB-07).
 */
import { writeAudit } from '../../src/middleware/audit';

let capturedLogs: Record<string, unknown>[] = [];
const originalLog = console.log;
const originalInfo = console.info;

function setupLogCapture() {
  capturedLogs = [];
  console.log = (message: string) => {
    try {
      capturedLogs.push(JSON.parse(message) as Record<string, unknown>);
    } catch {
      capturedLogs.push({ raw: message });
    }
  };
  console.info = console.log as typeof console.info;
}

function teardownLogCapture() {
  console.log = originalLog;
  console.info = originalInfo;
}

describe('writeAudit middleware', () => {
  afterEach(() => {
    teardownLogCapture();
  });

  it('logs AUDIT_EVENT with correlationId', async () => {
    setupLogCapture();
    const mockReq = {
      correlationId: 'test-123-uuid',
      method: 'POST',
      url: '/users/block',
      ip: '127.0.0.1',
      originalUrl: '/api/v1/users/block',
    } as any;
    const mockPayload = {
      action: 'USER_BLOCKED',
      entityType: 'User',
      entityId: 'usr_999',
      before: { isActive: true },
      after: { isActive: false },
    };
    await writeAudit(mockReq, mockPayload);
    const logEntry = capturedLogs.find((log) => log.message === 'AUDIT_EVENT') as Record<string, unknown>;
    expect(logEntry).toBeDefined();
    expect(logEntry.correlationId).toBe('test-123-uuid');
    expect((logEntry.audit as Record<string, unknown>)?.action).toBe('USER_BLOCKED');
  });

  it('registers actorUserId when user is on request', async () => {
    setupLogCapture();
    const mockReq = {
      correlationId: 'c_456-xyz',
      method: 'PATCH',
      url: '/work-orders/wo_001/status',
      ip: '192.168.1.1',
      originalUrl: '/api/v1/work-orders/wo_001/status',
      user: { id: 'usr_admin_01' },
    } as any;
    const mockPayload = {
      action: 'WORK_ORDER_STATUS_CHANGED',
      entityType: 'workOrder',
      entityId: 'wo_001',
      before: { status: 'DRAFT' },
      after: { status: 'SUBMITTED' },
    };
    await writeAudit(mockReq, mockPayload);
    const logEntry = capturedLogs.find((log) => log.message === 'AUDIT_EVENT') as Record<string, unknown>;
    expect(logEntry).toBeDefined();
    expect(logEntry.actorUserId).toBe('usr_admin_01');
  });

  it('uses "anonymous" when no user on request', async () => {
    setupLogCapture();
    const mockReq = {
      correlationId: 'c_789-abc',
      method: 'GET',
      url: '/audit',
      ip: '10.0.0.1',
      originalUrl: '/api/v1/audit',
    } as any;
    const mockPayload = {
      action: 'AUDIT_ACCESSED',
      entityType: 'audit',
      entityId: 'audit_001',
      before: null,
      after: null,
    };
    await writeAudit(mockReq, mockPayload);
    const logEntry = capturedLogs.find((log) => log.message === 'AUDIT_EVENT') as Record<string, unknown>;
    expect(logEntry).toBeDefined();
    expect(logEntry.actorUserId).toBe('anonymous');
  });

  it('includes all required audit event fields', async () => {
    setupLogCapture();
    const mockReq = {
      correlationId: 'c_schema-test',
      method: 'POST',
      url: '/work-orders',
      ip: '172.16.0.1',
      originalUrl: '/api/v1/work-orders',
      user: { id: 'usr_sales_01' },
    } as any;
    const mockPayload = {
      action: 'WORK_ORDER_CREATED',
      entityType: 'workOrder',
      entityId: 'wo_10021',
      before: null,
      after: { id: 'wo_10021', type: 'NEW_SERVICE_INSTALL', status: 'DRAFT', customerId: 'cust_001' },
    };
    await writeAudit(mockReq, mockPayload);
    const logEntry = capturedLogs.find((log) => log.message === 'AUDIT_EVENT') as Record<string, unknown>;
    expect(logEntry).toBeDefined();
    expect(logEntry).toHaveProperty('correlationId');
    expect(logEntry).toHaveProperty('actorUserId');
    expect(logEntry).toHaveProperty('audit');
    const audit = logEntry.audit as Record<string, unknown>;
    expect(audit).toHaveProperty('action');
    expect(audit).toHaveProperty('entityType');
    expect(audit).toHaveProperty('entityId');
    expect(audit).toHaveProperty('before');
    expect(audit).toHaveProperty('after');
  });
});
