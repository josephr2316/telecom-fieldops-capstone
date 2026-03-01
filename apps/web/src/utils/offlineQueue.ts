/**
 * Cola offline (RF-10): guardar cambios cuando no hay red y sincronizar al volver.
 * Formato compatible con ADR-0002 (export/import).
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
