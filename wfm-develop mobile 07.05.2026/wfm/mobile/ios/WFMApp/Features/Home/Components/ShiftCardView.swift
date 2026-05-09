import SwiftUI
import WFMUI

// MARK: - Shift Card View

/// Карточка смены на главном экране
struct ShiftCardView: View {
    @Environment(\.wfmColors) var colors

    let state: ShiftCardState
    let shift: CurrentShift?
    let positionName: String?
    let storeName: String?
    let statusText: String
    let isShiftLoading: Bool
    let planTasks: [Task]
    let isPlanTasksLoading: Bool
    let onOpenShift: () -> Void
    let onTakeTask: () -> Void
    let onRefresh: () -> Void

    var body: some View {
        let cardBackground: Color = {
            switch state {
            case .empty, .noData:
                return colors.cardSurfaceSecondary
            default:
                return colors.cardSurfaceSecondary
            }
        }()

        return VStack(spacing: 12) {
            // Содержимое карточки в зависимости от состояния
            switch state {
            case .new, .inProgress, .delay:
                shiftInfoSection
            case .done:
                shiftInfoSection
            case .noData:
                emptyStateSection(
                    icon: {
                        Image("futured")
                            .resizable()
                            .renderingMode(.original)
                            .frame(width: 56, height: 56)
                    },
                    title: "Данные не загрузились",
                    subtitle: "Попробуйте обновить страницу",
                    background: colors.surfaceBase
                )
            case .empty:
                emptyStateSection(
                    icon: {
                        Image("futered-info")
                            .resizable()
                            .renderingMode(.original)
                            .frame(width: 56, height: 56)
                    },
                    title: "У вас нет задач",
                    subtitle: "Ожидайте назначения задач или обратитесь к директору",
                    background: colors.surfaceBase
                )
            }

            // Кнопка действия
            actionButton
        }
        .fixedSize(horizontal: false, vertical: true)
        .padding(12)
        .background(cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: WFMRadius.xl)
                .stroke(colors.cardBorderSecondary, lineWidth: 1)
        )
        .cornerRadius(WFMRadius.xl)
    }

    // MARK: - Shift Info Section

    @ViewBuilder
    private var shiftInfoSection: some View {
        VStack(spacing: WFMSpacing.m) {
            // Секция с информацией о смене (на сером фоне)
            VStack(spacing: 0) {
                // Бейдж должности, время, статус
                VStack(spacing: WFMSpacing.xxs) {
                    badgeView

                    if let shift = shift {
                        timeText(shift)
                    } else {
                        Text("12:00 - 13:00")
                            .font(WFMTypography.headline24Bold)
                            .foregroundColor(colors.textPrimary)
                    }

                    if !statusText.isEmpty {
                        statusTextView
                    }
                }
                .padding(.horizontal, WFMSpacing.l)
                .padding(.vertical, WFMSpacing.m)

                // Разделитель
                Rectangle()
                    .fill(colors.cardBorderTertiary)
                    .frame(height: 1)

                // Адрес и длительность
                locationDurationRow
            }
            .frame(maxWidth: .infinity)
            .background(colors.cardSurfaceBase)
            .cornerRadius(WFMRadius.l)

            // План дня (на белом фоне, вне серой секции)
            if state == .new || state == .inProgress || state == .delay || state == .done {
                //planSection
            }
        }
    }

    @ViewBuilder
    private var badgeView: some View {
        if let name = positionName, !name.isEmpty {
            Text(name)
                .font(WFMTypography.headline12Medium)
                .foregroundColor(colors.buttonSecondaryTextDefault)
                .lineLimit(1)
                .padding(.horizontal, WFMSpacing.xs)
                .padding(.vertical, 2)
                .background(colors.buttonSecondaryBgDefault)
                .cornerRadius(WFMRadius.s)
        }
    }

    private func timeText(_ shift: CurrentShift) -> some View {
        let timeString: String
        if let startTime = shift.startTime, let endTime = shift.endTime {
            timeString = "\(TimeFormatters.formatTime(startTime)) - \(TimeFormatters.formatTime(endTime))"
        } else {
            timeString = "—"
        }

        return Text(timeString)
            .font(WFMTypography.headline24Bold)
            .foregroundColor(colors.textPrimary)
    }

    private var statusTextView: some View {
        let color: Color = state == .delay ? colors.textError : colors.textSecondary

        return Text(statusText)
            .font(WFMTypography.headline12Medium)
            .foregroundColor(color)
            .lineLimit(2)
            .frame(maxWidth: .infinity)
    }

    private var locationDurationRow: some View {
        HStack(spacing: 8) {
            // Адрес
            if let address = storeName, !address.isEmpty {
                HStack(spacing: 4) {
                    WFMIcons.pinFilledIcon
                        .resizable()
                        .renderingMode(.original)
                        .frame(width: 12, height: 12)

                    Text(address)
                        .font(WFMTypography.headline12Medium)
                        .foregroundColor(colors.textSecondary)
                        .lineLimit(1)
                }
            }

            // Длительность — сразу после адреса, не сжимается
            if let durationText = shiftDurationText {
                HStack(spacing: 2) {
                    Image("ic-duration")
                        .resizable()
                        .renderingMode(.original)
                        .frame(width: 12, height: 12)

                    Text(durationText)
                        .font(WFMTypography.headline12Medium)
                        .foregroundColor(colors.textSecondary)
                }
                .fixedSize()
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, WFMSpacing.m)
        .padding(.vertical, WFMSpacing.s)
    }

    private var shiftDurationText: String? {
        guard let shift = shift,
              let start = shift.startTime,
              let end = shift.endTime else { return nil }
        return TimeFormatters.formatShiftDuration(start: start, end: end)
    }

    // MARK: - Plan Section

    @ViewBuilder
    private var planSection: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.s) {
            Text("Ваш план дня")
                .font(WFMTypography.body14Bold)
                .foregroundColor(colors.textPrimary)

            if isPlanTasksLoading {
                // Skeleton loading - 6 карточек
                VStack(spacing: 4) {
                    ForEach(0..<6, id: \.self) { _ in
                        taskRowSkeleton
                    }
                }
            } else if !planTasks.isEmpty {
                // Карточки задач (максимум 6)
                VStack(spacing: 4) {
                    ForEach(Array(planTasks.prefix(6).enumerated()), id: \.element.id) { index, task in
                        taskRow(
                            title: task.safeTitle,
                            time: task.durationOnly(),
                            color: taskColor(for: task.workTypeId ?? 0),
                            strikethrough: task.state == .completed
                        )
                    }
                }
            }
            // Если planTasks.isEmpty и не загружается - просто не показываем ничего
        }
    }

    private func taskRow(title: String, time: String, color: Color, strikethrough: Bool) -> some View {
        HStack(spacing: 8) {
            Text(title)
                .font(WFMTypography.headline14Medium)
                .foregroundColor(colors.textPrimary)
                .strikethrough(strikethrough)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text(time)
                .font(WFMTypography.headline12Medium)
                .foregroundColor(colors.textSecondary)
                .frame(width: 72, alignment: .trailing)
        }
        .padding(.horizontal, WFMSpacing.m)
        .padding(.vertical, WFMSpacing.xs)
        .background(colors.surfaceBase)
        .cornerRadius(WFMRadius.s)
        .overlay(
            UnevenRoundedRectangle(
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: WFMRadius.xs,
                topTrailingRadius: WFMRadius.xs
            )
            .fill(color)
            .frame(width: 4)
            .padding(.vertical, WFMSpacing.xs),
            alignment: .leading
        )
    }

    private var taskRowSkeleton: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
                .fill(colors.surfaceTertiary)
                .frame(height: 14)
                .frame(maxWidth: .infinity)

            RoundedRectangle(cornerRadius: 4)
                .fill(colors.surfaceTertiary)
                .frame(width: 60, height: 12)
        }
        .padding(.horizontal, WFMSpacing.m)
        .padding(.vertical, WFMSpacing.xs)
        .background(colors.surfaceBase)
        .cornerRadius(WFMRadius.s)
        .overlay(
            UnevenRoundedRectangle(
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: WFMRadius.xs,
                topTrailingRadius: WFMRadius.xs
            )
            .fill(colors.surfaceTertiary)
            .frame(width: 4)
            .padding(.vertical, WFMSpacing.xs),
            alignment: .leading
        )
    }

    /// Определить цвет для задачи по индексу (синхронизировано с Android)
    private func taskColor(for index: Int) -> Color {
        let colors = [
            WFMPrimitiveColors.brand500,    // 0 - VIOLET
            WFMPrimitiveColors.blue500,     // 1 - BLUE
            WFMPrimitiveColors.yellow600,   // 2 - YELLOW
            WFMPrimitiveColors.pink400,     // 3 - PINK
            WFMPrimitiveColors.orange500,   // 4 - ORANGE
            WFMPrimitiveColors.green600     // 5 - GREEN
        ]
        return colors[index % colors.count]
    }

    // MARK: - Empty State Section

    private func emptyStateSection<I: View>(
        @ViewBuilder icon: () -> I,
        title: String,
        subtitle: String,
        background: Color
    ) -> some View {
        VStack(spacing: 4) {
            icon()

            Text(title)
                .font(WFMTypography.headline20Bold)
                .foregroundColor(colors.textPrimary)
                .multilineTextAlignment(.center)

            Text(subtitle)
                .font(WFMTypography.body16Regular)
                .foregroundColor(colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity)
        .background(background)
        .cornerRadius(WFMRadius.xl)
    }

    // MARK: - Action Button

    @ViewBuilder
    private var actionButton: some View {
        switch state {
        case .new, .delay, .done:
            WFMPrimaryButton(
                text: "Открыть смену",
                isLoading: isShiftLoading,
                action: onOpenShift
            )
        case .inProgress:
            WFMSecondaryButton(
                text: "Закрыть смену",
                action: onOpenShift
            )
        case .noData:
            WFMSecondaryButton(
                text: "Обновить",
                size: WFMButtonSize.medium,
                action: onRefresh
            )
        case .empty:
            WFMPrimaryButton(
                text: "Закрыть смену",
                isLoading: isShiftLoading,
                action: onOpenShift
            )
        }
    }

}

