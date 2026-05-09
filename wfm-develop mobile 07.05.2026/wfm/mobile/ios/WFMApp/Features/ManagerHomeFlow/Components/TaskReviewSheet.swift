import SwiftUI
import WFMUI
import Kingfisher

/// BottomSheet для проверки и подтверждения/отклонения задачи менеджером
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var container: DependencyContainer
///
/// Button("Проверить задачу") {
///     TaskReviewSheet.show(
///         bottomSheetManager: container.bottomSheetManager,
///         task: task,
///         tasksService: container.tasksService,
///         toastManager: container.toastManager
///     )
/// }
/// ```
struct TaskReviewSheet {
    /// Показать BottomSheet проверки задачи
    @MainActor
    static func show(
        bottomSheetManager: BottomSheetManager,
        task: Task,
        tasksService: TasksService,
        toastManager: ToastManager,
        analyticsService: AnalyticsService,
        onSuccess: (() -> Void)? = nil
    ) {
        // Track analytics event
        analyticsService.track(.taskReviewSheetOpened(
            taskReviewState: task.reviewState?.rawValue ?? "NONE"
        ))

        bottomSheetManager.show(showOverlay: true) {
            TaskReviewSheetContent(
                task: task,
                tasksService: tasksService,
                toastManager: toastManager,
                analyticsService: analyticsService,
                onDismiss: { bottomSheetManager.dismiss() },
                onSuccess: onSuccess
            )
        }
    }
}

// MARK: - Content

private struct TaskReviewSheetContent: View {
    @Environment(\.wfmColors) private var colors
    @StateObject private var viewModel: TaskReviewViewModel
    @State private var showFullscreenImage = false
    let onDismiss: () -> Void
    let onSuccess: (() -> Void)?

    init(task: Task, tasksService: TasksService, toastManager: ToastManager, analyticsService: AnalyticsService, onDismiss: @escaping () -> Void, onSuccess: (() -> Void)?) {
        _viewModel = StateObject(wrappedValue: TaskReviewViewModel(
            task: task,
            tasksService: tasksService,
            toastManager: toastManager,
            analyticsService: analyticsService
        ))
        self.onDismiss = onDismiss
        self.onSuccess = onSuccess
    }

    var body: some View {
        VStack(spacing: 0) {
            // Контент
            VStack(alignment: .leading, spacing: WFMSpacing.l) {
                // Заголовок с badge, названием и исполнителем
                headerSection

                // Карточка с временем (План/Факт)
                TimetablesCard(task: viewModel.task)

                // Фотографии (если есть)
                if viewModel.task.reportImageUrl != nil {
                    photosSection
                }

                // Комментарий по задаче (текстовое поле для ввода причины отклонения)
                commentSection
            }
            .padding(.horizontal, WFMSpacing.l)
            .padding(.top, WFMSpacing.l)
            .padding(.bottom, WFMSpacing.s)

            // Кнопки действий (зафиксированы внизу)
            actionsSection
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, WFMSpacing.l)
                .padding(.top, WFMSpacing.l)
                .padding(.bottom, WFMSpacing.l)
        }
        .fullScreenCover(isPresented: $showFullscreenImage) {
            if let imageUrl = viewModel.task.reportImageUrl {
                FullscreenImageView(imageUrl: imageUrl, isPresented: $showFullscreenImage)
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
            // Badge с типом работы
            if let workType = viewModel.task.workType {
                WFMBadge(
                    text: workType.name,
                    color: viewModel.badgeColor
                )
            }

            // Название задачи
            Text(viewModel.task.title ?? viewModel.task.safeTitle)
                .wfmHeadline18Bold()
                .foregroundStyle(colors.cardTextPrimary)
                .lineLimit(2)

            // Имя работника
            if let assignee = viewModel.task.assignee {
                Text(assignee.formattedName)
                    .wfmHeadline14Medium()
                    .foregroundStyle(colors.cardTextPrimary)
            }
        }
    }

