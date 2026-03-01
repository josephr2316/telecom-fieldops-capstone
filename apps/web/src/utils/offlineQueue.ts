/**
 * Cola offline (RF-10): guardar cambios cuando no hay red y sincronizar al volver.
 * Formato compatible con ADR-0002 (export/import).
 * RF-11: exportar cola a JSON para descarga.
 */

const STORAGE_KEY = 'offlineQueue';

export interface OfflineQueueItem {
  id: string;
  op: 'PATCH_TECH_DETAILS' | 'PATCH_STATUS';
  workOrderId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineQueueItem[];
  } catch {
    return [];
  }
}

export function pushToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp'>): void {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  queue.push(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function setOfflineQueue(queue: OfflineQueueItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function removeOfflineQueueItem(id: string): void {
  const queue = getOfflineQueue().filter((i) => i.id !== id);
  setOfflineQueue(queue);
}

// --- RF-11: Exportar cola offline a JSON (formato SyncImportRequest para RF-12) ---

const DEVICE_ID_KEY = 'offline_export_device_id';
const APP_VERSION = '1.0.0';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getCreatedBy(): string {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'offline-user';
    const user = JSON.parse(raw) as { email?: string; id?: string };
    return user.email ?? user.id ?? 'offline-user';
  } catch {
    return 'offline-user';
  }
}

/** Convierte la cola offline al formato esperado por POST /sync/import (SyncImportRequest). */
export function buildOfflineExportPayload(): { meta: object; operations: object[] } {
  const queue = getOfflineQueue();
  const operations = queue.map((item) => {
    const operation = item.op === 'PATCH_STATUS' ? 'CHANGE_STATUS' : 'ADD_NOTE';
    const baseVersion = typeof item.payload?.baseVersion === 'number' ? item.payload.baseVersion : 0;
    return {
      opId: item.id,
      entityType: 'workOrder' as const,
      entityId: item.workOrderId,
      operation,
      payload: item.payload,
      createdAt: item.timestamp,
      createdBy: getCreatedBy(),
      baseVersion,
      correlationId: item.id,
    };
  });
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      deviceId: getOrCreateDeviceId(),
      appVersion: APP_VERSION,
    },
    operations,
  };
}

/** Descarga la cola offline como archivo JSON (RF-11). */
export function downloadOfflineExport(): void {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;
  const payload = buildOfflineExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const name = `offline-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}