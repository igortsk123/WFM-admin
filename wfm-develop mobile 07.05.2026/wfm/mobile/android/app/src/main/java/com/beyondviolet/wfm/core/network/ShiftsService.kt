package com.beyondviolet.wfm.core.network

import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.ShiftCloseRequest
import com.beyondviolet.wfm.core.models.ShiftOpenRequest
import com.beyondviolet.wfm.core.models.ShiftStore
import com.beyondviolet.wfm.core.models.StoreCreateRequest
import com.beyondviolet.wfm.core.models.StoreUpdateRequest
import com.beyondviolet.wfm.core.models.StoresListResponse

/**
 * Service for Shifts API operations based on Memory Bank API specification
 */
class ShiftsService(private val apiClient: ApiClient) {

    // MARK: - Shifts

    /**
     * POST /shifts/open - Открыть смену
     */
    suspend fun openShift(planId: Int): ApiResponse<CurrentShift> {
        val request = ShiftOpenRequest(planId = planId)
        return apiClient.post("/shifts/open", request)
    }

    /**
     * POST /shifts/close - Закрыть смену
     */
    suspend fun closeShift(planId: Int, force: Boolean = false): ApiResponse<CurrentShift> {
        val request = ShiftCloseRequest(planId = planId, force = force)
        return apiClient.post("/shifts/close", request)
    }

    /**
     * GET /shifts/current - Получить текущую смену
     *
     * Может вернуть:
     * - Смену из shifts_fact (OPENED или CLOSED)
     * - Смену из shifts_plan (NEW)
     * - null (если нет смен)
     *
     * @param assignmentId ID назначения для синхронизации с LAMA
     */
    suspend fun getCurrentShift(assignmentId: Int? = null): ApiResponse<CurrentShift?> {
        val queryParams = buildMap {
            assignmentId?.let { put("assignment_id", it.toString()) }
        }
        return apiClient.get("/shifts/current", queryParams)
    }

    /**
     * GET /shifts/{id} - Получить смену по ID
     */
    suspend fun getShift(id: Int): ApiResponse<CurrentShift> {
        return apiClient.getDirect("/shifts/$id")
    }

    // MARK: - Stores

    /**
     * GET /shifts/stores - Получить список всех магазинов
     */
    suspend fun getStores(): ApiResponse<StoresListResponse> {
        return apiClient.getDirect("/shifts/stores")
    }

    /**
     * POST /shifts/stores - Создать магазин
     */
    suspend fun createStore(name: String, address: String?): ApiResponse<ShiftStore> {
        val request = StoreCreateRequest(name = name, address = address)
        return apiClient.postDirect("/shifts/stores", request)
    }

    /**
     * GET /shifts/stores/{id} - Получить магазин по ID
     */
    suspend fun getStore(id: Int): ApiResponse<ShiftStore> {
        return apiClient.getDirect("/shifts/stores/$id")
    }

    /**
     * PATCH /shifts/stores/{id} - Обновить магазин
     */
    suspend fun updateStore(id: Int, name: String?, address: String?): ApiResponse<ShiftStore> {
        val request = StoreUpdateRequest(name = name, address = address)
        return apiClient.patchDirect("/shifts/stores/$id", request)
    }
}
