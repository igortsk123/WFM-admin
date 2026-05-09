import SwiftUI
import UIKit

// MARK: - Font Registration

/// Регистрирует шрифты Inter из bundle
/// Вызывается автоматически при первом использовании
private let registerFonts: Void = {
    let fontNames = [
        "Inter-Regular",
        "Inter-Medium",
        "Inter-SemiBold",
        "Inter-Bold"
    ]

    var registeredFonts: [String] = []

    for fontName in fontNames {
        // Пробуем найти в Fonts subdirectory
        var fontURL = Bundle.module.url(forResource: fontName, withExtension: "ttf", subdirectory: "Fonts")

        // Если не нашли, пробуем без subdirectory
        if fontURL == nil {
            fontURL = Bundle.module.url(forResource: fontName, withExtension: "ttf")
        }

        guard let fontURL = fontURL,
              let fontData = try? Data(contentsOf: fontURL),
              let dataProvider = CGDataProvider(data: fontData as CFData),
              let font = CGFont(dataProvider) else {
            continue
        }

        var error: Unmanaged<CFError>?
        let success = CTFontManagerRegisterGraphicsFont(font, &error)

        if success, let postScriptName = font.postScriptName as String? {
            registeredFonts.append(postScriptName)
        }
    }

    if !registeredFonts.isEmpty {
        print("✅ Шрифты загружены и готовы к использованию: \(registeredFonts.joined(separator: ", "))")
    }
}()

// MARK: - Custom Font Helper

/// Создаёт Font с Inter или fallback на system
/// Поддерживает Dynamic Type через relativeTo
private func interFont(size: CGFloat, weight: Font.Weight, relativeTo textStyle: Font.TextStyle) -> Font {
    // Регистрируем шрифты при первом вызове
    _ = registerFonts

    let fontName: String
    switch weight {
    case .regular:
        fontName = "Inter-Regular"
    case .medium:
        fontName = "Inter-Medium"
    case .semibold:
        fontName = "Inter-SemiBold"
    case .bold:
        fontName = "Inter-Bold"
    default:
        fontName = "Inter-Regular"
    }

    // Проверяем, загружен ли шрифт
    if UIFont(name: fontName, size: size) != nil {
        // Используем кастомный шрифт с Dynamic Type
        return Font.custom(fontName, size: size, relativeTo: textStyle)
    } else {
        // Fallback на системный шрифт с Dynamic Type
        return Font.system(size: size, weight: weight, design: .default)
    }
}

// MARK: - Typography

/// Типографика дизайн-системы WFM
/// Токены из Figma, шрифт Inter
/// Поддерживает Dynamic Type
public enum WFMTypography {
    // MARK: - Headlines

    /// 24px Bold - заголовки экранов
    public static let headline24Bold = interFont(size: 24, weight: .bold, relativeTo: .largeTitle)

    /// 20px Bold - заголовки разделов
    public static let headline20Bold = interFont(size: 20, weight: .bold, relativeTo: .title2)

    /// 18px Bold - заголовки секций
    public static let headline18Bold = interFont(size: 18, weight: .bold, relativeTo: .title3)

    /// 16px Bold - заголовки секций, кнопки
    public static let headline16Bold = interFont(size: 16, weight: .bold, relativeTo: .headline)

    /// 16px Medium - link кнопки
    public static let headline16Medium = interFont(size: 16, weight: .medium, relativeTo: .headline)

    /// 14px Bold - заголовки форм, лейблы
    public static let headline14Bold = interFont(size: 14, weight: .bold, relativeTo: .subheadline)

    /// 14px Medium - подзаголовки
    public static let headline14Medium = interFont(size: 14, weight: .medium, relativeTo: .subheadline)

    /// 12px Medium - бейджи, малые заголовки
    public static let headline12Medium = interFont(size: 12, weight: .medium, relativeTo: .caption)

    /// 10px Medium - табы, малые лейблы
    public static let headline10Medium = interFont(size: 10, weight: .medium, relativeTo: .caption2)

    // MARK: - Body

    /// 16px Regular - основной текст
    public static let body16Regular = interFont(size: 16, weight: .regular, relativeTo: .body)

    /// 15px Regular - текст тоста (secondary text)
    public static let body15Regular = interFont(size: 15, weight: .regular, relativeTo: .body)