    // MARK: - Timetables Card

    private struct TimetablesCard: View {
        @Environment(\.wfmColors) private var colors
        @State private var isExpanded = false
        let task: Task

        var body: some View {
            VStack(spacing: 0) {
                // План
                planSection

                // Факт
                factSection

                // Раскрывающийся список интервалов
                if isExpanded {
                    intervalsSection
                }

                // Отклонение (если есть)
                if let deviation = calculateDeviation(), deviation > 0 {
                    deviationSection(deviation: deviation)
                }
            }
            .frame(maxWidth: .infinity)
            .background(colors.cardBorderTertiary)
            .cornerRadius(WFMRadius.xl)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.xl)
                    .stroke(colors.borderSecondary, lineWidth: 1)
            )
        }

        // MARK: - План

        private var planSection: some View {
            HStack(spacing: WFMSpacing.s) {
                Text("План")
                    .wfmHeadline14Medium()
                    .foregroundStyle(colors.cardTextPrimary)
                    .frame(width: 98, alignment: .leading)

                if let timeStart = task.timeStart,
                   let timeEnd = task.timeEnd {
                    Text("\(TimeFormatters.formatTime(timeStart))-\(TimeFormatters.formatTime(timeEnd))")
                        .wfmHeadline14Medium()
                        .foregroundStyle(colors.cardTextPrimary)
                        .frame(width: 98, alignment: .leading)
                }

                Text(TimeFormatters.formatDuration(task.plannedMinutes ?? 0))
                    .wfmHeadline14Medium()
                    .foregroundStyle(colors.cardTextPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(WFMSpacing.m)
            .background(colors.cardSurfaceSecondary)
            .overlay(
                Rectangle()
                    .fill(colors.borderSecondary)
                    .frame(height: 1),
                alignment: .bottom
            )
        }

        // MARK: - Факт

        private var hasMultipleIntervals: Bool {
            (task.historyBrief?.workIntervals.count ?? 0) > 1
        }

        private var factSection: some View {
            HStack(spacing: WFMSpacing.s) {
                Text("Факт")
                    .wfmHeadline14Medium()
                    .foregroundStyle(colors.cardTextPrimary)
                    .frame(width: 98, alignment: .leading)

                if let historyBrief = task.historyBrief,
                   let timeStart = historyBrief.timeStart,
                   let timeEnd = historyBrief.timeStateUpdated {
                    Text("\(TimeFormatters.formatTime(timeStart))-\(TimeFormatters.formatTime(timeEnd))")
                        .wfmHeadline14Medium()
                        .foregroundStyle(colors.cardTextPrimary)
                        .frame(width: 98, alignment: .leading)
                }

                Text(TimeFormatters.formatDurationFromSeconds(task.historyBrief?.duration ?? 0))
                    .wfmHeadline14Medium()
                    .foregroundStyle(colors.cardTextPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Chevron icon (только если есть несколько отрезков)
                if hasMultipleIntervals {
                    (isExpanded ? WFMIcons.chevronUp : WFMIcons.chevronDown)
                        .resizable()
                        .renderingMode(.template)
                        .aspectRatio(contentMode: .fit)
                        .foregroundStyle(colors.cardTextPrimary)
                        .frame(width: 16, height: 16)
                }
            }
            .padding(WFMSpacing.m)
            .background(colors.cardSurfaceBase)
            .onTapGesture {
                guard hasMultipleIntervals else { return }
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            }
        }

        // MARK: - Интервалы

        private var intervalsSection: some View {
            VStack(spacing: WFMSpacing.xxs) {
                if let intervals = task.historyBrief?.workIntervals, !intervals.isEmpty {
                    ForEach(Array(intervals.enumerated()), id: \.offset) { _, interval in
                        HStack(spacing: WFMSpacing.s) {
                            if let timeEnd = interval.timeEnd {
                                Text("\(TimeFormatters.formatTime(interval.timeStart))-\(TimeFormatters.formatTime(timeEnd))")
                                    .wfmBody14Regular()
                                    .foregroundStyle(colors.cardTextPrimary)
                                    .frame(width: 98, alignment: .leading)

                                Text(TimeFormatters.formatDuration(from: interval.timeStart, to: timeEnd))
                                    .wfmBody14Regular()
                                    .foregroundStyle(colors.cardTextPrimary)
                                    .frame(width: 64, alignment: .leading)

                                Spacer(minLength: 0)
                            }
                        }
                        .padding(.leading, 118) // Выравнивание под "Факт" (98 + 8 + 12)
                        .padding(.trailing, WFMSpacing.m)
                        .padding(.vertical, WFMSpacing.xxs)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, WFMSpacing.s)
            .background(colors.cardSurfaceBase)
        }

        // MARK: - Отклонение

        private func deviationSection(deviation: Int) -> some View {
            HStack(spacing: 0) {
                Text("Отклонение: +\(TimeFormatters.formatDuration(deviation))")
                    .wfmBody12Regular()
                    .foregroundStyle(colors.cardTextError)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, WFMSpacing.m)
            .padding(.vertical, WFMSpacing.s)
            .background(colors.badgeRedBgLight)
        }

        // MARK: - Helper Methods

        /// Вычисляет отклонение от плана (в минутах)
        private func calculateDeviation() -> Int? {
            guard let plannedMinutes = task.plannedMinutes,
                  let duration = task.historyBrief?.duration else {
                return nil
            }

            let factMinutes = duration / 60
            let deviation = factMinutes - plannedMinutes
            return deviation > 0 ? deviation : nil
        }
    }

    // MARK: - Photos Section

    private var photosSection: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.s) {
            Text("Фотографии")
                .wfmHeadline14Medium()
                .foregroundStyle(colors.cardTextPrimary)

            // Горизонтальный скролл фотографий
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: WFMSpacing.s) {
                    if let imageUrl = viewModel.task.reportImageUrl {
                        // Пока одна фотография, но готово к расширению
                        photoView(url: imageUrl)
                    }
                }
            }
        }
    }

    private func photoView(url: String) -> some View {
        KFImage(URL(string: url))
            .placeholder {
                Rectangle()
                    .fill(colors.cardSurfaceBase)
                    .overlay(
                        ProgressView()
                            .tint(colors.textSecondary)
                    )
            }
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: 153, height: 101)
            .cornerRadius(WFMRadius.xl)
            .clipped()
            .onTapGesture {
                showFullscreenImage = true
            }
    }

    // MARK: - Comment Section

    private var commentSection: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.s) {
            Text("Комментарий по задаче")
                .wfmHeadline14Bold()
                .foregroundStyle(colors.cardTextPrimary)

            // Показываем комментарий работника если есть
            if let reportText = viewModel.task.reportText, !reportText.isEmpty {
                Text(reportText)
                    .wfmBody14Regular()
                    .foregroundStyle(colors.cardTextPrimary)
                    .padding(WFMSpacing.m)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(colors.cardSurfaceBase)
                    .cornerRadius(WFMRadius.l)
                    .overlay(
                        RoundedRectangle(cornerRadius: WFMRadius.l)
                            .stroke(colors.borderSecondary, lineWidth: 1)
                    )
            }

            // Текстовое поле для причины отклонения
            WFMTextArea(
                text: $viewModel.rejectionReason,
                placeholder: "Оставьте комментарий",
                errorMessage: viewModel.rejectionReasonError,
                height: 116,
                backgroundColor: colors.surfacePrimary,
                borderColor: colors.borderSecondary,
                textPadding: WFMSpacing.m,
                font: WFMTypography.body14Regular
            )
        }
    }

    // MARK: - Actions Section

    private var actionsSection: some View {
        HStack(spacing: WFMSpacing.s) {
            // Кнопка "На доработку"
            WFMSecondaryButton(
                text: "На доработку",
                isEnabled: !viewModel.isLoading,
                action: {
                    _Concurrency.Task {
                        let success = await viewModel.rejectTask()
                        if success {
                            onSuccess?()
                            onDismiss()
                        }
                    }
                }
            )

            // Кнопка "Принять"
            WFMPrimaryButton(
                text: "Принять",
                isEnabled: !viewModel.isLoading,
                isLoading: viewModel.isLoading,
                action: {
                    _Concurrency.Task {
                        let success = await viewModel.approveTask()
                        if success {
                            onSuccess?()
                        }
                        onDismiss()
                    }
                }
            )
        }
        .frame(height: 48)
    }
}

