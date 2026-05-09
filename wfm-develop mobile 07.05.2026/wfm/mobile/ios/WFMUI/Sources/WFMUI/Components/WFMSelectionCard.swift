import SwiftUI

/// Тип карточки выбора
public enum WFMSelectionCardType {
    /// С чекбоксом для множественного выбора
    case select
    /// Со стрелкой для перехода на следующий экран
    case open
}

/// Карточка для списков выбора (сотрудники, фильтры и т.д.)
public struct WFMSelectionCard: View {
    private let title: String
    private let type: WFMSelectionCardType
    private let isChecked: Bool
    private let showBorder: Bool
    private let horizontalPadding: CGFloat
    private let verticalPadding: CGFloat
    private let onTap: (() -> Void)?

    @Environment(\.wfmColors) private var colors

    /// Инициализатор карточки выбора
    /// - Parameters:
    ///   - title: Текст карточки
    ///   - type: Тип карточки (select или open)
    ///   - isChecked: Выбрана ли карточка (только для type = .select)
    ///   - showBorder: Показывать ли бордер и скругление (по умолчанию true)
    ///   - onTap: Действие при нажатии
    public init(
        title: String,
        type: WFMSelectionCardType = .select,
        isChecked: Bool = false,
        showBorder: Bool = true,
        horizontalPadding: CGFloat = WFMSpacing.m,
        verticalPadding: CGFloat = WFMSpacing.m,
        onTap: (() -> Void)? = nil
    ) {
        self.title = title
        self.type = type
        self.isChecked = isChecked
        self.showBorder = showBorder
        self.horizontalPadding = horizontalPadding
        self.verticalPadding = verticalPadding
        self.onTap = onTap
    }

    public var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: WFMSpacing.s) {
                // Текст
                Text(title)
                    .font(WFMTypography.headline14Medium)
                    .foregroundColor(colors.cardTextPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Чекбокс или стрелка
                trailingIcon
            }
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .background(colors.cardSurfaceSecondary)
            .if(showBorder) { view in
                view
                    .cornerRadius(WFMRadius.xl)
                    .overlay(
                        RoundedRectangle(cornerRadius: WFMRadius.xl)
                            .stroke(colors.cardBorderSecondary, lineWidth: WFMStroke.s)
                    )
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    @ViewBuilder
    private var trailingIcon: some View {
        switch type {
        case .select:
            WFMCheckbox(isChecked: isChecked)
        case .open:
            WFMIcons.chevronRight
                .resizable()
                .renderingMode(.template)
                .foregroundColor(colors.cardIconPrimary)
                .frame(width: 24, height: 24)
        }
    }
}

// MARK: - Helper Extension

extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

#if DEBUG
struct WFMSelectionCard_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            // Select type
            VStack(spacing: 8) {
                WFMSelectionCard(
                    title: "Все",
                    type: .select,
                    isChecked: true
                )

                WFMSelectionCard(
                    title: "Григорьев П.С.",
                    type: .select,
                    isChecked: false
                )
            }

            Divider()

            // Open type
            WFMSelectionCard(
                title: "Вино",
                type: .open
            )
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .wfmTheme()
    }
}
#endif
