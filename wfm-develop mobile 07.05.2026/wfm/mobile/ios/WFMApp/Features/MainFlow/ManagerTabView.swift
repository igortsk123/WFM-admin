import SwiftUI
import WFMAuth
import WFMUI

// MARK: - ManagerTabView

/// Главный экран с нижней навигацией для менеджера (Tab Bar)
///
/// Табы:
/// 1. Главная — профиль пользователя и время
/// 2. Задачи — список задач работника
/// 3. Контроль — контроль выполнения задач сотрудниками
/// 4. Профиль — профиль пользователя, выход
///
/// Стартовый таб — Главная (индекс 0)
struct ManagerTabView: View {
    @Environment(\.wfmColors) private var colors
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var container: DependencyContainer
    @State private var selectedTab: MainTab = .startTab
    @State private var hideTabBar = false
    @ObservedObject private var bottomSheetManager: BottomSheetManager

    /// Скрывать ли TabBar (при навигации внутри таба)
    private var shouldHideTabBar: Bool {
        !router.mainPath.isEmpty || hideTabBar
    }

    init() {
        _bottomSheetManager = ObservedObject(wrappedValue: DependencyContainer.shared.bottomSheetManager)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Контент текущего таба
            Group {
                switch selectedTab {
                case .home:
                    ManagerHomeView(
                        viewModel: container.homeViewModelManager,
                        tasksService: container.tasksService,
                        toastManager: container.toastManager,
                        analyticsService: container.analyticsService,
                        onShowAllTasks: {
                            selectedTab = .control
                        }
                    )
                case .tasks:
                    tasksFlowView
                case .control:
                    ManagerTasksListView(
                        viewModel: container.managerTasksListViewModel,
                        tasksService: container.tasksService,
                        toastManager: container.toastManager,
                        analyticsService: container.analyticsService
                    )
                case .settings:
                    SettingsView(viewModel: container.makeSettingsViewModel())
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(colors.surfaceBase)
            .environment(\.openShift, { selectedTab = .home })
            .environment(\.switchToTasksTab, {
                print("📍 Environment (Manager): Switching to tasks tab")
                selectedTab = .tasks
            })
            .environment(\.switchToControlTab, {
                print("📍 Environment (Manager): Switching to control tab")
                selectedTab = .control
            })
            .onPreferenceChange(HideTabBarPreferenceKey.self) { hide in
                hideTabBar = hide
            }
            // Padding снизу чтобы контент не перекрывался TabBar
            .padding(.bottom, shouldHideTabBar ? 0 : 80)

            // Кастомный TabBar поверх контента
            if !shouldHideTabBar {
                CustomTabBar(selectedTab: $selectedTab, tabs: MainTab.managerTabs)
                    .zIndex(1) // TabBar на уровне 1
            }
        }
        .background(colors.surfaceBase)
        .wfmBottomSheet(
            isPresented: $bottomSheetManager.isPresented,
            showOverlay: bottomSheetManager.showOverlay
        ) {
            if let content = bottomSheetManager.content {
                content
            }
        }
    }

    /// Контент таба "Задачи" с навигацией
    @ViewBuilder
    private var tasksFlowView: some View {
        NavigationStack(path: $router.mainPath) {
            TasksListView(viewModel: container.tasksListViewModel)
                .environmentObject(container.userManager)
                .navigationDestination(for: Route.self) { route in
                    destinationView(for: route)
                }
        }
    }

    @ViewBuilder
    private func destinationView(for route: Route) -> some View {
        switch route {
        case .taskDetail(let taskId):
            let task = findTask(by: taskId)
            TaskDetailView(
                viewModel: container.makeTaskDetailViewModel(task: task, router: router)
            )

        case .createTask:
            CreateTaskView(
                viewModel: container.makeCreateTaskViewModel()
            )

        default:
            EmptyView()
        }
    }

    /// Поиск задачи по ID в загруженном списке или создание заглушки
    private func findTask(by id: String) -> Task {
        let uuid = UUID(uuidString: id) ?? UUID()

        if let task = container.tasksListViewModel.tasks.first(where: { $0.id == uuid }) {
            return task
        }

        return Task(
            id: uuid,
            title: "Загрузка...",
            description: "Загрузка данных задачи...",
            plannedMinutes: 0,
            creatorId: nil,
            assigneeId: nil,
            state: .new,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
}

#Preview {
    let container = DependencyContainer.shared
    ManagerTabView()
        .environmentObject(container)
        .environmentObject(AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
}
