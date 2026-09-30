// Hermes — Gestor de Cola de Escrituras sin Conexión (Offline Queue)
// Diseñado para gimnasio, sótano o desconexiones temporales en móvil.

const QUEUE_KEY = 'hermes_offline_sync_queue_v1';

export interface OfflineAction {
  id: string;
  type: 'guardar_entrenamiento' | 'marcar_tarea_hecha';
  payload: any;
  createdAt: number;
}

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OfflineQueue] Error leyendo cola:', e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] Error guardando cola:', e);
  }
}

export function enqueueOfflineAction(type: OfflineAction['type'], payload: any) {
  const queue = getOfflineQueue();
  // Evitar duplicados por payload id si aplica
  const action: OfflineAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    createdAt: Date.now(),
  };
  queue.push(action);
  saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Acción encolada (${type}):`, action.id);
  return action;
}

export function removeOfflineAction(actionId: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter((a) => a.id !== actionId);
  saveOfflineQueue(filtered);
}

export async function syncOfflineQueue(
  callbacks?: {
    onSyncWorkout?: (payload: any) => Promise<boolean>;
    onSyncTask?: (taskId: string) => Promise<boolean>;
    onSuccessToast?: (msg: string) => void;
  }
): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  console.log(`[OfflineQueue] Procesando ${queue.length} acciones pendientes...`);
  let synced = 0;

  for (const action of [...queue]) {
    try {
      if (action.type === 'guardar_entrenamiento' && callbacks?.onSyncWorkout) {
        const ok = await callbacks.onSyncWorkout(action.payload);
        if (ok) {
          removeOfflineAction(action.id);
          synced++;
        }
      } else if (action.type === 'marcar_tarea_hecha' && callbacks?.onSyncTask) {
        const ok = await callbacks.onSyncTask(action.payload.itemId);
        if (ok) {
          removeOfflineAction(action.id);
          synced++;
        }
      }
    } catch (err) {
      console.warn(`[OfflineQueue] Error sincronizando acción ${action.id}:`, err);
    }
  }

  if (synced > 0 && callbacks?.onSuccessToast) {
    callbacks.onSuccessToast(
      synced === 1
        ? '¡1 registro sin conexión sincronizado con éxito!'
        : `¡${synced} registros sin conexión sincronizados con éxito!`
    );
  }

  return synced;
}