// MARK: - Fullscreen Image View

private struct FullscreenImageView: View {
    @Environment(\.wfmColors) private var colors
    let imageUrl: String
    @Binding var isPresented: Bool

    var body: some View {
        ZStack {
            // Черный фон
            Color.black
                .ignoresSafeArea()
                .onTapGesture {
                    isPresented = false
                }

            // Изображение по центру
            KFImage(URL(string: imageUrl))
                .placeholder {
                    ProgressView()
                        .tint(.white)
                }
                .resizable()
                .aspectRatio(contentMode: .fit)
                .ignoresSafeArea()

            // Кнопка закрытия в правом верхнем углу
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        isPresented = false
                    }) {
                        WFMIcons.closeIcon
                            .resizable()
                            .frame(width: 24, height: 24)
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                    .padding(.top, 60)
                    .padding(.trailing, WFMSpacing.l)
                }
                Spacer()
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
class TaskReviewViewModel: ObservableObject {
    @Published var task: Task
    @Published var rejectionReason: String = "" {
        didSet { rejectionReasonError = nil }
    }
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var rejectionReasonError: String?

    private let tasksService: TasksService
    private let toastManager: ToastManager
    private let analyticsService: AnalyticsService

    init(task: Task, tasksService: TasksService, toastManager: ToastManager, analyticsService: AnalyticsService) {
        self.task = task
        self.tasksService = tasksService
        self.toastManager = toastManager
        self.analyticsService = analyticsService
    }

