import Foundation

/// Service for Shifts API operations based on Memory Bank API specification
actor ShiftsService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Shifts

    /// POST /shifts/open - Открыть смену
    func openShift(planId: Int) async throws -> CurrentShift {
        let request = ShiftOpenRequest(planId: planId)
        return try await apiClient.post(path: "/shifts/open", body: request)
    }

    /// POST /shifts/close - Закрыть смену
    func closeShift(planId: Int, force: Bool = false) async throws -> CurrentShift {
        let request = ShiftCloseRequest(planId: planId, force: force)
        return try await apiClient.post(path: "/shifts/close", body: request)
    }

    /// GET /shifts/current - Получить текущую смену
    ///
    /// Может вернуть:
    /// - Смену из shifts_fact (OPENED или CLOSED)
    /// - Смену из shifts_plan (NEW)
    /// - nil (если нет смен)
    ///
    /// - Parameter assignmentId: ID назначения для синхронизации с LAMA
    func getCurrentShift(assignmentId: Int? = nil) async throws -> CurrentShift? {
        var queryItems: [URLQueryItem] = []
        if let assignmentId = assignmentId {
            queryItems.append(URLQueryItem(name: "assignment_id", value: String(assignmentId)))
        }
        return try await apiClient.get(path: "/shifts/current", queryItems: queryItems)
    }

    /// GET /shifts/{id} - Получить смену по ID
    func getShift(id: Int) async throws -> CurrentShift {
        return try await apiClient.get(path: "/shifts/\(id)")
    }

    // MARK: - Stores

    /// GET /shifts/stores - Получить список всех магазинов
    func getStores() async throws -> [ShiftStore] {
        let response: StoresListResponse = try await apiClient.get(path: "/shifts/stores")
        return response.stores
    }

    /// POST /shifts/stores - Создать магазин
    func createStore(name: String, address: String?) async throws -> ShiftStore {
        let request = StoreCreateRequest(name: name, address: address)
        return try await apiClient.post(path: "/shifts/stores", body: request)
    }

    /// GET /shifts/stores/{id} - Получить магазин по ID
    func getStore(id: Int) async throws -> ShiftStore {
        return try await apiClient.get(path: "/shifts/stores/\(id)")
    }

    /// PATCH /shifts/stores/{id} - Обновить магазин
    func updateStore(id: Int, name: String?, address: String?) async throws -> ShiftStore {
        let request = StoreUpdateRequest(name: name, address: address)
        return try await apiClient.patch(path: "/shifts/stores/\(id)", body: request)
    }
}