// MARK: - Preview

// Mock данные для preview
private extension CurrentShift {
    static var preview: CurrentShift {
        CurrentShift(
            id: 1,
            planId: nil,
            status: .new,
            assignmentId: 1,
            openedAt: nil,
            closedAt: nil,
            shiftDate: "2024-02-20",
            startTime: "08:00:00",
            endTime: "20:00:00",
            externalId: nil,
            duration: 12,
            store: ShiftStore(
                id: 1,
                name: "Магазин №1",
                address: "Красноармейская, 102a",
                createdAt: Date()
            )
        )
    }
}

private extension Task {
    static var mockTasks: [Task] {
        [
            Task(
                id: UUID(),
                title: "Смена ценников",
                description: "",
                plannedMinutes: 60,
                creatorId: 1,
                assigneeId: 1,
                state: .new,
                createdAt: Date(),
                updatedAt: Date()
            ),
            Task(
                id: UUID(),
                title: "Выкладка",
                description: "",
                plannedMinutes: 15,
                creatorId: 1,
                assigneeId: 1,
                state: .new,
                createdAt: Date(),
                updatedAt: Date()
            ),
            Task(
                id: UUID(),
                title: "Работа на кассе",
                description: "",
                plannedMinutes: 70,
                creatorId: 1,
                assigneeId: 1,
                state: .completed,
                createdAt: Date(),
                updatedAt: Date()
            ),
            Task(
                id: UUID(),
                title: "Перерыв",
                description: "",
                plannedMinutes: 210,
                creatorId: 1,
                assigneeId: 1,
                state: .new,
                createdAt: Date(),
                updatedAt: Date()
            ),
            Task(
                id: UUID(),
                title: "Другие работы",
                description: "",
                plannedMinutes: 40,
                creatorId: 1,
                assigneeId: 1,
                state: .new,
                createdAt: Date(),
                updatedAt: Date()
            ),
            Task(
                id: UUID(),
                title: "Уборка торгового зала",
                description: "",
                plannedMinutes: 240,
                creatorId: 1,
                assigneeId: 1,
                state: .new,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
    }
}

#Preview("New - With Tasks") {
    ShiftCardView(
        state: .new,
        shift: .preview,
        positionName: "Выкладка",
        storeName: "Магазин №1",
        statusText: "Начнется через 30 мин",
        isShiftLoading: false,
        planTasks: Task.mockTasks,
        isPlanTasksLoading: false,
        onOpenShift: {},
        onTakeTask: {},
        onRefresh: {}
    )
    .padding()
    .wfmTheme()
}

#Preview("In Progress - Loading Tasks") {
    ShiftCardView(
        state: .inProgress,
        shift: .preview,
        positionName: "Выкладка",
        storeName: "Магазин №1",
        statusText: "",
        isShiftLoading: false,
        planTasks: [],
        isPlanTasksLoading: true,
        onOpenShift: {},
        onTakeTask: {},
        onRefresh: {}
    )
    .padding()
    .wfmTheme()
}

