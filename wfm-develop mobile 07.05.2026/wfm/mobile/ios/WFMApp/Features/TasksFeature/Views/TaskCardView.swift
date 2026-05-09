import SwiftUI
import WFMUI

// MARK: - Task Extension для кнопки действия

extension Task {
    /// Текст кнопки действия в зависимости от состояния задачи
    func actionButtonText() -> String {
        // Для отклоненных задач показываем "Возвращена"
        if safeState == .paused && isRejected {
            return "Возвращена"
        }

        // Для задач на проверке показываем "На проверке"
        if safeState == .completed && reviewState == .onReview {
            return "На проверке"
        }

        switch safeState {
        case .new:
            return "К задаче"
        case .inProgress:
            return "В работе"
        case .paused:
            return "Приостановлена"
        case .completed:
            return "Завершена"
        }
    }

    /// Вычислить прогресс выполнения задачи (0.0 - 1.0)
    func calculateProgress() -> Double {
        guard let historyBrief = historyBrief,
              let duration = historyBrief.duration else {
            return 0.0
        }

        let plannedMinutes = plannedMinutes ?? 0
        guard plannedMinutes > 0 else { return 0.0 }

        let plannedSeconds = Double(plannedMinutes * 60)
        var totalSeconds = Double(duration)

        // Только для IN_PROGRESS добавляем время с последнего обновления
        if safeState == .inProgress,
           let timeStateUpdated = historyBrief.timeStateUpdated {
            let elapsedSinceUpdate = Date().timeIntervalSince(timeStateUpdated)
            totalSeconds += elapsedSinceUpdate
        }

        let calculatedProgress = totalSeconds / plannedSeconds
        return min(calculatedProgress, 1.0)
    }
}

// MARK: - TaskCardView

/// Карточка задачи для нового дизайна списка задач
struct TaskCardView: View {
    let task: Task
    let onDetail: () -> Void

    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Контейнер для badge + название
            VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
                // Badge категории (только если есть)
                if let badgeText = task.categoryBadgeText() {
                    WFMBadge(
                        text: badgeText,
                        color: task.categoryBadgeColor()
                    )
                }

                // Название зоны (с категорией если применимо)
                Text(task.zoneWithCategoryDisplayName())
                    .wfmHeadline14Medium()
                    .foregroundStyle(colors.cardTextPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .strikethrough(task.safeState == .completed && !task.isRejected && task.reviewState != .onReview, color: colors.cardTextPrimary)
            }
            .padding(.top, WFMSpacing.m)
            .padding(.horizontal, WFMSpacing.m)
            .padding(.bottom, (task.safeState == .completed && !task.isRejected && task.reviewState != .onReview) ? WFMSpacing.m : WFMSpacing.s)

            // Прогресс-бар (только для IN_PROGRESS и PAUSED)
            if task.safeState == .inProgress || task.safeState == .paused {
                WFMProgressBar(
                    progress: task.calculateProgress(),
                    type: .solid,
                    state: task.safeState == .paused ? .paused : .normal,
                    showText: false
                )
                .padding(.horizontal, WFMSpacing.m)
                .padding(.bottom, WFMSpacing.s)
            }

            // Строка: Время + Кнопка действия (скрываем только для успешно завершённых, кроме задач на проверке)
            if task.safeState != .completed || task.isRejected || task.reviewState == .onReview {
                HStack(spacing: WFMSpacing.xxxs) {
                    // Иконка часов + время
                    HStack(spacing: WFMSpacing.xxxs) {
                        Image("ic-time")
                            .resizable()
                            .frame(width: 12, height: 12)
                            .foregroundStyle(colors.cardTextTertuary)

                        Text(task.formattedTimeRange())
                            .font(WFMTypography.caption12Regular)
                            .foregroundStyle(colors.cardTextTertuary)
                    }

                    Spacer()

                    // Кнопка действия (текст зависит от состояния)
                    Button(action: onDetail) {
                        Text(task.actionButtonText())
                            .font(WFMTypography.headline12Medium)
                            .foregroundStyle(colors.buttonTertiaryTextDefault)
                            .padding(.horizontal, WFMSpacing.s)
                            .padding(.vertical, WFMSpacing.m)
                            .frame(height: 24)
                            .background(colors.buttonTertiaryBgDefault)
                            .clipShape(RoundedRectangle(cornerRadius: WFMRadius.s))
                    }
                }
                .padding(.horizontal, WFMSpacing.m)
                .padding(.bottom, WFMSpacing.m)
            }

