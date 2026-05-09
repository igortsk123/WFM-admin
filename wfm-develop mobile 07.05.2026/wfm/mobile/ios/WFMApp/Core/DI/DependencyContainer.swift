import Foundation
import WFMAuth
import WFMUI
import Semetrics

/// Lightweight dependency injection container
@MainActor
class DependencyContainer: ObservableObject {
    static let shared = DependencyContainer()

    let configuration: AppConfiguration
    let apiClient: APIClient
    let tasksService: TasksService
    let userService: UserService
    let shiftsService: ShiftsService
    let userManager: UserManager
    let toastManager: ToastManager
    let bottomSheetManager: BottomSheetManager
    let impersonationStorage: ImpersonationStorage
    let analyticsService: AnalyticsService
    let crashlyticsService: CrashlyticsService
    let notificationsWebSocketService: NotificationsWebSocketService
    let notificationsAPIService: NotificationsAPIService

    // Auth модуль (инкапсулирован в своем контейнере)
    let authContainer: AuthDependencyContainer

    // ViewModels для главных экранов (синглтоны для предотвращения пересоздания)
    private(set) lazy var homeViewModelWorker: HomeViewModel = {
        HomeViewModel(
            role: .worker,
            userManager: userManager,
            tasksService: tasksService,
            toastManager: toastManager,
            analyticsService: analyticsService
        )
    }()

    private(set) lazy var homeViewModelManager: HomeViewModel = {
        HomeViewModel(
            role: .manager,
            userManager: userManager,
            tasksService: tasksService,
            toastManager: toastManager,
            analyticsService: analyticsService
        )
    }()

    private(set) lazy var tasksListViewModel: TasksListViewModel = {
        TasksListViewModel(
            tasksService: tasksService,
            userManager: userManager,
            toastManager: toastManager,
            analyticsService: analyticsService
        )
    }()

    private(set) lazy var managerTasksListViewModel: ManagerTasksListViewModel = {
        ManagerTasksListViewModel(
            userManager: userManager,
            tasksService: tasksService,
            toastManager: toastManager,
            analyticsService: analyticsService
        )
    }()

    //DEV#@ //вум№"
    private init(configuration: AppConfiguration = .default) {
        self.configuration = configuration

        // Semetrics инициализируется до создания SemetricsAnalyticsService
        SemetricsClient.configure(
            apiKey: configuration.semetricsApiKey,
            endpoint: configuration.semetricsEndpoint
        )

        // ToastManager создаётся первым — передаётся в Auth модуль
        self.toastManager = ToastManager()

        self.analyticsService = CompositeAnalyticsService(services: [
            FirebaseAnalyticsService(),
            SemetricsAnalyticsService()
        ])

        // Crashlytics для логирования ошибок
        self.crashlyticsService = CrashlyticsService.shared

        // BottomSheetManager для глобального управления BottomSheet
        self.bottomSheetManager = BottomSheetManager()

        // Auth контейнер получает тот же экземпляр ToastManager
        self.authContainer = AuthDependencyContainer(toastManager: toastManager)

        // Пробрасываем аналитику в Auth модуль через callback
        self.authContainer.analyticsCallback = { [analyticsService] eventName in
            switch eventName {
            case "phone_input_viewed": analyticsService.track(.phoneInputViewed)
            case "phone_submitted":    analyticsService.track(.phoneSubmitted)
            case "code_input_viewed":  analyticsService.track(.codeInputViewed)
            case "code_submitted":     analyticsService.track(.codeSubmitted)
            default: break
            }
        }

        self.impersonationStorage = ImpersonationStorage()
        self.apiClient = APIClient(baseURL: configuration.apiBaseURL, impersonationStorage: impersonationStorage, analyticsService: analyticsService)
        self.tasksService = TasksService(apiClient: apiClient)
        self.userService = UserService(apiClient: apiClient)
        self.shiftsService = ShiftsService(apiClient: apiClient)
        self.userManager = UserManager(
            userService: userService,
            shiftsService: shiftsService,
            tokenStorage: authContainer.tokenStorage
        )

        // storeIdProvider устанавливается после создания userManager
        // nonisolated(unsafe) — доступ без await, безопасен т.к. пишем до первых запросов
        let userManagerRef = userManager
        apiClient.storeIdProvider = { [weak userManagerRef] in
            userManagerRef?.currentAssignment?.store?.id.description
        }

        self.notificationsWebSocketService = NotificationsWebSocketService(
            tokenStorage: authContainer.tokenStorage,
            baseURL: configuration.apiBaseURL
        )
        self.notificationsAPIService = NotificationsAPIService(apiClient: apiClient)
    }

    /// Получить TokenStorage из Auth модуля
    var tokenStorage: TokenStorage {
        authContainer.tokenStorage
    }

    /// Create tasks list view model
    func makeTasksListViewModel() -> TasksListViewModel {
        return TasksListViewModel(tasksService: tasksService, userManager: userManager, toastManager: toastManager, analyticsService: analyticsService)
    }

    /// Create task detail view model
    func makeTaskDetailViewModel(task: Task, router: AppRouter) -> TaskDetailViewModel {
        return TaskDetailViewModel(
            task: task,
            tasksService: tasksService,
            toastManager: toastManager,
            bottomSheetManager: bottomSheetManager,
            analyticsService: analyticsService,
            router: router
        )
    }

    /// Create create task view model
    func makeCreateTaskViewModel() -> CreateTaskViewModel {
        return CreateTaskViewModel(tasksService: tasksService, toastManager: toastManager, analyticsService: analyticsService)
    }

    /// Create home view model with specified role
    func makeHomeViewModel(role: HomeUserRole) -> HomeViewModel {
        return HomeViewModel(
            role: role,
            userManager: userManager,
            tasksService: role == .manager ? tasksService : nil,
            toastManager: toastManager,
            analyticsService: analyticsService
        )
    }

    /// Create manager tasks list view model
    func makeManagerTasksListViewModel() -> ManagerTasksListViewModel {
        return ManagerTasksListViewModel(userManager: userManager, tasksService: tasksService, toastManager: toastManager, analyticsService: analyticsService)
    }

    /// Create settings view model
    func makeSettingsViewModel() -> SettingsViewModel {
        return SettingsViewModel(
            userManager: userManager,
            toastManager: toastManager,
            tokenStorage: tokenStorage,
            impersonationStorage: impersonationStorage,
            analyticsService: analyticsService,
            userService: userService
        )
    }

    /// Create notifications list view model
    func makeNotificationsListViewModel() -> NotificationsListViewModel {
        return NotificationsListViewModel(
            notificationsAPIService: notificationsAPIService,
            toastManager: toastManager
        )
    }
}
