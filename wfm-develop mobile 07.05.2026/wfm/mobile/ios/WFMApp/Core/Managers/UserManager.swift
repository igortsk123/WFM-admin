import Foundation
import WFMAuth
import os.log

/// Менеджер для управления данными текущего пользователя
///
/// Хранит состояние пользователя (роль, магазин, привилегии, профиль) и предоставляет методы для загрузки.
/// Используется для условной навигации и отображения UI в зависимости от роли.
/// Управляет выбранным assignment для работы с несколькими назначениями.
///
/// Согласно Memory Bank (.memory_bank/mobile/user_manager.md):
/// - Загружает данные пользователя с сервера при старте приложения
/// - Хранит данные в @Published свойствах для реактивности SwiftUI
/// - Предоставляет методы для проверки роли (isManager/isWorker)
/// - Очищает состояние при logout
@MainActor
final class UserManager: ObservableObject {
    // MARK: - Published State

    /// Текущий пользователь (nil если не загружен)
    /// Включает роль, магазин, привилегии, профиль (ФИО, email, телефон, фото)
    @Published private(set) var currentUser: UserMe?

    /// Текущий выбранный assignment
    @Published private(set) var currentAssignment: Assignment?

    /// Текущая смена (nil если не загружена или нет активной смены)
    @Published private(set) var currentShift: CurrentShift?

    /// Индикатор загрузки данных
    @Published private(set) var isLoading = false

    /// Сообщение об ошибке (если загрузка не удалась)
    @Published private(set) var error: String?

    /// Роль не назначена (получен notFound от сервера)
    @Published private(set) var roleNotAssigned = false

    // MARK: - Dependencies

    private let userService: UserService
    private let shiftsService: ShiftsService
    private let tokenStorage: TokenStorage
    private let logger = Logger(subsystem: "com.wfm", category: "UserManager")

    // MARK: - Initialization

    init(userService: UserService, shiftsService: ShiftsService, tokenStorage: TokenStorage) {
        self.userService = userService
        self.shiftsService = shiftsService
        self.tokenStorage = tokenStorage
    }

    // MARK: - Public Methods

    /// Получить текущий выбранный assignment
    ///
    /// Логика выбора:
    /// 1. Если есть сохраненный selectedAssignmentId - ищем его в списке
    /// 2. Если не найден или не сохранен - берем первый assignment
    /// 3. Если assignments пустой - возвращаем nil
    private func selectCurrentAssignment(user: UserMe) async -> Assignment? {
        guard !user.assignments.isEmpty else {
            return nil
        }

        // Проверяем сохраненный assignment ID
        let savedAssignmentId = await tokenStorage.getSelectedAssignmentId()

        // Ищем сохраненный assignment в списке
        let selectedAssignment: Assignment?
        if let savedAssignmentId = savedAssignmentId {
            selectedAssignment = user.assignments.first { $0.id == savedAssignmentId }
        } else {
            selectedAssignment = nil
        }

        // Если не найден - берем первый
        let assignment = selectedAssignment ?? user.assignments.first!

        // Сохраняем выбранный assignment ID
        await tokenStorage.saveSelectedAssignmentId(assignment.id)

        return assignment
    }

    /// Загрузить данные текущего пользователя и текущую смену
    ///
    /// Вызывается при старте приложения после авторизации.
    /// При успехе сохраняет данные пользователя в currentUser и смену в currentShift.
    ///
    /// Логика выбора assignment:
    /// 1. Если есть сохраненный selectedAssignmentId - используем его
    /// 2. Если не найден или не сохранен - берем первый assignment
    /// 3. Если assignments пустой - возвращаем ошибку "Нет назначений"
    func loadCurrentRole() async {
        logger.info("Loading current user data and shift...")
        isLoading = true
        error = nil
        roleNotAssigned = false

        do {
            // Загружаем данные пользователя
            let user = try await userService.getMe()

            // Проверяем наличие assignments
            guard !user.assignments.isEmpty else {
                self.error = "У вас нет назначений. Обратитесь к управляющему."
                currentUser = user
                isLoading = false
                return
            }

            // Выбираем текущий assignment
            guard let currentAssignment = await selectCurrentAssignment(user: user) else {
                self.error = "Не удалось определить текущее назначение"
                currentUser = user
                isLoading = false
                return
            }

            currentUser = user
            self.currentAssignment = currentAssignment
            self.error = nil
            roleNotAssigned = false

            let roleName = currentAssignment.position?.role?.name ?? "Роль не назначена"
            logger.info("User data loaded: \(roleName) from assignment #\(currentAssignment.id)")

            // Загружаем текущую смену (не критично если не удалось)
            do {
                let shift = try await shiftsService.getCurrentShift(assignmentId: currentAssignment.id)
                currentShift = shift
                if let shift = shift {
                    logger.info("Current shift loaded: \(shift.status.rawValue)")
                } else {
                    logger.info("No current shift")
                }
            } catch {
                logger.warning("Failed to load current shift: \(error.localizedDescription)")
                // Не показываем ошибку пользователю, т.к. это не критично
            }
        } catch let loadError {
            // Если NOT_FOUND - роль просто не назначена
            if let serverError = loadError as? ServerResponseError, serverError.isError(.notFound) {
                logger.info("Role not assigned")
                roleNotAssigned = true
                self.error = nil
            } else {
                self.error = mapError(loadError)
                logger.error("Failed to load user data: \(loadError.localizedDescription)")
            }
        }

        isLoading = false
    }

