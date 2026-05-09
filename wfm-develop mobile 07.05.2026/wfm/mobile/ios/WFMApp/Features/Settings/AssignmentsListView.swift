import SwiftUI
import WFMUI

/// Экран списка назначений пользователя
///
/// Отображает список всех назначений с выбором через радиокнопку
struct AssignmentsListView: View {
    @Environment(\.wfmColors) private var colors
    @Environment(\.dismiss) private var dismiss

    let assignments: [Assignment]
    let selectedAssignmentId: Int?
    let onSelectAssignment: (Assignment) -> Void

    @State private var selectedId: Int?

    init(
        assignments: [Assignment],
        selectedAssignmentId: Int?,
        onSelectAssignment: @escaping (Assignment) -> Void
    ) {
        self.assignments = assignments
        self.selectedAssignmentId = selectedAssignmentId
        self.onSelectAssignment = onSelectAssignment
        _selectedId = State(initialValue: selectedAssignmentId)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Заголовок с кнопкой назад
            HStack(spacing: 0) {
                // Кнопка назад + заголовок
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 0) {
                        // Иконка 24x24 внутри кликабельной области 44x44
                        ZStack {
                            Color.clear
                                .frame(width: 44, height: 44)
                            WFMIcons.arrowLeft
                                .resizable()
                                .renderingMode(.template)
                                .frame(width: 24, height: 24)
                                .foregroundColor(colors.iconPrimary)
                        }

                        Text("Выберите должность")
                            .font(WFMTypography.headline16Bold)
                            .tracking(WFMTypography.LetterSpacing.headline16Bold)
                            .foregroundColor(colors.textPrimary)
                    }
                }
                .buttonStyle(PlainButtonStyle())

                Spacer()
            }
            .padding(.horizontal, WFMSpacing.m)
            .padding(.vertical, WFMSpacing.xxs)
            .background(colors.surfaceBase)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(colors.barsBorder),
                alignment: .bottom
            )

            // Список назначений
            ScrollView {
                VStack(spacing: WFMSpacing.m) {
                    ForEach(assignments, id: \.id) { assignment in
                        AssignmentRow(
                            assignment: assignment,
                            isSelected: selectedId == assignment.id
                        ) {
                            selectedId = assignment.id
                            onSelectAssignment(assignment)
                        }
                    }
                }
                .padding(WFMSpacing.l)
            }
            .background(colors.surfaceBase)
        }
        .background(colors.surfaceBase)
    }
}

// MARK: - Assignment Row

/// Ячейка с информацией о назначении
private struct AssignmentRow: View {
    @Environment(\.wfmColors) private var colors

    let assignment: Assignment
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            HStack(spacing: WFMSpacing.m) {
                // Контент: Badge + адрес магазина
                VStack(alignment: .leading, spacing: WFMSpacing.m) {
                    // Badge с должностью
                    if let positionName = assignment.position?.name {
                        WFMBadge(
                            text: positionName,
                            color: assignment.badgeColor()
                        )
                    }

                    // Адрес магазина с иконкой pin
                    HStack(spacing: 4) {
                        WFMIcons.pinFilledIcon
                            .resizable()
                            .renderingMode(.original)
                            .frame(width: 12, height: 12)

                        if let address = assignment.store?.address {
                            Text(address)
                                .font(WFMTypography.headline12Medium)
                                .tracking(WFMTypography.LetterSpacing.headline12Medium)
                                .foregroundColor(colors.cardTextSecondary)
                        } else if let storeName = assignment.store?.name {
                            Text(storeName)
                                .font(WFMTypography.headline12Medium)
                                .tracking(WFMTypography.LetterSpacing.headline12Medium)
                                .foregroundColor(colors.cardTextSecondary)
                        }
                    }
                }

                Spacer()

                // Радиокнопка
                WFMRadioButton(isSelected: isSelected)
            }
            .padding(WFMSpacing.m)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colors.surfaceSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.l)
                    .stroke(colors.cardBorderSecondary, lineWidth: 1)
            )
            .cornerRadius(WFMRadius.l)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview

#Preview {
    AssignmentsListView(
        assignments: [
            Assignment(
                id: 1,
                externalId: 123,
                companyName: "Компания 1",
                position: Position(
                    id: 1,
                    code: "seller",
                    name: "Продавец-универсал",
                    description: nil,
                    role: Role(
                        id: 1,
                        code: "worker",
                        name: "Работник",
                        description: nil
                    )
                ),
                rank: nil,
                store: Store(
                    id: 1,
                    name: "Магазин на Некрасова 41",
                    address: "С-12 Некрасова, 41 (ИР)",
                    createdAt: Date()
                ),
                dateStart: "2025-01-01",
                dateEnd: nil
            ),
            Assignment(
                id: 2,
                externalId: 124,
                companyName: "Компания 1",
                position: Position(
                    id: 2,
                    code: "cashier",
                    name: "Кассир",
                    description: nil,
                    role: Role(
                        id: 1,
                        code: "worker",
                        name: "Работник",
                        description: nil
                    )
                ),
                rank: nil,
                store: Store(
                    id: 2,
                    name: "Магазин на Учебной 37",
                    address: "С-17 Учебная 37, 41 (ИР)",
                    createdAt: Date()
                ),
                dateStart: "2025-02-01",
                dateEnd: nil
            )
        ],
        selectedAssignmentId: 1,
        onSelectAssignment: { _ in }
    )
    .wfmTheme()
}