#Preview("Delay - Empty Tasks") {
    ShiftCardView(
        state: .delay,
        shift: .preview,
        positionName: "Выкладка",
        storeName: "Магазин №1",
        statusText: "Вы опаздываете на 15 мин",
        isShiftLoading: false,
        planTasks: [],
        isPlanTasksLoading: false,
        onOpenShift: {},
        onTakeTask: {},
        onRefresh: {}
    )
    .padding()
    .wfmTheme()
}

#Preview("Done") {
    ShiftCardView(
        state: .done,
        shift: .preview,
        positionName: "Выкладка",
        storeName: "Магазин №1",
        statusText: "Смена закрыта",
        isShiftLoading: false,
        planTasks: Task.mockTasks,
        isPlanTasksLoading: false,
        onOpenShift: {},
        onTakeTask: {},
        onRefresh: {}
    )
    .padding()
    .wfmTheme()
}

#Preview("No Data") {
    ShiftCardView(
        state: .noData,
        shift: nil,
        positionName: nil,
        storeName: nil,
        statusText: "",
        isShiftLoading: false,
        planTasks: [],
        isPlanTasksLoading: false,
        onOpenShift: {},
        onTakeTask: {},
        onRefresh: {}
    )
    .padding()
    .wfmTheme()
}

#Preview("Empty") {
    ShiftCardView(
        state: .empty,
        shift: nil,
        positionName: nil,
        storeName: nil,
        statusText: "",
        isShiftLoading: false,
        planTasks: [],
        isPlanTasksLoading: false,
        onOpenShift: {},
        onTakeTask: {},
        onRefresh: {}
    )
    .padding()
    .wfmTheme()
}