    /// Проверить, является ли текущий пользователь управляющим
    func isManager() -> Bool {
        currentAssignment?.position?.role?.code == "manager"
    }

    /// Проверить, является ли текущий пользователь работником
    func isWorker() -> Bool {
        currentAssignment?.position?.role?.code == "worker"
    }

    /// Проверить, загружены ли данные пользователя
    var hasRole: Bool {
        currentUser != nil
    }

    /// Переключить текущий assignment
    ///
    /// Сохраняет выбранный assignment ID и перезагружает данные пользователя и смену
    func switchAssignment(assignmentId: Int) async {
        await tokenStorage.saveSelectedAssignmentId(assignmentId)
        await loadCurrentRole()
    }

    /// Получить текущий выбранный assignment
    func getCurrentAssignment() async -> Assignment? {
        guard let user = currentUser else { return nil }
        let savedAssignmentId = await tokenStorage.getSelectedAssignmentId()

        if let savedId = savedAssignmentId,
           let assignment = user.assignments.first(where: { $0.id == savedId }) {
            return assignment
        }

        return user.assignments.first
    }

    /// Очистить состояние пользователя (при logout)
    func clear() async {
        logger.info("Clearing user state")
        currentUser = nil
        currentAssignment = nil
        currentShift = nil
        error = nil
        roleNotAssigned = false
        isLoading = false
        await tokenStorage.clearSelectedAssignmentId()
    }

    /// Обновить данные пользователя (перезагрузить с сервера)
    func refresh() async {
        await loadCurrentRole()
    }

    /// Проверить и обновить текущую смену
    ///
    /// Загружает текущую смену через shiftsService и сохраняет в currentShift.
    /// Не критично если смена не загружается — ошибка логируется, но не показывается пользователю.
    func checkShiftStatus() async {
        do {
            let assignmentId = await getCurrentAssignment()?.id
            let shift = try await shiftsService.getCurrentShift(assignmentId: assignmentId)
            currentShift = shift
        } catch {
            logger.warning("Failed to check shift status: \(error.localizedDescription)")
            // Не показываем ошибку пользователю, т.к. это не критично
        }
    }

    /// Открыть смену
    ///
    /// При успехе обновляет currentShift.
    /// Бросает ошибку при неудаче — обработка на стороне вызывающего кода.
    func openShift(planId: Int) async throws {
        let shift = try await shiftsService.openShift(planId: planId)
        currentShift = shift
    }

    /// Закрыть смену
    ///
    /// При успехе обновляет currentShift из ответа запроса закрытия.
    /// Бросает ошибку при неудаче — обработка на стороне вызывающего кода.
    func closeShift(planId: Int, force: Bool = false) async throws {
        let shift = try await shiftsService.closeShift(planId: planId, force: force)
        currentShift = shift
    }

    // MARK: - Private Helpers

    /// Преобразовать ошибку в пользовательское сообщение
    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            switch apiError {
            case .unauthorized:
                return "Требуется авторизация"
            case .serverError:
                return "Ошибка сервера"
            default:
                return "Не удалось загрузить данные пользователя"
            }
        }

        if (error as NSError).domain == NSURLErrorDomain {
            return "Проверьте подключение к интернету"
        }

        return error.localizedDescription
    }
}

// MARK: - Convenience Extensions

extension UserManager {
    /// Получить список типов привилегий текущего пользователя
    var permissions: [PermissionType] {
        currentUser?.permissions.map { $0.permission } ?? []
    }

    /// Проверить наличие конкретной привилегии у текущего пользователя
    func hasPermission(_ permission: PermissionType) -> Bool {
        currentUser?.hasPermission(permission) ?? false
    }

    /// Получить полное имя пользователя
    var fullName: String {
        currentUser?.fullName ?? "Пользователь"
    }
}
