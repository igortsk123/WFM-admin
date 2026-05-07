/**
 * Operations API — backend wrappers для /operations/*.
 *
 * Backend называет это "operations" (шаги выполнения задачи),
 * admin исторически использует "subtasks" (см. lib/types/index.ts).
 * При интеграции consumer'ы могут адаптировать BackendOperation → admin Subtask.
 *
 * Backend endpoints:
 *   GET  /operations?work_type_id=X&zone_id=Y     — операции для пары (для UI выбора)
 *   GET  /operations/pending                       — модерация: все PENDING (только MANAGER)
 *   POST /operations/{id}/approve                  — модерация (только MANAGER)
 *   POST /operations/{id}/reject                   — модерация (только MANAGER)
 *
 * Создание новых операций — через POST /tasks/{id}/complete (massive multipart),
 * см. completeTaskOnBackend.newOperations в lib/api/tasks.ts.
 */

import { apiUrl } from "./_config";
import { backendGet, backendPost } from "./_client";
import type {
  BackendOperation,
  BackendOperationListData,
} from "./_backend-types";

/** GET /tasks/operations?work_type_id=X&zone_id=Y — список операций для пары. */
export async function getOperationsFromBackend(
  workTypeId: number,
  zoneId: number,
): Promise<BackendOperationListData> {
  return backendGet<BackendOperationListData>(
    apiUrl("tasks", `/operations?work_type_id=${workTypeId}&zone_id=${zoneId}`),
  );
}

/** GET /tasks/operations/pending — только PENDING операции (модерация). */
export async function getPendingOperationsFromBackend(): Promise<BackendOperationListData> {
  return backendGet<BackendOperationListData>(
    apiUrl("tasks", `/operations/pending`),
  );
}

/** POST /tasks/operations/{id}/approve — review_state → ACCEPTED. */
export async function approveOperationOnBackend(
  id: number,
): Promise<BackendOperation> {
  return backendPost<BackendOperation>(
    apiUrl("tasks", `/operations/${id}/approve`),
  );
}

/** POST /tasks/operations/{id}/reject — review_state → REJECTED. */
export async function rejectOperationOnBackend(
  id: number,
  reason?: string,
): Promise<BackendOperation> {
  return backendPost<BackendOperation>(
    apiUrl("tasks", `/operations/${id}/reject`),
    reason ? { reason } : undefined,
  );
}
