import Foundation
import Combine
import WFMUI

/// ViewModel для экрана "Контроль задач" менеджера
@MainActor
class ManagerTasksListViewModel: ObservableObject {
    @Published var isRefreshing = false
    @Published var selectedSegmentIndex = 0 // 0 = "Проверить", 1 = "Принятые"
    @Published var tasks: [Task] = [] // Список задач
    @Published var filterGroups: [TaskFilterGroup] = [] // Группы фильтров (тип работ, сотрудники, зоны)
    @Published var showFilters = false // Показать BottomSheet фильтров
    @Published var errorMessage: String? = nil // Сообщение об ошибке (если произошла ошибка загрузки)

    private let userManager: UserManager
    private let tasksService: TasksService
    private let toastManager: ToastManager
    private let analyticsService: AnalyticsService
    private(set) var taskFilterIndices: [[Int]] = [] // Маска фильтров всех доступных задач (только v2)
    private var availableFilters: [FilterGroup] = [] // Все доступные фильтры

    // Tasks для отмены конкурирующих запросов
    private var loadFiltersTask: _Concurrency.Task<Void, Never>?
    private var loadTasksTask: _Concurrency.Task<Void, Never>?

    init(userManager: UserManager, tasksService: TasksService, toastManager: ToastManager, analyticsService: AnalyticsService) {
        self.userManager = userManager
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.analyticsService = analyticsService

        _Concurrency.Task {
            await loadFilters()
            await loadTasks()
            analyticsService.track(.managerTasksViewed)
        }
    }

    /// Изменить выбранный сегмент
    func onSegmentChanged(_ index: Int) {
        selectedSegmentIndex = index
        _Concurrency.Task {
            await loadTasks()
        }
    }

    /// Открыть BottomSheet фильтров
    func openFilters() {
        showFilters = true
    }

    /// Закрыть BottomSheet фильтров
    func closeFilters() {
        showFilters = false
    }

    /// Есть ли активные фильтры (хотя бы один фильтр выбран)
    var hasActiveFilters: Bool {
        filterGroups.contains { group in
            group.items.contains { $0.isSelected }
        }
    }

    /// Применить фильтры (тип работ, сотрудники, зоны)
    func applyFilters(_ updatedFilterGroups: [TaskFilterGroup]) {
        filterGroups = updatedFilterGroups
        recomputeEnabledState()
        _Concurrency.Task {
            await loadTasks()
        }
    }

    /// Загрузить фильтры (тип работ, сотрудники, зоны) для текущего магазина
    func loadFilters() async {
        loadFiltersTask?.cancel()

        guard let assignmentId = userManager.currentAssignment?.id else { return }

        // Сохраняем текущие выбранные элементы перед обновлением
        let currentSelections: [String: Set<String>] = Dictionary(
            uniqueKeysWithValues: filterGroups.map { group in
                (group.id, Set(group.items.filter { $0.isSelected }.map { $0.id }))
            }
        )

        let stream = tasksService.getTaskListFiltersV2(assignmentId: assignmentId)

        loadFiltersTask = _Concurrency.Task {
            for await result in stream {
                switch result {
                case .cached(let filtersData), .fresh(let filtersData):
                    availableFilters = filtersData.filters
                    taskFilterIndices = filtersData.taskFilterIndices

                    // Создаём список для UI с восстановлением выбранных элементов
                    filterGroups = availableFilters.map { group in
                        TaskFilterGroup(
                            id: group.id,
                            title: group.title,
                            items: group.array.map { item in
                                let itemId = String(item.id)
                                let wasSelected = currentSelections[group.id]?.contains(itemId) ?? false
                                return TaskFilterItem(
                                    id: itemId,
                                    title: item.title,
                                    isSelected: wasSelected
                                )
                            }
                        )
                    }
                    recomputeEnabledState()

                case .error(let error):
                    if filterGroups.isEmpty {
                        filterGroups = []
                    } else if error.shouldShowToUser {
                        toastManager.show(message: error.localizedDescription, state: .error)
                    }
                }
            }
        }

        await loadFiltersTask?.value
    }

    private func recomputeEnabledState() {
        filterGroups = recomputeFilterEnabledState(
            filterGroups: filterGroups,
            taskFilterIndices: taskFilterIndices
        )
    }

    /// Загрузить задачи в зависимости от выбранного таба
    func loadTasks() async {
        loadTasksTask?.cancel()

        guard let assignmentId = userManager.currentAssignment?.id else { return }

        // Формируем динамические фильтры из всех групп (включая assignee_ids для сотрудников)
        var filters: [String: [Int]] = [:]
        for group in filterGroups {
            let selectedItems = group.items.filter { $0.isSelected }
            if !selectedItems.isEmpty {
                let itemIds = selectedItems.compactMap { Int($0.id) }
                if !itemIds.isEmpty {
                    filters[group.id] = itemIds
                }
            }
        }

        let stream: AsyncStream<CachedResult<[Task]>>

        if selectedSegmentIndex == 0 {
            // Таб "Проверить": reviewState = ON_REVIEW
            stream = tasksService.getTasksListV2(
                assignmentId: assignmentId,
                reviewState: .onReview,
                filters: filters.isEmpty ? nil : filters
            )
        } else {
            // Таб "Принятые": reviewState = ACCEPTED + state = COMPLETED
            stream = tasksService.getTasksListV2(
                assignmentId: assignmentId,
                state: .completed,
                reviewState: .accepted,
                filters: filters.isEmpty ? nil : filters
            )
        }

        loadTasksTask = _Concurrency.Task {
            for await result in stream {
                switch result {
                case .cached(let loadedTasks):
                    tasks = loadedTasks
                    errorMessage = nil

                case .fresh(let loadedTasks):
                    tasks = loadedTasks
                    errorMessage = nil

                case .error(let error):
                    if tasks.isEmpty {
                        tasks = []
                        errorMessage = error.localizedDescription
                    } else {
                        if error.shouldShowToUser {
                            toastManager.show(message: error.localizedDescription, state: .error)
                        }
                    }
                }
            }
        }

        await loadTasksTask?.value
    }

    /// Обновить данные (pull-to-refresh)
    func refresh() async {
        isRefreshing = true
        await loadFilters()
        await loadTasks()
        isRefreshing = false
    }
}
