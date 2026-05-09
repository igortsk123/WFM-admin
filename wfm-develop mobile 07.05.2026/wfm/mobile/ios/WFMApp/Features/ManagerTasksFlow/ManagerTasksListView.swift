import SwiftUI
import WFMAuth
import WFMUI

/// Экран "Контроль задач" для менеджера
/// Дизайн: Figma node-id=3601:12843
struct ManagerTasksListView: View {
    @Environment(\.wfmColors) private var colors
    @Environment(\.switchToTasksTab) private var switchToTasksTab
    @EnvironmentObject private var container: DependencyContainer
    @ObservedObject var viewModel: ManagerTasksListViewModel

    private let tasksService: TasksService
    private let toastManager: ToastManager
    private let analyticsService: AnalyticsService

    init(viewModel: ManagerTasksListViewModel, tasksService: TasksService, toastManager: ToastManager, analyticsService: AnalyticsService) {
        self.viewModel = viewModel
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.analyticsService = analyticsService
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Кастомный заголовок
                customHeader
                    .background(colors.surfaceSecondary)

                // Основной контент
                ScrollView {
                    VStack(spacing: WFMSpacing.s) {
                        // Segmented Control
                        WFMSegmentedControl(
                            options: ["Проверить", "Принятые"],
                            selectedIndex: $viewModel.selectedSegmentIndex,
                            height: 40
                        )

                        // Список карточек задач
                        if !viewModel.tasks.isEmpty {
                            ForEach(viewModel.tasks) { task in
                                ManagerTaskCardView(
                                    task: task,
                                    onTap: {
                                        TaskReviewSheet.show(
                                            bottomSheetManager: container.bottomSheetManager,
                                            task: task,
                                            tasksService: tasksService,
                                            toastManager: toastManager,
                                            analyticsService: analyticsService,
                                            onSuccess: {
                                                _Concurrency.Task {
                                                    await viewModel.loadTasks()
                                                }
                                            }
                                        )
                                    }
                                )
                            }
                        } else if viewModel.errorMessage != nil {
                            errorState
                        } else {
                            emptyState
                        }

                        // Дополнительный отступ снизу для таб бара
                        Spacer()
                            .frame(height: 80)
                    }
                    .padding(WFMSpacing.l)
                }
                .background(colors.surfaceBase)
                .refreshable {
                    await viewModel.refresh()
                }
            }
            .navigationBarHidden(true)
            .background(colors.surfaceBase)
        }
        .task {
            await viewModel.loadTasks()
        }
        .onChange(of: viewModel.selectedSegmentIndex) { _, newValue in
            viewModel.onSegmentChanged(newValue)
        }
    }

    /// Кастомный заголовок с кнопкой фильтра
    private var customHeader: some View {
        HStack(spacing: WFMSpacing.s) {
            Text("Контроль задач")
                .wfmHeadline20Bold()
                .foregroundStyle(colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Кнопка фильтра с индикатором
            ZStack(alignment: .topTrailing) {
                Button(action: {
                    TaskFiltersBottomSheet.show(
                        bottomSheetManager: container.bottomSheetManager,
                        filterGroups: viewModel.filterGroups,
                        taskFilterIndices: viewModel.taskFilterIndices,
                        onApply: { groups in viewModel.applyFilters(groups) }
                    )
                }) {
                    Image("ic-filter")
                        .resizable()
                        .renderingMode(.template)
                        .frame(width: 20, height: 20)
                        .foregroundStyle(colors.iconPrimary)
                }
                .frame(width: 40, height: 40)
                .overlay(
                    RoundedRectangle(cornerRadius: WFMRadius.l)
                        .stroke(colors.cardBorderSecondary, lineWidth: 1)
                )

                // Индикатор активных фильтров
                if viewModel.hasActiveFilters {
                    Circle()
                        .fill(colors.badgeBrandBgBright)
                        .frame(width: 8, height: 8)
                        .offset(x: -4, y: 4)
                }
            }
        }
        .padding(WFMSpacing.l)
    }

    /// Пустое состояние
    private var emptyState: some View {
        VStack(spacing: 0) {
            Image("futered-info")
                .renderingMode(.original)
                .resizable()
                .frame(width: 56, height: 56)

            Spacer()
                .frame(height: WFMSpacing.s)

            if viewModel.hasActiveFilters {
                emptyStateWithFilters
            } else {
                emptyStateNoFilters
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }

    /// Пустое состояние с активными фильтрами
    private var emptyStateWithFilters: some View {
        VStack(spacing: 0) {
            Text(viewModel.selectedSegmentIndex == 0 ? "Нет задач на проверку" : "Нет принятых задач")
                .wfmHeadline16Bold()
                .foregroundStyle(colors.textPrimary)

            Spacer()
                .frame(height: WFMSpacing.xs)

            Text("Чтобы посмотреть больше задач,\nпопробуйте очистить фильтры")
                .font(WFMTypography.body14Regular)
                .foregroundStyle(colors.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, WFMSpacing.xl)

            Spacer()
                .frame(height: WFMSpacing.l)

            WFMSecondaryButton(
                text: "Сбросить фильтры",
                action: {
                    let resetFilterGroups = viewModel.filterGroups.map { group in
                        TaskFilterGroup(
                            id: group.id,
                            title: group.title,
                            items: group.items.map { item in
                                TaskFilterItem(id: item.id, title: item.title, isSelected: false)
                            }
                        )
                    }
                    viewModel.applyFilters(resetFilterGroups)
                }
            )
            .padding(.horizontal, WFMSpacing.xl)
        }
    }

    /// Пустое состояние без фильтров
    private var emptyStateNoFilters: some View {
        VStack(spacing: 0) {
            if viewModel.selectedSegmentIndex == 0 {
                Text("Нет задач на проверку")
                    .wfmHeadline18Bold()
                    .foregroundStyle(colors.textPrimary)
                    .multilineTextAlignment(.center)

                Spacer()
                    .frame(height: WFMSpacing.s)

                Text("Пока нет задач на проверку, вы можете делать свои задачи")
                    .font(WFMTypography.body16Regular)
                    .foregroundStyle(colors.cardTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, WFMSpacing.l)

                Spacer()
                    .frame(height: WFMSpacing.l)

                WFMSecondaryButton(
                    text: "К своим задачам",
                    action: { switchToTasksTab() }
                )
                .padding(.horizontal, WFMSpacing.xxxl)
            } else {
                Text("Нет принятых задач")
                    .wfmHeadline18Bold()
                    .foregroundStyle(colors.textPrimary)
                    .multilineTextAlignment(.center)

                Spacer()
                    .frame(height: WFMSpacing.s)

                Text("Проверьте задачи или выполните свои")
                    .font(WFMTypography.body16Regular)
                    .foregroundStyle(colors.cardTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, WFMSpacing.l)

                Spacer()
                    .frame(height: WFMSpacing.l)

                VStack(spacing: WFMSpacing.xxs) {
                    WFMLinkButton(
                        text: "Проверить",
                        size: .medium,
                        action: { viewModel.selectedSegmentIndex = 0 }
                    )

                    WFMSecondaryButton(
                        text: "К своим задачам",
                        action: { switchToTasksTab() }
                    )
                }
                .padding(.horizontal, WFMSpacing.xxxl)
            }
        }
    }

    /// Состояние ошибки
    private var errorState: some View {
        VStack(spacing: 0) {
            Image("futered-info")
                .renderingMode(.original)
                .resizable()
                .frame(width: 56, height: 56)

            Spacer()
                .frame(height: WFMSpacing.s)

            Text("Данные не загрузились")
                .wfmHeadline18Bold()
                .foregroundStyle(colors.textPrimary)
                .multilineTextAlignment(.center)

            Spacer()
                .frame(height: WFMSpacing.s)

            Text("Попробуйте проверить соединение или обновить страницу")
                .font(WFMTypography.body16Regular)
                .foregroundStyle(colors.cardTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, WFMSpacing.l)

            Spacer()
                .frame(height: WFMSpacing.l)

            WFMSecondaryButton(
                text: "Обновить",
                action: {
                    _Concurrency.Task {
                        await viewModel.loadTasks()
                    }
                }
            )
            .padding(.horizontal, WFMSpacing.xxxl)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }
}

// MARK: - Preview

#Preview {
    let container = DependencyContainer.shared

    ManagerTasksListView(
        viewModel: ManagerTasksListViewModel(
            userManager: container.userManager,
            tasksService: container.tasksService,
            toastManager: container.toastManager,
            analyticsService: container.analyticsService
        ),
        tasksService: container.tasksService,
        toastManager: container.toastManager,
        analyticsService: container.analyticsService
    )
    .wfmTheme()
}