    /// Определяет цвет badge по типу работы
    var badgeColor: BadgeColor {
        task.categoryBadgeColor()
    }

    /// Подтверждает задачу
    /// - Returns: true если успешно, false при ошибке
    func approveTask() async -> Bool {
        guard let taskId = task.id else { return false }

        analyticsService.track(.taskApprovedTapped)
        isLoading = true
        errorMessage = nil

        do {
            let updatedTask = try await tasksService.approveTask(id: taskId)
            task = updatedTask

            // Показываем Toast (успех)
            toastManager.show(
                message: "Задача принята",
                state: .default
            )
            isLoading = false
            return true
        } catch {
            errorMessage = "Ошибка при подтверждении задачи: \(error.localizedDescription)"

            // Показываем Toast (ошибка)
            toastManager.show(
                message: errorMessage ?? "Ошибка",
                state: .error
            )
            isLoading = false
            return false
        }
    }

    /// Отклоняет задачу
    /// - Returns: true если успешно, false при ошибке или если не введена причина
    func rejectTask() async -> Bool {
        guard let taskId = task.id else { return false }

        analyticsService.track(.taskRejectedTapped(hasComment: !rejectionReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty))

        // Проверяем что введена причина отклонения
        guard !rejectionReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            rejectionReasonError = "Укажите причину отклонения"
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            let request = RejectTaskRequest(reason: rejectionReason)
            let updatedTask = try await tasksService.rejectTask(id: taskId, request: request)
            task = updatedTask

            // Показываем Toast (успех)
            toastManager.show(
                message: "Задача отклонена",
                state: .default
            )
            isLoading = false
            return true
        } catch {
            errorMessage = "Ошибка при отклонении задачи: \(error.localizedDescription)"

            // Показываем Toast (ошибка)
            toastManager.show(
                message: errorMessage ?? "Ошибка",
                state: .error
            )
            isLoading = false
            return false
        }
    }
}
