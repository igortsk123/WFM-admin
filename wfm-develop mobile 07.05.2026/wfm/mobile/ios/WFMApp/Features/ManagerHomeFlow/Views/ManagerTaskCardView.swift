import SwiftUI
import WFMUI

/// Карточка задачи для менеджера (отображается на главной странице в секции "Задачи на проверку")
/// Дизайн: Figma node-id=3601:15750
struct ManagerTaskCardView: View {
    let task: Task
    let onTap: () -> Void

    @Environment(\.wfmColors) private var colors

    var body: some View {
        Button(action: onTap) {
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

                    // Название зоны
                    Text(task.zoneDisplayName())
                        .wfmHeadline14Medium()
                        .foregroundStyle(colors.cardTextPrimary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .padding(.top, WFMSpacing.m)
                .padding(.horizontal, WFMSpacing.m)
                .padding(.bottom, WFMSpacing.s)

                // Строка: Время + Имя работника
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

                    // Имя работника
                    if let assignee = task.assignee {
                        Text(assignee.formattedName)
                            .font(WFMTypography.headline14Medium)
                            .foregroundStyle(colors.cardTextPrimary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                }
                .padding(.horizontal, WFMSpacing.m)
                .padding(.bottom, WFMSpacing.m)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colors.cardSurfaceSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.xl)
                    .stroke(colors.cardBorderSecondary, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: WFMRadius.xl))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview("Manager Task Card") {
    VStack(spacing: 8) {
        ManagerTaskCardView(
            task: Task(
                id: UUID(),
                title: nil,
                description: "Уборка в отделе ФРОВ",
                plannedMinutes: 30,
                assigneeId: 123,
                assignee: AssigneeBrief(
                    id: 123,
                    firstName: "Анна",
                    lastName: "Елисеева",
                    middleName: "Михайловна"
                ),
                state: .completed,
                workType: WorkType(id: 4, name: "Другие работы"),
                zone: Zone(id: 1, name: "ФРОВ", priority: 1),
                category: Category(id: 1, name: "Уборка"),
                timeStart: "08:30:00",
                timeEnd: "09:00:00"
            ),
            onTap: {}
        )

        ManagerTaskCardView(
            task: Task(
                id: UUID(),
                title: nil,
                description: "Молочные продукты",
                plannedMinutes: 60,
                assigneeId: 456,
                assignee: AssigneeBrief(
                    id: 456,
                    firstName: "Иван",
                    lastName: "Петров",
                    middleName: nil
                ),
                state: .completed,
                workType: WorkType(id: 3, name: "Смена ценников"),
                zone: Zone(id: 2, name: "Молочка", priority: 2),
                category: Category(id: 2, name: "Переоценка"),
                timeStart: "11:00:00",
                timeEnd: "12:00:00"
            ),
            onTap: {}
        )
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}
