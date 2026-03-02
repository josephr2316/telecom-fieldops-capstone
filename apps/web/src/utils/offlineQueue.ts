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

/** RF-11: Export offline queue to JSON (ADR-0002 format: metadata + items). */
export function exportOfflineQueueToJson(): string {
  const queue = getOfflineQueue();
  const payload = {
    meta: {
      deviceId: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 64) : 'unknown',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0',
    },
    items: queue.map((item) => ({
      tipo: item.op,
      entidad: 'WORK_ORDER',
      workOrderId: item.workOrderId,
      operacion: item.op,
      payload: item.payload,
      timestamp: item.timestamp,
      id: item.id,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/** Trigger download of offline queue as a .json file. */
export function downloadOfflineQueueAsJson(): void {
  const json = exportOfflineQueueToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offline-queue-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
