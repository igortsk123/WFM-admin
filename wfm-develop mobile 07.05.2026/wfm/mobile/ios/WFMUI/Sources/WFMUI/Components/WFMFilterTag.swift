import SwiftUI

/// Тег фильтра с индикатором количества и крестиком для удаления
public struct WFMFilterTag: View {
    @Environment(\.wfmColors) private var colors

    private let text: String
    private let count: Int?
    private let onRemove: () -> Void

    public init(
        text: String,
        count: Int? = nil,
        onRemove: @escaping () -> Void
    ) {
        self.text = text
        self.count = count
        self.onRemove = onRemove
    }

    public var body: some View {
        HStack(spacing: WFMSpacing.xxs) {
            Text(text)
                .font(WFMTypography.body14Regular)
                .foregroundColor(colors.badgeBrandTextBright)

            if let count = count {
                // Индикатор с количеством
                ZStack {
                    RoundedRectangle(cornerRadius: WFMRadius.xs)
                        .fill(colors.indicatorsBgFilled)
                        .frame(width: 20, height: 20)

                    Text("\(count)")
                        .font(WFMTypography.headline10Medium)
                        .foregroundColor(colors.indicatorsIcon)
                }
            }

            // Кнопка удаления
            Button(action: onRemove) {
                WFMIcons.closeIcon
                    .foregroundColor(colors.badgeBrandTextBright)
                    .frame(width: 20, height: 20)
            }
        }
        .padding(.horizontal, WFMSpacing.m)
        .padding(.vertical, WFMSpacing.xs)
        .background(colors.badgeBrandBgLight)
        .clipShape(RoundedRectangle(cornerRadius: WFMRadius.m))
    }
}
