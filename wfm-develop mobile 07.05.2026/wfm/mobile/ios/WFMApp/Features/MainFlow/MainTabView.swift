import SwiftUI
import WFMAuth
import WFMUI

// MARK: - MainTabView

/// Главный экран с нижней навигацией (Tab Bar)
///
/// Табы:
/// 1. Главная — профиль пользователя
/// 2. Задачи — основной функционал
/// 3. Профиль — профиль пользователя, выход
///
/// Стартовый таб — Задачи (индекс 1)
struct MainTabView: View {
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
                    HomeView(viewModel: container.homeViewModelWorker)
                case .tasks:
                    tasksFlowView
                case .control:
                    EmptyView() // Работник не имеет доступа к Control
                case .settings:
                    SettingsView(viewModel: container.makeSettingsViewModel())
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(colors.surfaceBase)
            .environment(\.openShift, { selectedTab = .home })
            .environment(\.switchToTasksTab, {
                print("📍 Environment: Switching to tasks tab")
                selectedTab = .tasks
            })
            .onPreferenceChange(HideTabBarPreferenceKey.self) { hide in
                hideTabBar = hide
            }
            // Padding снизу чтобы контент не перекрывался TabBar
            .padding(.bottom, shouldHideTabBar ? 0 : 80)

            // Кастомный TabBar поверх контента
            if !shouldHideTabBar {
                CustomTabBar(selectedTab: $selectedTab, tabs: MainTab.workerTabs)
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
    MainTabView()
        .environmentObject(container)
        .environmentObject(AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
}
