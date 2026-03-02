import { writeAudit } from '../../middleware/audit';

let capturedLogs: any[] = [];

const originalLog = console.log;
const originalInfo = console.info;

function setupLogCapture() {
  capturedLogs = [];
  console.log = (message: string) => {
    try {
      const parsed = JSON.parse(message);
      capturedLogs.push(parsed);
    } catch {
      capturedLogs.push({ raw: message });
    }
  };
  console.info = console.log;
}

function teardownLogCapture() {
  console.log = originalLog;
  console.info = originalInfo;
}

async function test1_WriteAuditWithCorrelationId() {
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
    after: { isActive: false }
  };

  await writeAudit(mockReq, mockPayload);

  const logEntry = capturedLogs.find(log => log.message === 'AUDIT_EVENT');
  
  if (!logEntry) {
    throw new Error('❌ AUDIT_EVENT not logged');
  }

  if (logEntry.correlationId !== 'test-123-uuid') {
    throw new Error(
      `❌ correlationId mismatch. Expected: 'test-123-uuid', Got: '${logEntry.correlationId}'`
    );
  }

  if (!logEntry.audit || logEntry.audit.action !== 'USER_BLOCKED') {
    throw new Error('❌ Audit payload not correctly logged');
  }

  teardownLogCapture();
  console.log('✅ Test 1 PASSED: writeAudit captures correlationId');
}

async function test2_WriteAuditWithActorUserId() {
  setupLogCapture();

  const mockReq = {
    correlationId: 'c_456-xyz',
    method: 'PATCH',
    url: '/work-orders/wo_001/status',
    ip: '192.168.1.1',
    originalUrl: '/api/v1/work-orders/wo_001/status',
    user: { id: 'usr_admin_01' }
  } as any;

  const mockPayload = {
    action: 'WORK_ORDER_STATUS_CHANGED',
    entityType: 'workOrder',
    entityId: 'wo_001',
    before: { status: 'DRAFT' },
    after: { status: 'SUBMITTED' }
  };

  await writeAudit(mockReq, mockPayload);

  const logEntry = capturedLogs.find(log => log.message === 'AUDIT_EVENT');

  if (logEntry.actorUserId !== 'usr_admin_01') {
    throw new Error(
      `❌ actorUserId mismatch. Expected: 'usr_admin_01', Got: '${logEntry.actorUserId}'`
    );
  }

  teardownLogCapture();
  console.log('✅ Test 2 PASSED: writeAudit registers actorUserId');
}

async function test3_WriteAuditWithoutUser() {
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
    after: null
  };

  await writeAudit(mockReq, mockPayload);

  const logEntry = capturedLogs.find(log => log.message === 'AUDIT_EVENT');

  if (logEntry.actorUserId !== 'anonymous') {
    throw new Error(
      `❌ actorUserId should be 'anonymous' when no user. Got: '${logEntry.actorUserId}'`
    );
  }

  teardownLogCapture();
  console.log('✅ Test 3 PASSED: writeAudit uses "anonymous" without user');
}

async function test4_AuditEventSchema() {
  setupLogCapture();

  const mockReq = {
    correlationId: 'c_schema-test',
    method: 'POST',
    url: '/work-orders',
    ip: '172.16.0.1',
    originalUrl: '/api/v1/work-orders',
    user: { id: 'usr_sales_01' }
  } as any;

  const mockPayload = {
    action: 'WORK_ORDER_CREATED',
    entityType: 'workOrder',
    entityId: 'wo_10021',
    before: null,
    after: { 
      id: 'wo_10021',
      type: 'NEW_SERVICE_INSTALL',
      status: 'DRAFT',
      customerId: 'cust_001'
    }
  };

  await writeAudit(mockReq, mockPayload);

  const logEntry = capturedLogs.find(log => log.message === 'AUDIT_EVENT');

  const requiredFields = ['correlationId', 'actorUserId', 'audit'];
  for (const field of requiredFields) {
    if (!(field in logEntry)) {
      throw new Error(`❌ Missing required field: ${field}`);
    }
  }

  const audit = logEntry.audit;
  const auditRequiredFields = ['action', 'entityType', 'entityId', 'before', 'after'];
  for (const field of auditRequiredFields) {
    if (!(field in audit)) {
      throw new Error(`❌ Missing audit field: ${field}`);
    } 
  }

  teardownLogCapture();
  console.log('✅ Test 4 PASSED: AuditEvent includes all required fields');
}

(async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 AUDIT SYSTEM TEST SUITE');
  console.log('RF-14: Auditoría de acciones críticas consultable por entidad');
  console.log('RB-07: Todas las acciones críticas generan auditoría');
  console.log('='.repeat(60) + '\n');

  const tests = [
    test1_WriteAuditWithCorrelationId,
    test2_WriteAuditWithActorUserId,
    test3_WriteAuditWithoutUser,
    test4_AuditEventSchema
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    process.exit(1);
  }
})();