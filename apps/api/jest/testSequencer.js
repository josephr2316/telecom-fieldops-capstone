/**
 * Deterministic test order (Jest loads this with require(), so it must be .js):
 * - unit/ first (audit)
 * - integration/ in order: auth-rbac, kpi-dashboard, sync-import, user-management last (user-management wipes DB)
 */
const path = require('path');
const Sequencer = require('@jest/test-sequencer').default;

const ORDER = [
  'unit/audit.test.ts',
  'integration/auth-rbac.test.ts',
  'integration/kpi-dashboard.test.ts',
  'integration/sync-import.test.ts',
  'integration/user-management.test.ts',
];

function relativePath(fullPath) {
  const normalized = path.normalize(fullPath).replace(/\\/g, '/');
  const idx = normalized.indexOf('/tests/');
  if (idx === -1) return path.basename(normalized);
  return normalized.slice(normalized.indexOf('/tests/') + 7);
}

class CustomSequencer extends Sequencer {
  sort(tests) {
    return [...tests].sort((a, b) => {
      const relA = relativePath(a.path);
      const relB = relativePath(b.path);
      const idxA = ORDER.indexOf(relA);
      const idxB = ORDER.indexOf(relB);
      if (idxA === -1 && idxB === -1) return relA.localeCompare(relB);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }
}

module.exports = CustomSequencer;
