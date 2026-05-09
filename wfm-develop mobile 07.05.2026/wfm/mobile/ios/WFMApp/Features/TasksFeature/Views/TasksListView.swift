import SwiftUI
import WFMAuth
import WFMUI

/// Главный экран со списком задач
///
/// Навигация через router:
/// - Создать задачу → router.navigateToCreateTask()
/// - Открыть задачу → router.navigateToTaskDetail(taskId)
/// - Logout → router.logout()
struct TasksListView: View {
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var userManager: UserManager
    @ObservedObject var viewModel: TasksListViewModel
    @Environment(\.wfmColors) private var colors
    @Environment(\.openShift) private var openShift
    @Environment(\.switchToControlTab) private var switchToControlTab

    init(viewModel: TasksListViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        VStack(spacing: 0) {
            // Кастомный заголовок
            customHeader

            // Блок информации о смене (если смена открыта)
            if let currentShift = userManager.currentShift,
               currentShift.status.isActive {
                ShiftInfoBlock(shift: currentShift, tasks: viewModel.tasks)
                    .background(colors.surfaceSecondary)
            }

            // Список задач
            tasksList
        }
        .navigationBarHidden(true)
        .task {
            await viewModel.loadTasks()
        }
        .background(colors.surfaceBase)
    }

    /// Кастомный заголовок по дизайну Figma
    private var customHeader: some View {
        VStack(spacing: 0) {
            Text("Список задач")
                .wfmHeadline20Bold()
                .foregroundStyle(colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(WFMSpacing.l)
                .background(colors.surfaceSecondary)

            // Разделитель
            Rectangle()
                .fill(colors.borderSecondary)
                .frame(height: 1)
        }
    }

    /// Список задач
    @ViewBuilder
    private var tasksList: some View {
        // Показываем LOADING только если задачи загружаются и их еще нет
        let shouldShowLoading = viewModel.isLoading && viewModel.tasks.isEmpty && viewModel.errorMessage == nil
        let hasOpenShift = userManager.currentShift?.status.isActive ?? false

        if shouldShowLoading {
            ScrollView {
                VStack {
                    ProgressView()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(colors.surfaceBase)
            .refreshable {
                await viewModel.refresh()
            }
        } else if viewModel.errorMessage != nil {
            // Error state: данные не загрузились
            GeometryReader { geometry in
                ScrollView {
                    EmptyStateView(
                        title: "Данные не загрузились",
                        description: "Попробуйте проверить соединение или обновить страницу",
                        buttons: [
                            EmptyStateButton(
                                title: "Обновить",
                                style: .secondary,
                                action: {
                                    _Concurrency.Task {
                                        await viewModel.refresh()
                                    }
                                }
                            )
                        ]
                    )
                    .frame(width: geometry.size.width)
                    .frame(minHeight: geometry.size.height)
                }
                .background(colors.surfaceBase)
                .refreshable {
                    await viewModel.refresh()
                }
            }
        } else if !hasOpenShift {
            // Empty state: нет открытой смены
            let isManager = userManager.currentAssignment?.position?.role?.id == 2

            GeometryReader { geometry in
                ScrollView {
                    if isManager {
                        // Заглушка для менеджера
                        EmptyStateView(
                            title: "Смена не открыта",
                            description: "Задачи появятся, когда смена будет открыта. Сейчас доступна проверка сотрудников",
                            buttons: [
                                EmptyStateButton(
                                    title: "Проверить сотрудников",
                                    style: .link,
                                    action: switchToControlTab
                                ),
                                EmptyStateButton(
                                    title: "Открыть смену",
                                    style: .primary,
                                    action: openShift
                                )
                            ]
                        )
                        .frame(width: geometry.size.width)
                        .frame(minHeight: geometry.size.height)
                    } else {
                        // Заглушка для работника
                        EmptyStateView(
                            title: "Список задач будет доступен после открытия смены",
                            description: nil,
                            buttons: [
                                EmptyStateButton(
                                    title: "Открыть смену",
                                    style: .primary,
                                    action: openShift
                                )
                            ]
                        )
                        .frame(width: geometry.size.width)
                        .frame(minHeight: geometry.size.height)
                    }
                }
                .background(colors.surfaceBase)
                .refreshable {
                    await viewModel.refresh()
                }
            }
        } else if viewModel.tasks.isEmpty {
            // Empty state: пустой список при открытой смене
            let isManager = userManager.currentAssignment?.position?.role?.id == 2

            GeometryReader { geometry in
                ScrollView {
                    if isManager {
                        // Заглушка для менеджера
                        EmptyStateView(
                            title: "У вас нет задач",
                            description: "Вы можете проверить задачи сотрудников",
                            buttons: [
                                EmptyStateButton(
                                    title: "Проверить сотрудников",
                                    style: .secondary,
                                    action: switchToControlTab
                                )
                            ]
                        )
                        .frame(width: geometry.size.width)
                        .frame(minHeight: geometry.size.height)
                    } else {
                        // Заглушка для работника
                        EmptyStateView(
                            title: "У вас нет задач",
                            description: "Обратитесь к руководителю для назначения задач",
                            buttons: []
                        )
                        .frame(width: geometry.size.width)
                        .frame(minHeight: geometry.size.height)
                    }
                }
                .background(colors.surfaceBase)
                .refreshable {
                    await viewModel.refresh()
                }
            }
        } else {
            // Список карточек задач
            ScrollView {
                LazyVStack(spacing: WFMSpacing.s) {
                    ForEach(viewModel.tasks) { task in
                        TaskCardView(
                            task: task,
                            onDetail: {
                                router.navigateToTaskDetail(taskId: task.safeId.uuidString)
                            }
                        )
                        .contentShape(Rectangle())
                        .onTapGesture {
                            router.navigateToTaskDetail(taskId: task.safeId.uuidString)
                        }
                    }
                }
                .padding(.horizontal, WFMSpacing.l)
                .padding(.vertical, WFMSpacing.m)
            }
            .background(colors.surfaceBase)
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

#Preview {
    let container = DependencyContainer.shared
    NavigationStack {
        TasksListView(
            viewModel: container.makeTasksListViewModel()
        )
        .environmentObject(AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
        .environmentObject(container.userManager)
    }
    .wfmTheme()
}
