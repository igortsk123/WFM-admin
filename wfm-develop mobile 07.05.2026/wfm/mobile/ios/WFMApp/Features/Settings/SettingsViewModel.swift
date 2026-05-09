import Foundation
import WFMAuth
import WFMUI

/// ViewModel для экрана настроек (профиля пользователя)
///
/// Управляет состоянием профиля:
/// - Данные текущего пользователя (ФИО, фото, должность)
/// - Загрузка данных
/// - Обновление данных (Pull-to-Refresh)
/// - Выход из аккаунта (logout)
/// - Переключение между назначениями
/// - Режим «Войти как» (impersonation, только для разработчиков с flags.dev в JWT)
@MainActor
final class SettingsViewModel: ObservableObject {
    // MARK: - Published State

    /// Текущий пользователь
    @Published private(set) var currentUser: UserMe?

    /// Текущий выбранный assignment
    @Published private(set) var currentAssignment: Assignment?

    /// Текущая смена
    @Published private(set) var currentShift: CurrentShift?

    /// Есть ли у текущего пользователя флаг flags.dev в JWT
    @Published private(set) var isDevUser: Bool = false

    /// Активный номер телефона для impersonation (nil — режим выключен)
    @Published private(set) var impersonationPhone: String?

    /// Флаг загрузки данных (для предотвращения дублирующих запросов)
    @Published private var isRefreshing = false

    // MARK: - Dependencies

    private let userManager: UserManager
    private let toastManager: ToastManager
    private let tokenStorage: TokenStorage
    private let impersonationStorage: ImpersonationStorage
    private let analyticsService: AnalyticsService
    private let userService: UserService

    // Task для отмены предыдущих запросов
    private var loadUserTask: _Concurrency.Task<Void, Never>?
    // MARK: - Initialization

    init(
        userManager: UserManager,
        toastManager: ToastManager,
        tokenStorage: TokenStorage,
        impersonationStorage: ImpersonationStorage,
        analyticsService: AnalyticsService,
        userService: UserService
    ) {
        self.userManager = userManager
        self.toastManager = toastManager
        self.tokenStorage = tokenStorage
        self.impersonationStorage = impersonationStorage
        self.analyticsService = analyticsService
        self.userService = userService
        self.impersonationPhone = impersonationStorage.phone

        // Подписываемся на изменения пользователя, assignment и смены
        _Concurrency.Task {
            for await user in userManager.$currentUser.values {
                currentUser = user
            }
        }

        _Concurrency.Task {
            for await assignment in userManager.$currentAssignment.values {
                currentAssignment = assignment
            }
        }

        _Concurrency.Task {
            for await shift in userManager.$currentShift.values {
                currentShift = shift
            }
        }

        // Проверяем флаг dev в текущем токене
        _Concurrency.Task {
            if let token = try? await tokenStorage.getAccessToken() {
                isDevUser = impersonationStorage.isDevUser(accessToken: token)
            }
        }
    }

    // MARK: - Computed Properties

    /// Показывать ли кнопку "Назначения"
    var shouldShowAssignmentsButton: Bool {
        guard let user = currentUser else { return false }
        return user.assignments.count > 1
    }

    /// Можно ли переключаться между назначениями (смена должна быть не открыта)
    var canSwitchAssignments: Bool {
        currentShift?.status != .opened
    }

    // MARK: - Public Methods

    /// Вызывается при появлении экрана
    ///
    /// Использует HTTP кэширование: сначала показывает кэшированные данные, потом обновляет свежими.
    func loadUser() async {
        // Отменяем предыдущую загрузку
        loadUserTask?.cancel()

        isRefreshing = true
        analyticsService.track(.settingsViewed)

        loadUserTask = _Concurrency.Task {
            await userManager.refresh()

            if let error = userManager.error {
                if currentUser == nil {
                    toastManager.show(message: error, state: .error)
                }
            }
        }

        await loadUserTask?.value
        isRefreshing = false
    }

    /// Обновить данные пользователя (Pull-to-Refresh)
    func refresh() async {
        await loadUser()
    }

    /// Переключить текущий assignment
    ///
    /// Сохраняет выбранный assignment ID и перезагружает данные
    func switchAssignment(assignmentId: Int) async {
        await userManager.switchAssignment(assignmentId: assignmentId)
    }

    /// Задать номер телефона для impersonation («Войти как»).
    ///
    /// Пустая строка или nil — сбрасывает режим impersonation.
    func setImpersonationPhone(_ phone: String?) {
        impersonationStorage.phone = phone?.isEmpty == false ? phone : nil
        impersonationPhone = impersonationStorage.phone
    }

    /// Удалить учётную запись текущего пользователя
    ///
    /// Вызывает svc_users DELETE /users/me → Beyond Violet Shopping API.
    /// После успешного вызова навигация к экрану авторизации через AppRouter.logout().
    func deleteAccount() async throws {
        try await userService.deleteAccount()
    }

    /// Выход из аккаунта
    ///
    /// Очищает данные пользователя.
    /// Навигация к экрану авторизации выполняется в UI через AppRouter.
    func logout() async {
        analyticsService.track(.logoutTapped)
        analyticsService.resetUser()
        impersonationStorage.phone = nil // Очищаем режим "Войти как"
        await userManager.clear()
    }
}