    /// 14px Regular - вторичный текст
    public static let body14Regular = interFont(size: 14, weight: .regular, relativeTo: .subheadline)

    /// 14px Bold - акцентный текст
    public static let body14Bold = interFont(size: 14, weight: .bold, relativeTo: .subheadline)

    /// 12px Regular - малый текст
    public static let body12Regular = interFont(size: 12, weight: .regular, relativeTo: .caption)

    // MARK: - Caption

    /// 12px Regular - подписи
    public static let caption12Regular = interFont(size: 12, weight: .regular, relativeTo: .caption)
}

// MARK: - Line Heights

public extension WFMTypography {
    /// Line heights для соответствия Figma
    enum LineHeight {
        public static let headline24: CGFloat = 32
        public static let headline20: CGFloat = 28
        public static let headline18: CGFloat = 26
        public static let headline16: CGFloat = 24
        public static let headline14: CGFloat = 20
        public static let headline12: CGFloat = 16
        public static let headline10: CGFloat = 14
        public static let body16: CGFloat = 24
        public static let body15: CGFloat = 22
        public static let body14: CGFloat = 20
        public static let caption12: CGFloat = 16
    }
}

// MARK: - Letter Spacing

public extension WFMTypography {
    /// Letter spacing для соответствия Figma
    enum LetterSpacing {
        public static let headline16Bold: CGFloat = -0.32
        public static let headline16Medium: CGFloat = 0
        public static let headline14Medium: CGFloat = 0
        public static let headline12Medium: CGFloat = 0
        public static let body14Bold: CGFloat = -0.21
    }
}

// MARK: - View Modifier for Typography

public struct WFMTextStyle: ViewModifier {
    let font: Font
    let lineHeight: CGFloat
    let letterSpacing: CGFloat

    public init(font: Font, lineHeight: CGFloat, letterSpacing: CGFloat = 0) {
        self.font = font
        self.lineHeight = lineHeight
        self.letterSpacing = letterSpacing
    }

    public func body(content: Content) -> some View {
        content
            .font(font)
            .lineSpacing(lineHeight - 17) // Approximate adjustment
            .tracking(letterSpacing)
    }
}

public extension View {
    /// Headline 24px Bold
    func wfmHeadline24Bold() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.headline24Bold,
            lineHeight: WFMTypography.LineHeight.headline24
        ))
    }

    /// Headline 20px Bold
    func wfmHeadline20Bold() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.headline20Bold,
            lineHeight: WFMTypography.LineHeight.headline20
        ))
    }

    /// Headline 18px Bold
    func wfmHeadline18Bold() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.headline18Bold,
            lineHeight: WFMTypography.LineHeight.headline18
        ))
    }

    /// Headline 16px Bold
    func wfmHeadline16Bold() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.headline16Bold,
            lineHeight: WFMTypography.LineHeight.headline16,
            letterSpacing: WFMTypography.LetterSpacing.headline16Bold
        ))
    }

    /// Headline 14px Bold
    func wfmHeadline14Bold() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.headline14Bold,
            lineHeight: WFMTypography.LineHeight.headline14,
            letterSpacing: WFMTypography.LetterSpacing.body14Bold
        ))
    }

    /// Headline 14px Medium
    func wfmHeadline14Medium() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.headline14Medium,
            lineHeight: WFMTypography.LineHeight.headline14
        ))
    }

    /// Body 15px Regular (text toast)
    func wfmBody15Regular() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.body15Regular,
            lineHeight: WFMTypography.LineHeight.body15
        ))
    }

    /// Body 16px Regular
    func wfmBody16Regular() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.body16Regular,
            lineHeight: WFMTypography.LineHeight.body16
        ))
    }

    /// Body 14px Regular
    func wfmBody14Regular() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.body14Regular,
            lineHeight: WFMTypography.LineHeight.body14
        ))
    }

    /// Body 14px Bold
    func wfmBody14Bold() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.body14Bold,
            lineHeight: WFMTypography.LineHeight.body14,
            letterSpacing: WFMTypography.LetterSpacing.body14Bold
        ))
    }

    /// Body 12px Regular
    func wfmBody12Regular() -> some View {
        modifier(WFMTextStyle(
            font: WFMTypography.body12Regular,
            lineHeight: WFMTypography.LineHeight.caption12
        ))
    }
}
