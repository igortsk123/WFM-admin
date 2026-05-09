import SwiftUI
import WFMUI
import WFMAuth

/// Экран деталей задачи с переходами состояний
struct TaskDetailView: View {
    @StateObject private var viewModel: TaskDetailViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.wfmColors) private var colors

    @State private var selectedTab = 0

    init(viewModel: TaskDetailViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Кастомный Navigation Header
            HStack(spacing: 0) {
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 0) {
                        ZStack {
                            Color.clear
                                .frame(width: 44, height: 44)
                            WFMIcons.arrowLeft
                                .resizable()
                                .renderingMode(.template)
                                .frame(width: 24, height: 24)
                                .foregroundColor(colors.iconPrimary)
                        }

                        Text(viewModel.task.safeTitle)
                            .font(WFMTypography.headline16Bold)
                            .tracking(WFMTypography.LetterSpacing.headline16Bold)
                            .foregroundColor(colors.textPrimary)
                            .lineLimit(1)
                    }
                }
                .buttonStyle(PlainButtonStyle())

                Spacer()
            }
            .padding(.horizontal, WFMSpacing.m)
            .padding(.vertical, WFMSpacing.xxs)
            .background(colors.surfaceSecondary)
            .overlay(
                Rectangle()
                    .fill(colors.cardBorderSecondary)
                    .frame(height: 1),
                alignment: .bottom
            )

            // Task Info Section (white background, fixed)
            taskInfoSection
                .background(colors.surfaceSecondary)

            // Tab Bar
            WFMTabBar(
                options: ["Подзадачи", "Подсказки"],
                selectedIndex: $selectedTab
            )
            .background(colors.surfaceSecondary)
            .onChange(of: selectedTab) { newTab in
                if newTab == 1 { viewModel.trackHintsTabViewed() }
            }

            // Scrollable content
            GeometryReader { geometry in
                ScrollView {
                    VStack(spacing: 0) {
                        // Info / review comment cards (вне табов)
                        infoCardsSection
                            .padding(.top, WFMSpacing.xl)

                        // Tab content
                        if selectedTab == 0 {
                            subtasksContent
                                .padding(.top, infoCardsVisible ? WFMSpacing.xl : WFMSpacing.xl)
                        } else {
                            hintsContent
                                .padding(.top, infoCardsVisible ? WFMSpacing.xl : WFMSpacing.xl)
                        }

                        Spacer()
                    }
                    .frame(width: geometry.size.width)
                    .frame(minHeight: geometry.size.height)
                }
                .background(colors.surfaceBase)
                .refreshable {
                    await viewModel.refresh()
                }
            }

            // Actions Section (fixed at bottom)
            if viewModel.task.safeState != .completed || viewModel.task.isRejected {
                actionsSection
                    .background(colors.surfaceSecondary)
            }
        }
        .navigationBarHidden(true)
        .preference(key: HideTabBarPreferenceKey.self, value: true)
        .task(id: viewModel.task.safeId) {
            async let taskLoad: Void = viewModel.loadTask()
            async let hintsLoad: Void = viewModel.loadHints()
            _ = await (taskLoad, hintsLoad)
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Task Info Section

    private var taskInfoSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                if let zone = viewModel.task.zone {
                    HStack(spacing: 4) {
                        Text("Зона:")
                            .font(WFMTypography.headline14Medium)
                            .foregroundColor(colors.textTertiary)
                        Text(zone.name)
                            .font(WFMTypography.headline14Medium)
                            .foregroundColor(colors.textPrimary)
                    }
                }

                if let category = viewModel.task.category {
                    HStack(spacing: 4) {
                        Text("Категория:")
                            .font(WFMTypography.headline14Medium)
                            .foregroundColor(colors.textTertiary)
                        Text(category.name)
                            .font(WFMTypography.headline14Medium)
                            .foregroundColor(colors.textPrimary)
                    }
                }
            }

            Spacer().frame(height: 16)

            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    if viewModel.task.safeState == .completed {
                        if viewModel.task.reviewState == .onReview {
                            Text("Задача отправлена на проверку")
                                .font(WFMTypography.headline14Medium)
                                .foregroundColor(colors.textPrimary)
                        } else {
                            Text("Задача завершена")
                                .font(WFMTypography.headline14Medium)
                                .foregroundColor(colors.textSecondary)
                        }
                    } else {
                        Text("Период")
                            .font(WFMTypography.headline14Medium)
                            .foregroundColor(colors.textTertiary)

                        HStack(spacing: 2) {
                            Image("ic-time")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 12, height: 12)
                                .foregroundColor(colors.textSecondary)

                            Text(periodText)
                                .font(WFMTypography.headline14Medium)
                                .foregroundColor(colors.textSecondary)
                        }
                    }
                }

                if viewModel.task.safeState != .completed {
                    WFMProgressBar(
                        progress: viewModel.progress,
                        type: .solid,
                        state: viewModel.task.safeState == .paused ? .paused : .normal,
                        showText: false
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var periodText: String {
        switch viewModel.task.safeState {
        case .new:
            return "\(viewModel.task.safePlannedMinutes) минут"
        case .inProgress, .paused:
            return "Осталось \(viewModel.remainingMinutes) минут"
        case .completed:
            return ""
        }
    }

    // MARK: - Info Cards (вне табов)

    private var infoCardsVisible: Bool {
        viewModel.task.comment != nil || viewModel.task.safeReviewComment != nil
    }

    @ViewBuilder
    private var infoCardsSection: some View {
        if infoCardsVisible {
            VStack(alignment: .leading, spacing: WFMSpacing.s) {
                if let comment = viewModel.task.comment {
                    HStack(alignment: .top, spacing: 8) {
                        Image("ic-info-fill")
                            .resizable()
                            .renderingMode(.original)
                            .scaledToFit()
                            .frame(width: 24, height: 24)

                        Text(comment)
                            .font(WFMTypography.body14Regular)
                            .foregroundColor(colors.cardTextPrimary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(colors.cardSurfaceInfo)
                    .cornerRadius(WFMRadius.xl)
                }

                if let reviewComment = viewModel.task.safeReviewComment {
                    HStack(alignment: .top, spacing: 8) {
                        Image("ic-info-error")
                            .resizable()
                            .renderingMode(.original)
                            .scaledToFit()
                            .frame(width: 24, height: 24)

                        Text(reviewComment)
                            .font(WFMTypography.body14Regular)
                            .foregroundColor(colors.cardTextPrimary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(colors.cardSurfaceError)
                    .cornerRadius(WFMRadius.xl)
                }
            }
            .padding(.horizontal, WFMSpacing.xl)
        }
    }

    // MARK: - Operations Content

    @ViewBuilder
    private var subtasksContent: some View {
        let allowNew = viewModel.task.workType?.allowNewOperations == true

        VStack(spacing: WFMSpacing.s) {
            if allowNew {
                // Режим allowNewOperations: только выбранные + пользовательские + кнопка добавления
                let selectedOps = viewModel.operations.filter { viewModel.selectedOperationIds.contains($0.id) }

                ForEach(selectedOps) { operation in
                    WFMSelectionCard(
                        title: operation.name,
                        type: .select,
                        isChecked: true,
                        onTap: { viewModel.toggleOperation(id: operation.id) }
                    )
                }

                ForEach(Array(viewModel.newOperations.enumerated()), id: \.offset) { index, name in
                    WFMSelectionCard(
                        title: name,
                        type: .select,
                        isChecked: true,
                        onTap: { viewModel.removeNewOperation(at: index) }
                    )
                }

                AddOperationButton {
                    viewModel.showSelectOperationsSheet()
                }
            } else {
                // Обычный режим: весь список операций с чекбоксами
                if viewModel.operations.isEmpty {
                    Text("Операции не указаны")
                        .font(WFMTypography.body14Regular)
                        .foregroundColor(colors.textTertiary)
                        .frame(maxWidth: .infinity)
                } else {
                    ForEach(viewModel.operations) { operation in
                        WFMSelectionCard(
                            title: operation.name,
                            type: .select,
                            isChecked: viewModel.selectedOperationIds.contains(operation.id),
                            onTap: { viewModel.toggleOperation(id: operation.id) }
                        )
                    }
                }
            }
        }
        .padding(.horizontal, WFMSpacing.xl)
    }

    // MARK: - Add Operation Button

    private struct AddOperationButton: View {
        @Environment(\.wfmColors) private var colors
        let onTap: () -> Void

        var body: some View {
            Button(action: onTap) {
                HStack(spacing: WFMSpacing.s) {
                    Text("Добавить подзадачу")
                        .font(WFMTypography.headline14Medium)
                        .foregroundColor(colors.textBrand)
                    Spacer()
                    Image("ic-plus")
                        .resizable()
                        .renderingMode(.template)
                        .frame(width: 24, height: 24)
                        .foregroundColor(colors.iconBrand)
                }
                .padding(WFMSpacing.m)
                .background(colors.surfaceSecondary)
                .cornerRadius(WFMRadius.xl)
                .overlay(
                    RoundedRectangle(cornerRadius: WFMRadius.xl)
                        .strokeBorder(
                            style: StrokeStyle(lineWidth: 1, dash: [6, 4])
                        )
                        .foregroundColor(WFMPrimitiveColors.brand200)
                )
            }
            .buttonStyle(PlainButtonStyle())
        }
    }

    // MARK: - Hints Content

    @ViewBuilder
    private var hintsContent: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Заголовок "Советы от ИИ"
            HStack(spacing: 4) {
                Image("ic-ai-help")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 16, height: 16)

                Text("Советы от ИИ")
                    .font(WFMTypography.headline14Bold)
                    .foregroundColor(colors.textPrimary)
            }

            if viewModel.isLoadingHints {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.top, WFMSpacing.xl)
            } else if viewModel.hints.isEmpty {
                Text("Подсказок пока нет")
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(colors.textTertiary)
            } else {
                VStack(spacing: 4) {
                    ForEach(viewModel.hints) { hint in
                        HintCard(text: hint.text)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, WFMSpacing.xl)
    }

    // MARK: - Actions Section

    @ViewBuilder
    private var actionsSection: some View {
        switch viewModel.task.safeState {
        case .new:
            VStack(spacing: 0) {
                WFMPrimaryButton(text: "Начать") {
                    _Concurrency.Task {
                        await viewModel.startTask()
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.xl)
            .padding(.vertical, WFMSpacing.xl)

        case .inProgress:
            HStack(spacing: 8) {
                WFMSecondaryButton(
                    text: "На паузу",
                    icon: "ic-pause",
                    size: .medium
                ) {
                    _Concurrency.Task {
                        await viewModel.pauseTask()
                    }
                }

                WFMPrimaryButton(text: "Завершить") {
                    let allowNew = viewModel.task.workType?.allowNewOperations == true
                    let noneSelected = viewModel.selectedOperationIds.isEmpty && viewModel.newOperations.isEmpty
                    if allowNew && noneSelected {
                        viewModel.showSelectOperationsSheet(trigger: "auto")
                    } else {
                        viewModel.requestCompleteConfirmation(onDismiss: { dismiss() })
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.xl)
            .padding(.vertical, WFMSpacing.xl)

        case .paused:
            HStack(spacing: 8) {
                WFMSecondaryButton(
                    text: "Продолжить",
                    icon: "ic-play",
                    size: .medium
                ) {
                    _Concurrency.Task {
                        await viewModel.resumeTask()
                    }
                }

                WFMPrimaryButton(text: "Завершить") {
                    let allowNew = viewModel.task.workType?.allowNewOperations == true
                    let noneSelected = viewModel.selectedOperationIds.isEmpty && viewModel.newOperations.isEmpty
                    if allowNew && noneSelected {
                        viewModel.showSelectOperationsSheet(trigger: "auto")
                    } else {
                        viewModel.requestCompleteConfirmation(onDismiss: { dismiss() })
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.xl)
            .padding(.vertical, WFMSpacing.xl)

        case .completed:
            EmptyView()
        }
    }
}

// MARK: - HintCard

private struct HintCard: View {
    let text: String
    @Environment(\.wfmColors) private var colors

    var body: some View {
        Text(text)
            .font(WFMTypography.body14Regular)
            .foregroundColor(colors.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(colors.surfaceSecondary)
            .cornerRadius(WFMRadius.xl)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.xl)
                    .stroke(colors.cardBorderSecondary, lineWidth: 1)
            )
    }
}

#Preview {
    let container = DependencyContainer.shared
    let router = AppRouter(
        tokenStorage: container.tokenStorage,
        userManager: container.userManager,
        impersonationStorage: container.impersonationStorage
    )

    NavigationStack {
        TaskDetailView(
            viewModel: TaskDetailViewModel(
                task: Task(
                    title: "Sample Task",
                    description: "This is a sample task for preview",
                    plannedMinutes: 120,
                    creatorId: 123,
                    assigneeId: 456,
                    state: .new
                ),
                tasksService: container.tasksService,
                toastManager: container.toastManager,
                bottomSheetManager: container.bottomSheetManager,
                analyticsService: container.analyticsService,
                router: router
            )
        )
    }
}