            // Блок с сообщением об отклонении (только для отклоненных задач в PAUSED)
            if task.safeState == .paused, let reviewComment = task.safeReviewComment, !reviewComment.isEmpty {
                Text(reviewComment)
                    .font(WFMTypography.caption12Regular)
                    .foregroundStyle(colors.cardTextPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .padding(.horizontal, WFMSpacing.m)
                    .padding(.top, WFMSpacing.s)
                    .padding(.bottom, WFMSpacing.s)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(colors.badgeRedBgLight)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(colors.surfaceSecondary)
        .overlay(
            RoundedRectangle(cornerRadius: WFMRadius.xl)
                .stroke(
                    task.safeState == .paused && task.isRejected ? colors.borderError : colors.cardBorderSecondary,
                    lineWidth: 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: WFMRadius.xl))
    }
}

// MARK: - Preview Helpers

private func createPreviewTask(
    state: TaskState = .new,
    withRejection: Bool = false,
    withProgress: Bool = false,
    withCategory: Bool = false
) -> Task {
    let now = Date()
    return Task(
        id: UUID(),
        title: nil,
        description: "Выкладка товара в торговом зале",
        type: nil,
        plannedMinutes: 60,
        creatorId: 123,
        assigneeId: 456,
        state: withRejection ? .paused : state,
        reviewState: withRejection ? .rejected : nil,
        acceptancePolicy: .manual,
        requiresPhoto: false,
        comment: nil,
        reportText: nil,
        reportImageUrl: nil,
        createdAt: now,
        updatedAt: now,
        reviewComment: withRejection ? "Ценники на 'Ликер' остались старыми. Проверь новые поступления в конверте у старшего смены и обнови их." : nil,
        externalId: 12345,
        shiftId: 789,
        priority: 1,
        workTypeId: withCategory ? 4 : 1,
        workType: WorkType(id: withCategory ? 4 : 1, name: withCategory ? "Ценообразование" : "Мерчендайзинг"),
        zoneId: 1,
        zone: Zone(id: 1, name: withCategory ? "Заморозка" : "Фреш1", priority: 1),
        categoryId: withCategory ? 30 : 1,
        category: Category(id: withCategory ? 30 : 1, name: withCategory ? "МЯСО ЗАМОРОЖЕННОЕ" : "Выкладка"),
        timeStart: "10:10:00",
        timeEnd: "10:30:00",
        source: "LAMA",
        historyBrief: withProgress ? HistoryBrief(
            duration: 600, // 10 минут
            timeStart: now,
            timeStateUpdated: now
        ) : nil
    )
}

// MARK: - Previews

#Preview("Task Card - NEW") {
    VStack {
        TaskCardView(
            task: createPreviewTask(state: .new),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Task Card - IN_PROGRESS") {
    VStack {
        TaskCardView(
            task: createPreviewTask(state: .inProgress, withProgress: true),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Task Card - PAUSED") {
    VStack {
        TaskCardView(
            task: createPreviewTask(state: .paused, withProgress: true),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Task Card - COMPLETED") {
    VStack {
        TaskCardView(
            task: createPreviewTask(state: .completed),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Task Card - REJECTED") {
    VStack {
        TaskCardView(
            task: createPreviewTask(state: .paused, withRejection: true),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Task Card - With Category") {
    VStack {
        TaskCardView(
            task: createPreviewTask(state: .new, withCategory: true),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Task Card - Multiple States") {
    VStack(spacing: 8) {
        TaskCardView(
            task: createPreviewTask(state: .new),
            onDetail: {}
        )
        TaskCardView(
            task: createPreviewTask(state: .inProgress, withProgress: true),
            onDetail: {}
        )
        TaskCardView(
            task: createPreviewTask(state: .completed),
            onDetail: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}
