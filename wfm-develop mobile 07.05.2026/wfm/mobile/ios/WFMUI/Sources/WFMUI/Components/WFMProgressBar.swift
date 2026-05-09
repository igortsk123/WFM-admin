import SwiftUI

// MARK: - Progress Type

/// Тип прогресс-бара
public enum WFMProgressType {
    case solid      // Сплошной индикатор
    case dashed     // Сегментированный индикатор
}

// MARK: - Progress State

/// Состояние прогресса
public enum WFMProgressState {
    case normal     // Обычное состояние (фиолетовая полоска)
    case paused     // На паузе (заштрихованная полоска)
}

// MARK: - WFMProgressBar

/// Компонент прогресс-бара из дизайн-системы WFM
/// Figma: node-id=1900-131030
public struct WFMProgressBar: View {
    // MARK: - Properties

    private let progress: Double        // От 0.0 до 1.0
    private let type: WFMProgressType
    private let state: WFMProgressState
    private let segmentCount: Int       // Количество сегментов для dashed типа
    private let showText: Bool
    private let text: String?

    @Environment(\.wfmColors) private var colors

    // MARK: - Constants

    private static let barHeight: CGFloat = 4
    private static let barSpacing: CGFloat = 4
    private static let cornerRadius: CGFloat = 10

    // MARK: - Init

    /// Инициализатор прогресс-бара
    /// - Parameters:
    ///   - progress: Прогресс от 0.0 до 1.0
    ///   - type: Тип прогресс-бара (solid/dashed)
    ///   - state: Состояние прогресса (normal/paused)
    ///   - segmentCount: Количество сегментов для dashed типа (по умолчанию 5)
    ///   - showText: Показывать ли текст под прогресс-баром
    ///   - text: Текст под прогресс-баром (по умолчанию "5 основных задач")
    public init(
        progress: Double,
        type: WFMProgressType = .solid,
        state: WFMProgressState = .normal,
        segmentCount: Int = 5,
        showText: Bool = true,
        text: String? = nil
    ) {
        self.progress = min(max(progress, 0.0), 1.0) // Ограничиваем 0...1
        self.type = type
        self.state = state
        self.segmentCount = segmentCount
        self.showText = showText
        self.text = text
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: WFMSpacing.xs) {
            // Прогресс-бар
            switch type {
            case .solid:
                solidProgressBar
            case .dashed:
                dashedProgressBar
            }

            // Текст (опционально)
            if showText {
                HStack {
                    Text(text ?? "5 основных задач")
                        .font(WFMTypography.body14Regular)
                        .foregroundStyle(colors.indicatorsText)
                    Spacer()
                }
            }
        }
    }

    // MARK: - Solid Progress Bar

    private var solidProgressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Фон (пустой прогресс)
                RoundedRectangle(cornerRadius: Self.cornerRadius)
                    .fill(colors.indicatorsBgEmpty)
                    .frame(height: Self.barHeight)

                // Заполненная часть
                if state == .paused {
                    // Заштрихованная полоска для паузы
                    StripedProgressView(color: colors.indicatorsPause)
                        .frame(width: geometry.size.width * progress, height: Self.barHeight)
                        .clipShape(RoundedRectangle(cornerRadius: Self.cornerRadius))
                } else {
                    // Обычная фиолетовая полоска
                    RoundedRectangle(cornerRadius: Self.cornerRadius)
                        .fill(colors.indicatorsBgFilled)
                        .frame(width: geometry.size.width * progress, height: Self.barHeight)
                }
            }
        }
        .frame(height: Self.barHeight)
    }

    // MARK: - Dashed Progress Bar

    private var dashedProgressBar: some View {
        HStack(spacing: Self.barSpacing) {
            ForEach(0..<segmentCount, id: \.self) { index in
                let segmentProgress = Double(index + 1) / Double(segmentCount)
                let isFilled = progress >= segmentProgress

                if state == .paused && isFilled {
                    // Заштрихованный сегмент для паузы
                    StripedProgressView(color: colors.indicatorsPause)
                        .frame(height: Self.barHeight)
                        .clipShape(RoundedRectangle(cornerRadius: Self.cornerRadius))
                } else {
                    // Обычный сегмент
                    RoundedRectangle(cornerRadius: Self.cornerRadius)
                        .fill(isFilled ? colors.indicatorsBgFilled : colors.indicatorsBgEmpty)
                        .frame(height: Self.barHeight)
                }
            }
        }
        .frame(height: Self.barHeight)
    }
}

// MARK: - Striped Progress View

/// Заштрихованная полоска для состояния паузы
private struct StripedProgressView: View {
    let color: Color

    var body: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                // Рисуем фон
                let bgRect = CGRect(origin: .zero, size: size)
                context.fill(Path(bgRect), with: .color(color.opacity(0.3)))

                // Параметры полосок
                let stripeWidth: CGFloat = 3
                let stripeSpacing: CGFloat = 3
                let stripeAngle: CGFloat = -45 * .pi / 180

                // Рисуем диагональные полоски
                let totalWidth = size.width + size.height
                var x: CGFloat = -size.height

                while x < totalWidth {
                    let path = Path { p in
                        p.move(to: CGPoint(x: x, y: 0))
                        p.addLine(to: CGPoint(x: x + size.height, y: size.height))
                        p.addLine(to: CGPoint(x: x + size.height + stripeWidth, y: size.height))
                        p.addLine(to: CGPoint(x: x + stripeWidth, y: 0))
                        p.closeSubpath()
                    }
                    context.fill(path, with: .color(color))
                    x += stripeWidth + stripeSpacing
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Solid - Empty") {
    VStack(spacing: 24) {
        WFMProgressBar(progress: 0, type: .solid, showText: true)
        WFMProgressBar(progress: 0, type: .solid, showText: false)
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Solid - Partial") {
    VStack(spacing: 24) {
        WFMProgressBar(progress: 0.2, type: .solid, showText: true)
        WFMProgressBar(progress: 0.5, type: .solid, showText: true)
        WFMProgressBar(progress: 0.8, type: .solid, showText: true)
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Solid - Complete") {
    VStack(spacing: 24) {
        WFMProgressBar(progress: 1.0, type: .solid, showText: true)
        WFMProgressBar(progress: 1.0, type: .solid, showText: false)
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Dashed") {
    VStack(spacing: 24) {
        WFMProgressBar(progress: 0, type: .dashed, showText: true)
        WFMProgressBar(progress: 0.2, type: .dashed, showText: true)
        WFMProgressBar(progress: 0.5, type: .dashed, showText: true)
        WFMProgressBar(progress: 0.8, type: .dashed, showText: true)
        WFMProgressBar(progress: 1.0, type: .dashed, showText: true)
        WFMProgressBar(progress: 0.4, type: .dashed, segmentCount: 10, showText: true, text: "4 из 10 задач")
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}

#Preview("Paused State") {
    VStack(spacing: 24) {
        WFMProgressBar(progress: 0.3, type: .solid, state: .paused, showText: true, text: "Выполнено 1 из 5 основных задач")
        WFMProgressBar(progress: 0.5, type: .solid, state: .paused, showText: true, text: "Выполнено 1 из 5 основных задач")
        WFMProgressBar(progress: 0.6, type: .dashed, state: .paused, showText: true, text: "Выполнено 1 из 5 основных задач")
    }
    .padding(16)
    .background(WFMPrimitiveColors.neutral100)
    .wfmTheme()
}
