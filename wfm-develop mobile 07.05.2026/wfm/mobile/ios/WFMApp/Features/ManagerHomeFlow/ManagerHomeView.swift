import SwiftUI
import WFMUI
import WFMAuth
import Kingfisher

/// Экран "Главная" для менеджера (только шапка с профилем и временем)
struct ManagerHomeView: View {
    @Environment(\.wfmColors) var colors
    @Environment(\.switchToTasksTab) var switchToTasksTab
    @EnvironmentObject private var container: DependencyContainer
    @ObservedObject var viewModel: HomeViewModel

    let onShowAllTasks: () -> Void
    let tasksService: TasksService
    let toastManager: ToastManager
    let analyticsService: AnalyticsService

    init(
        viewModel: HomeViewModel,
        tasksService: TasksService,
        toastManager: ToastManager,
        analyticsService: AnalyticsService,
        onShowAllTasks: @escaping () -> Void = {}
    ) {
        self.viewModel = viewModel
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.analyticsService = analyticsService
        self.onShowAllTasks = onShowAllTasks
    }

    var body: some View {
        VStack(spacing: 0) {
            // Заголовок с профилем (фиксированный)
            ProfileHeaderView(
                greetingName: viewModel.greetingName,
                formattedDate: viewModel.formattedDate,
                avatarUrl: viewModel.avatarUrl
            )
            .background(colors.surfaceBase)
            .overlay(
                Rectangle()
                    .fill(colors.borderSecondary)
                    .frame(height: 1),
                alignment: .bottom
            )

            // Контент с задачами на проверку (прокручиваемый для pull-to-refresh)
            GeometryReader { geometry in
                ScrollView {
                    VStack(alignment: .leading, spacing: WFMSpacing.m) {
                        // Карточка смены
                        ShiftCardView(
                            state: viewModel.shiftCardState,
                            shift: viewModel.currentShift,
                            positionName: viewModel.positionName,
                            storeName: viewModel.storeName,
                            statusText: viewModel.statusText,
                            isShiftLoading: viewModel.isShiftLoading,
                            planTasks: viewModel.planTasks,
                            isPlanTasksLoading: viewModel.isPlanTasksLoading,
                            onOpenShift: {
                                if viewModel.shiftCardState == .inProgress {
                                    // Закрытие смены - подготавливаем данные БШ на основе локальных задач
                                    viewModel.prepareCloseShiftBottomSheet()
                                    // Показываем BottomSheet для подтверждения
                                    CloseShiftBottomSheet.show(
                                        bottomSheetManager: container.bottomSheetManager,
                                        viewModel: viewModel,
                                        onDismiss: {
                                            viewModel.clearCloseShiftMessage()
                                        },
                                        onClose: {
                                            // Делаем запрос с правильным force флагом, БШ закроется автоматически при успехе
                                            viewModel.openShift(force: viewModel.closeShiftForce)
                                        }
                                    )
                                } else {
                                    // Открытие смены - делаем сразу
                                    viewModel.openShift()
                                }
                            },
                            onTakeTask: {
                                // TODO: Navigate to tasks tab
                            },
                            onRefresh: {
                                _Concurrency.Task {
                                    await viewModel.refreshData()
                                }
                            }
                        )
                        .padding(.horizontal, WFMSpacing.l)
                        .padding(.top, WFMSpacing.s)

                        // Секция "Задачи на проверку"
                        if !viewModel.tasksForReview.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                // Заголовок секции
                                HStack {
                                    Text("Задачи на проверку")
                                        .wfmHeadline18Bold()
                                        .foregroundStyle(colors.cardTextPrimary)

                                    Spacer()

                                    // Кнопка "Все"
                                    Button {
                                        onShowAllTasks()
                                    } label: {
                                        HStack(spacing: WFMSpacing.xxxs) {
                                            Text("Все")
                                                .font(WFMTypography.headline12Medium)
                                                .foregroundStyle(colors.buttonLinkTextDefault)

                                            WFMIcons.chevronRight
                                                .resizable()
                                                .renderingMode(.template)
                                                .frame(width: 12, height: 12)
                                                .foregroundStyle(colors.buttonLinkTextDefault)
                                        }
                                        .padding(.horizontal, WFMSpacing.s)
                                        .padding(.vertical, WFMSpacing.xxs)
                                    }
                                }
                                .padding(.horizontal, WFMSpacing.l)

                                // Горизонтальный скролл с карточками
                                GeometryReader { cardGeometry in
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 8) {
                                            ForEach(viewModel.tasksForReview) { task in
                                                ManagerTaskCardView(
                                                    task: task,
                                                    onTap: {
                                                        TaskReviewSheet.show(
                                                            bottomSheetManager: container.bottomSheetManager,
                                                            task: task,
                                                            tasksService: tasksService,
                                                            toastManager: toastManager,
                                                            analyticsService: analyticsService
                                                        )
                                                    }
                                                )
                                                .frame(width: cardGeometry.size.width - 62)
                                            }
                                        }
                                        .padding(.horizontal, WFMSpacing.l)
                                    }
                                }
                                .frame(height: 100)
                            }
                            .padding(.bottom, WFMSpacing.l)
                        }

                    }
                    .frame(minHeight: geometry.size.height, alignment: .top)
                }
            }
            .background(colors.surfaceBase)
            .refreshable {
                await viewModel.refreshData()
            }
        }
        .background(colors.surfaceBase)
        .task {
            await viewModel.loadData()
        }
        .onChange(of: viewModel.shiftClosedSuccessfully) { success in
            // Закрываем BottomSheet при успешном закрытии смены
            if success {
                container.bottomSheetManager.dismiss()
                viewModel.resetShiftClosedFlag()
            }
        }
        .onChange(of: viewModel.shiftOpenedSuccessfully) { opened in
            print("🔄 ManagerHomeView: shiftOpenedSuccessfully changed to \(opened)")
            if opened {
                print("✅ ManagerHomeView: Calling switchToTasksTab")
                switchToTasksTab()
                viewModel.resetShiftOpenedFlag()
            }
        }
    }
}

#Preview {
    let container = DependencyContainer.shared

    ManagerHomeView(
        viewModel: HomeViewModel(
            role: .manager,
            userManager: container.userManager,
            tasksService: container.tasksService,
            toastManager: container.toastManager,
            analyticsService: container.analyticsService
        ),
        tasksService: container.tasksService,
        toastManager: container.toastManager,
        analyticsService: container.analyticsService,
        onShowAllTasks: {
            print("Show all tasks tapped")
        }
    )
    .wfmTheme()
}
