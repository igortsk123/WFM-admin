import SwiftUI
import WFMUI

/// Блок информации о текущей смене
/// Показывает дату, время и прогресс выполнения задач
struct ShiftInfoBlock: View {
    // MARK: - Properties
    let shift: CurrentShift
    let tasks: [Task]

    @Environment(\.wfmColors) private var colors

    // MARK: - Computed Properties

    /// Общее количество плановых задач
    private var totalTasksCount: Int {
        tasks.filter { $0.type == .planned }.count
    }

    /// Количество завершённых и принятых плановых задач
    private var completedTasksCount: Int {
        tasks.filter { task in
            task.type == .planned &&
            task.state == .completed &&
            task.reviewState == .accepted
        }.count
    }

    /// Прогресс выполнения (0.0 - 1.0)
    private var progress: Float {
        guard totalTasksCount > 0 else { return 0.0 }
        return Float(completedTasksCount) / Float(totalTasksCount)
    }

    /// Форматированная дата смены
    private var formattedDate: String {
        guard let shiftDateString = shift.shiftDate else { return "" }
        return DateFormatters.formatShiftDate(shiftDateString)
    }

    /// Форматированное время смены с длительностью
    private var formattedTime: String {
        guard let startTime = shift.startTime,
              let endTime = shift.endTime else { return "" }
        return TimeFormatters.formatShiftTime(start: startTime, end: endTime)
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: WFMSpacing.xs) {
            // Секция с датой и временем
            HStack(spacing: 0) {
                // Дата
                VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
                    Text("Дата")
                        .font(WFMTypography.caption12Regular)
                        .foregroundStyle(colors.cardTextTertuary)

                    HStack(spacing: 2) {
                        Image("ic-calendar")
                            .resizable()
                            .renderingMode(.template)
                            .frame(width: 12, height: 12)
                            .foregroundStyle(colors.cardTextPrimary)

                        Text(formattedDate)
                            .font(WFMTypography.body14Regular)
                            .foregroundStyle(colors.cardTextPrimary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Время
                VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
                    Text("Время")
                        .font(WFMTypography.caption12Regular)
                        .foregroundStyle(colors.cardTextTertuary)

                    HStack(spacing: 2) {
                        Image("ic-time")
                            .resizable()
                            .renderingMode(.template)
                            .frame(width: 12, height: 12)
                            .foregroundStyle(colors.cardTextPrimary)

                        Text(formattedTime)
                            .font(WFMTypography.body14Regular)
                            .foregroundStyle(colors.cardTextPrimary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            // Прогресс-бар
            WFMProgressBar(
                progress: Double(progress),
                type: .dashed,
                state: .normal,
                segmentCount: totalTasksCount,
                showText: true,
                text: "Выполнено \(completedTasksCount) из \(totalTasksCount) основных задач"
            )
        }
        .padding(WFMSpacing.l)
    }
}

#Preview("Shift Info Block - С задачами") {
    let shift = CurrentShift(
        id: 123,
        planId: 456,
        status: .opened,
        assignmentId: 123,
        openedAt: nil,
        closedAt: nil,
        shiftDate: "2025-02-12",
        startTime: "08:00:00",
        endTime: "20:00:00",
        externalId: nil,
        duration: nil,
        store: nil
    )

    let tasks = [
        Task(
            id: UUID(),
            title: "Задача 1",
            description: "Описание задачи 1",
            plannedMinutes: 60,
            creatorId: 1,
            assigneeId: 2,
            state: .completed,
            reviewState: .accepted,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Task(
            id: UUID(),
            title: "Задача 2",
            description: "Описание задачи 2",
            plannedMinutes: 90,
            creatorId: 1,
            assigneeId: 2,
            state: .completed,
            reviewState: .accepted,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Task(
            id: UUID(),
            title: "Задача 3",
            description: "Описание задачи 3",
            plannedMinutes: 30,
            creatorId: 1,
            assigneeId: 2,
            state: .inProgress,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Task(
            id: UUID(),
            title: "Задача 4",
            description: "Описание задачи 4",
            plannedMinutes: 45,
            creatorId: 1,
            assigneeId: 2,
            state: .new,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Task(
            id: UUID(),
            title: "Задача 5",
            description: "Описание задачи 5",
            plannedMinutes: 120,
            creatorId: 1,
            assigneeId: 2,
            state: .new,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]

    ShiftInfoBlock(shift: shift, tasks: tasks)
        .padding(16)
        .wfmTheme()
}

#Preview("Shift Info Block - Пустой список") {
    let shift = CurrentShift(
        id: 124,
        planId: 457,
        status: .opened,
        assignmentId: 124,
        openedAt: nil,
        closedAt: nil,
        shiftDate: "2025-03-15",
        startTime: "09:00:00",
        endTime: "18:00:00",
        externalId: nil,
        duration: nil,
        store: nil
    )

    ShiftInfoBlock(shift: shift, tasks: [])
        .padding(16)
        .wfmTheme()
}
