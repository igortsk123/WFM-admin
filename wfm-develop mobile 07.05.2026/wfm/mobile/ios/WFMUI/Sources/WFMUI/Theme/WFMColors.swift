import SwiftUI

// MARK: - Primitive Colors

/// Примитивные цвета дизайн-системы WFM
/// Токены из Figma (одинаковы для Light/Dark)
public enum WFMPrimitiveColors {
    // MARK: - Brand (фиолетовый)

    public static let brand0 = Color(hex: 0xF8F5FF)
    public static let brand100 = Color(hex: 0xEFE8FF)
    public static let brand200 = Color(hex: 0xB398F9)
    public static let brand300 = Color(hex: 0x9570F2)
    public static let brand400 = Color(hex: 0x7C50E9)
    public static let brand500 = Color(hex: 0x6738DD)
    public static let brand600 = Color(hex: 0x5627CD)
    public static let brand700 = Color(hex: 0x471BB8)
    public static let brand800 = Color(hex: 0x3B13A0)
    public static let brand900 = Color(hex: 0x300E87)

    // MARK: - Neutral (серый)

    public static let neutral0 = Color(hex: 0xFFFFFF)
    public static let neutral100 = Color(hex: 0xF5F5FC)
    public static let neutral200 = Color(hex: 0xEEEEF8)
    public static let neutral300 = Color(hex: 0xE5E5F1)
    public static let neutral400 = Color(hex: 0xDADAE7)
    public static let neutral500 = Color(hex: 0x9898AE)
    public static let neutral600 = Color(hex: 0x808095)
    public static let neutral700 = Color(hex: 0x737385)
    public static let neutral800 = Color(hex: 0x5E5E6D)
    public static let neutral900 = Color(hex: 0x373742)

    // MARK: - Red (Red)

    public static let red100 = Color(hex: 0xF8C7CB)
    public static let red200 = Color(hex: 0xF3A1A7)
    public static let red300 = Color(hex: 0xEE7B84)
    public static let red400 = Color(hex: 0xE8505B)
    public static let red50 = Color(hex: 0xFDEDEE)
    public static let red500 = Color(hex: 0xE4303D)
    public static let red600 = Color(hex: 0xCE1B28)
    public static let red700 = Color(hex: 0xA81621)
    public static let red800 = Color(hex: 0x821119)
    public static let red900 = Color(hex: 0x36070B)

    // MARK: - Green (Green)

    public static let green100 = Color(hex: 0xD5ECD2)
    public static let green200 = Color(hex: 0xBCE0B7)
    public static let green300 = Color(hex: 0xA3D49C)
    public static let green400 = Color(hex: 0x8AC881)
    public static let green50 = Color(hex: 0xEEF7ED)
    public static let green500 = Color(hex: 0x7CC272)
    public static let green600 = Color(hex: 0x59B04C)
    public static let green700 = Color(hex: 0x4B9540)
    public static let green800 = Color(hex: 0x3D7A35)
    public static let green900 = Color(hex: 0x22441D)

    // MARK: - Blue (Blue)

    public static let blue100 = Color(hex: 0xEAF7FB)
    public static let blue200 = Color(hex: 0xAAC3FA)
    public static let blue300 = Color(hex: 0x80A6F8)
    public static let blue400 = Color(hex: 0x5588F5)
    public static let blue50 = Color(hex: 0xFFFFFF)
    public static let blue500 = Color(hex: 0x326FF3)
    public static let blue600 = Color(hex: 0x0D51E3)
    public static let blue700 = Color(hex: 0x0B42B9)
    public static let blue800 = Color(hex: 0x08338F)
    public static let blue900 = Color(hex: 0x031C50)

    // MARK: - Yellow (Yellow)

    public static let yellow100 = Color(hex: 0xFEF5E2)
    public static let yellow200 = Color(hex: 0xFFEBC0)
    public static let yellow300 = Color(hex: 0xFFD06A)
    public static let yellow400 = Color(hex: 0xFFC33F)
    public static let yellow50 = Color(hex: 0xFFF7E3)
    public static let yellow500 = Color(hex: 0xFFB514)
    public static let yellow600 = Color(hex: 0xFEAE00)
    public static let yellow700 = Color(hex: 0xA65E01)
    public static let yellow800 = Color(hex: 0x934700)
    public static let yellow900 = Color(hex: 0x3D2A00)

    // MARK: - Pink (Pink)

    public static let pink100 = Color(hex: 0xEFD0EF)
    public static let pink200 = Color(hex: 0xE4AFE4)
    public static let pink300 = Color(hex: 0xDA8FDA)
    public static let pink400 = Color(hex: 0xCF6FCF)
    public static let pink50 = Color(hex: 0xFAF0FA)
    public static let pink500 = Color(hex: 0xC44FC4)
    public static let pink600 = Color(hex: 0xAE3AAE)
    public static let pink700 = Color(hex: 0x8E2F8E)
    public static let pink800 = Color(hex: 0x6E256E)
    public static let pink900 = Color(hex: 0x2E0F2E)

    // MARK: - Orange (Orange)

    public static let orange100 = Color(hex: 0xFFD9C0)
    public static let orange200 = Color(hex: 0xFFC095)
    public static let orange300 = Color(hex: 0xFFA66A)
    public static let orange400 = Color(hex: 0xFF8C3F)
    public static let orange50 = Color(hex: 0xFFF3EB)
    public static let orange500 = Color(hex: 0xFF7314)
    public static let orange600 = Color(hex: 0xBE4C00)
    public static let orange700 = Color(hex: 0x933B00)
    public static let orange800 = Color(hex: 0x682A00)
    public static let orange900 = Color(hex: 0x3D1900)

    // MARK: - Gradient (для будущего использования)

    public static let gradientBrandStart = Color(hex: 0x612EE5)
    public static let gradientBrandEnd = Color(hex: 0x9D2CF4)
    public static let gradientHighlightStart = Color(hex: 0xFE6600)
    public static let gradientHighlightEnd = Color(hex: 0xC32B23)
}

// MARK: - Semantic Color Groups

public struct BadgeColors {
    public let blueBgBright: Color
    public let blueBgLight: Color
    public let blueTextBright: Color
    public let blueTextLight: Color
    public let brandBgBright: Color
    public let brandBgLight: Color
    public let brandTextBright: Color
    public let brandTextLight: Color
    public let greenBgBright: Color
    public let greenBgLight: Color
    public let greenTextBright: Color
    public let greenTextLight: Color
    public let orangeBgBright: Color
    public let orangeBgLight: Color
    public let orangeTextBright: Color
    public let orangeTextLight: Color
    public let pinkBgBright: Color
    public let pinkBgLight: Color
    public let pinkTextBright: Color
    public let pinkTextLight: Color
    public let redBgBright: Color
    public let redBgLight: Color
    public let redTextBright: Color
    public let redTextLight: Color
    public let yellowBgBright: Color
    public let yellowBgLight: Color
    public let yellowTextBright: Color
    public let yellowTextLight: Color
}

public struct BarsColors {
    public let border: Color
    public let icon: Color
    public let iconBrand: Color
    public let textPrimary: Color
    public let textSecondary: Color
}

public struct BgColors {
    public let brandDefault: Color
    public let brandDisabled: Color
    public let errorBright: Color
    public let errorLight: Color
    public let infoLight: Color
    public let notInverted: Color
    public let passive: Color
    public let positiveBright: Color
    public let positiveLight: Color
    public let secondaryDefault: Color
    public let secondaryNeutral: Color
    public let secondaryNeutralDisabled: Color
    public let warningBright: Color
    public let warningLight: Color
}

public struct BorderColors {
    public let base: Color
    public let brand: Color
    public let error: Color
    public let positive: Color
    public let secondary: Color
    public let tertiary: Color
    public let warning: Color
}

public struct ButtonColors {
    public let iconBg: Color
    public let iconBorder: Color
    public let iconIconActive: Color
    public let iconIconDisabled: Color
    public let linkIconDefault: Color
    public let linkIconDisabled: Color
    public let linkTextDefault: Color
    public let linkTextDisabled: Color
    public let primaryBgDefault: Color
    public let primaryBgDisabled: Color
    public let primaryBorder: Color
    public let primaryIconDefault: Color
    public let primaryIconDisabled: Color
    public let primaryTextDefault: Color
    public let primaryTextDisabled: Color
    public let secondaryBgDefault: Color
    public let secondaryBgDisabled: Color
    public let secondaryBorder: Color
    public let secondaryIconDefault: Color
    public let secondaryIconDisabled: Color
    public let secondaryTextDefault: Color
    public let secondaryTextDisabled: Color
    public let tertiaryBgDefault: Color
    public let tertiaryBgDisabled: Color
    public let tertiaryIconDefault: Color
    public let tertiaryIconDisabled: Color
    public let tertiaryTextDefault: Color
    public let tertiaryTextDisabled: Color
}

public struct CardColors {
    public let borderError: Color
    public let borderSecondary: Color
    public let borderTertiary: Color
    public let iconBgBrand: Color
    public let iconBrand: Color
    public let iconError: Color
    public let iconPrimary: Color
    public let iconSecondary: Color
    public let surfaceBase: Color
    public let surfaceError: Color
    public let surfaceInfo: Color
    public let surfaceSecondary: Color
    public let textError: Color
    public let textPrimary: Color
    public let textSecondary: Color
    public let textTertuary: Color
}

public struct IconColors {
    public let brand: Color
    public let brandDisabled: Color
    public let empty: Color
    public let error: Color
    public let imgEmptyState: Color
    public let inverse: Color
    public let notInverted: Color
    public let positive: Color
    public let primary: Color
    public let secondary: Color
    public let warning: Color
}

public struct IndicatorsColors {
    public let bgEmpty: Color
    public let bgFilled: Color
    public let icon: Color
    public let pause: Color
    public let text: Color
}

public struct InputColors {
    public let bg: Color
    public let border: Color
    public let borderDisabled: Color
    public let borderError: Color
    public let caption: Color
    public let captionDisabled: Color
    public let captionError: Color
    public let cursor: Color
    public let icon: Color
    public let iconDisabled: Color
    public let label: Color
    public let labelDisabled: Color
    public let placeholder: Color
    public let textDisabled: Color
    public let textFilled: Color
}

public struct SegmentedControlColors {
    public let bg: Color
    public let bgControlActive: Color
    public let border: Color
    public let textActive: Color
    public let textDefault: Color
}

public struct SelectionColors {
    public let bgChecked: Color
    public let bgDefault: Color
    public let bgDisabled: Color
    public let bgThumb: Color
    public let borderDefault: Color
    public let iconChecked: Color
}

public struct SurfaceColors {
    public let base: Color
    public let dark: Color
    public let overlayModal: Color
    public let primary: Color
    public let raised: Color
    public let secondary: Color
    public let tertiary: Color
}

public struct TabbarColors {
    public let bg: Color
    public let border: Color
    public let tabActive: Color
    public let tabDefault: Color
}

public struct TextColors {
    public let brand: Color
    public let brandDisabled: Color
    public let error: Color
    public let inverse: Color
    public let notInverted: Color
    public let placeholder: Color
    public let positive: Color
    public let primary: Color
    public let secondary: Color
    public let tertiary: Color
    public let warning: Color
}

public struct ToastColors {
    public let bg: Color
    public let bgError: Color
    public let text: Color
}

// MARK: - Semantic Colors

/// Семантические цвета для темы WFM
/// Значения меняются в зависимости от Light/Dark режима
public struct WFMSemanticColors {
    public let badge: BadgeColors
    public let bars: BarsColors
    public let bg: BgColors
    public let border: BorderColors
    public let button: ButtonColors
    public let card: CardColors
    public let icon: IconColors
    public let indicators: IndicatorsColors
    public let input: InputColors
    public let segmentedControl: SegmentedControlColors
    public let selection: SelectionColors
    public let surface: SurfaceColors
    public let tabbar: TabbarColors
    public let text: TextColors
    public let toast: ToastColors
}

// MARK: - Extension Properties (обратная совместимость)

public extension WFMSemanticColors {
    // Badge
    var badgeBlueBgBright: Color { badge.blueBgBright }
    var badgeBlueBgLight: Color { badge.blueBgLight }
    var badgeBlueTextBright: Color { badge.blueTextBright }
    var badgeBlueTextLight: Color { badge.blueTextLight }
    var badgeBrandBgBright: Color { badge.brandBgBright }
    var badgeBrandBgLight: Color { badge.brandBgLight }
    var badgeBrandTextBright: Color { badge.brandTextBright }
    var badgeBrandTextLight: Color { badge.brandTextLight }
    var badgeGreenBgBright: Color { badge.greenBgBright }
    var badgeGreenBgLight: Color { badge.greenBgLight }
    var badgeGreenTextBright: Color { badge.greenTextBright }
    var badgeGreenTextLight: Color { badge.greenTextLight }
    var badgeOrangeBgBright: Color { badge.orangeBgBright }
    var badgeOrangeBgLight: Color { badge.orangeBgLight }
    var badgeOrangeTextBright: Color { badge.orangeTextBright }
    var badgeOrangeTextLight: Color { badge.orangeTextLight }
    var badgePinkBgBright: Color { badge.pinkBgBright }
    var badgePinkBgLight: Color { badge.pinkBgLight }
    var badgePinkTextBright: Color { badge.pinkTextBright }
    var badgePinkTextLight: Color { badge.pinkTextLight }
    var badgeRedBgBright: Color { badge.redBgBright }
    var badgeRedBgLight: Color { badge.redBgLight }
    var badgeRedTextBright: Color { badge.redTextBright }
    var badgeRedTextLight: Color { badge.redTextLight }
    var badgeYellowBgBright: Color { badge.yellowBgBright }
    var badgeYellowBgLight: Color { badge.yellowBgLight }
    var badgeYellowTextBright: Color { badge.yellowTextBright }
    var badgeYellowTextLight: Color { badge.yellowTextLight }

    // Bars
    var barsBorder: Color { bars.border }
    var barsIcon: Color { bars.icon }
    var barsIconBrand: Color { bars.iconBrand }
    var barsTextPrimary: Color { bars.textPrimary }
    var barsTextSecondary: Color { bars.textSecondary }

    // Bg
    var bgBrandDefault: Color { bg.brandDefault }
    var bgBrandDisabled: Color { bg.brandDisabled }
    var bgErrorBright: Color { bg.errorBright }
    var bgErrorLight: Color { bg.errorLight }
    var bgInfoLight: Color { bg.infoLight }
    var bgNotInverted: Color { bg.notInverted }
    var bgPassive: Color { bg.passive }
    var bgPositiveBright: Color { bg.positiveBright }
    var bgPositiveLight: Color { bg.positiveLight }
    var bgSecondaryDefault: Color { bg.secondaryDefault }
    var bgSecondaryNeutral: Color { bg.secondaryNeutral }
    var bgSecondaryNeutralDisabled: Color { bg.secondaryNeutralDisabled }
    var bgWarningBright: Color { bg.warningBright }
    var bgWarningLight: Color { bg.warningLight }

    // Border
    var borderBase: Color { border.base }
    var borderBrand: Color { border.brand }
    var borderError: Color { border.error }
    var borderPositive: Color { border.positive }
    var borderSecondary: Color { border.secondary }
    var borderTertiary: Color { border.tertiary }
    var borderWarning: Color { border.warning }

    // Button
    var buttonIconBg: Color { button.iconBg }
    var buttonIconBorder: Color { button.iconBorder }
    var buttonIconIconActive: Color { button.iconIconActive }
    var buttonIconIconDisabled: Color { button.iconIconDisabled }
    var buttonLinkIconDefault: Color { button.linkIconDefault }
    var buttonLinkIconDisabled: Color { button.linkIconDisabled }
    var buttonLinkTextDefault: Color { button.linkTextDefault }
    var buttonLinkTextDisabled: Color { button.linkTextDisabled }
    var buttonPrimaryBgDefault: Color { button.primaryBgDefault }
    var buttonPrimaryBgDisabled: Color { button.primaryBgDisabled }
    var buttonPrimaryBorder: Color { button.primaryBorder }
    var buttonPrimaryIconDefault: Color { button.primaryIconDefault }
    var buttonPrimaryIconDisabled: Color { button.primaryIconDisabled }
    var buttonPrimaryTextDefault: Color { button.primaryTextDefault }
    var buttonPrimaryTextDisabled: Color { button.primaryTextDisabled }
    var buttonSecondaryBgDefault: Color { button.secondaryBgDefault }
    var buttonSecondaryBgDisabled: Color { button.secondaryBgDisabled }
    var buttonSecondaryBorder: Color { button.secondaryBorder }
    var buttonSecondaryIconDefault: Color { button.secondaryIconDefault }
    var buttonSecondaryIconDisabled: Color { button.secondaryIconDisabled }
    var buttonSecondaryTextDefault: Color { button.secondaryTextDefault }
    var buttonSecondaryTextDisabled: Color { button.secondaryTextDisabled }
    var buttonTertiaryBgDefault: Color { button.tertiaryBgDefault }
    var buttonTertiaryBgDisabled: Color { button.tertiaryBgDisabled }
    var buttonTertiaryIconDefault: Color { button.tertiaryIconDefault }
    var buttonTertiaryIconDisabled: Color { button.tertiaryIconDisabled }
    var buttonTertiaryTextDefault: Color { button.tertiaryTextDefault }
    var buttonTertiaryTextDisabled: Color { button.tertiaryTextDisabled }

    // Card
    var cardBorderError: Color { card.borderError }
    var cardBorderSecondary: Color { card.borderSecondary }
    var cardBorderTertiary: Color { card.borderTertiary }
    var cardIconBgBrand: Color { card.iconBgBrand }
    var cardIconBrand: Color { card.iconBrand }
    var cardIconError: Color { card.iconError }
    var cardIconPrimary: Color { card.iconPrimary }
    var cardIconSecondary: Color { card.iconSecondary }
    var cardSurfaceBase: Color { card.surfaceBase }
    var cardSurfaceError: Color { card.surfaceError }
    var cardSurfaceInfo: Color { card.surfaceInfo }
    var cardSurfaceSecondary: Color { card.surfaceSecondary }
    var cardTextError: Color { card.textError }
    var cardTextPrimary: Color { card.textPrimary }
    var cardTextSecondary: Color { card.textSecondary }
    var cardTextTertuary: Color { card.textTertuary }

    // Icon
    var iconBrand: Color { icon.brand }
    var iconBrandDisabled: Color { icon.brandDisabled }
    var iconEmpty: Color { icon.empty }
    var iconError: Color { icon.error }
    var iconImgEmptyState: Color { icon.imgEmptyState }
    var iconInverse: Color { icon.inverse }
    var iconNotInverted: Color { icon.notInverted }
    var iconPositive: Color { icon.positive }
    var iconPrimary: Color { icon.primary }
    var iconSecondary: Color { icon.secondary }
    var iconWarning: Color { icon.warning }

    // Indicators
    var indicatorsBgEmpty: Color { indicators.bgEmpty }
    var indicatorsBgFilled: Color { indicators.bgFilled }
    var indicatorsIcon: Color { indicators.icon }
    var indicatorsPause: Color { indicators.pause }
    var indicatorsText: Color { indicators.text }

    // Input
    var inputBg: Color { input.bg }
    var inputBorder: Color { input.border }
    var inputBorderDisabled: Color { input.borderDisabled }
    var inputBorderError: Color { input.borderError }
    var inputCaption: Color { input.caption }
    var inputCaptionDisabled: Color { input.captionDisabled }
    var inputCaptionError: Color { input.captionError }
    var inputCursor: Color { input.cursor }
    var inputIcon: Color { input.icon }
    var inputIconDisabled: Color { input.iconDisabled }
    var inputLabel: Color { input.label }
    var inputLabelDisabled: Color { input.labelDisabled }
    var inputPlaceholder: Color { input.placeholder }
    var inputTextDisabled: Color { input.textDisabled }
    var inputTextFilled: Color { input.textFilled }

    // Segmentedcontrol
    var segmentedControlBg: Color { segmentedControl.bg }
    var segmentedControlBgControlActive: Color { segmentedControl.bgControlActive }
    var segmentedControlBorder: Color { segmentedControl.border }
    var segmentedControlTextActive: Color { segmentedControl.textActive }
    var segmentedControlTextDefault: Color { segmentedControl.textDefault }

    // Selection
    var selectionBgChecked: Color { selection.bgChecked }
    var selectionBgDefault: Color { selection.bgDefault }
    var selectionBgDisabled: Color { selection.bgDisabled }
    var selectionBgThumb: Color { selection.bgThumb }
    var selectionBorderDefault: Color { selection.borderDefault }
    var selectionIconChecked: Color { selection.iconChecked }

    // Surface
    var surfaceBase: Color { surface.base }
    var surfaceDark: Color { surface.dark }
    var surfaceOverlayModal: Color { surface.overlayModal }
    var surfacePrimary: Color { surface.primary }
    var surfaceRaised: Color { surface.raised }
    var surfaceSecondary: Color { surface.secondary }
    var surfaceTertiary: Color { surface.tertiary }

    // Tabbar
    var tabbarBg: Color { tabbar.bg }
    var tabbarBorder: Color { tabbar.border }
    var tabbarTabActive: Color { tabbar.tabActive }
    var tabbarTabDefault: Color { tabbar.tabDefault }

    // Text
    var textBrand: Color { text.brand }
    var textBrandDisabled: Color { text.brandDisabled }
    var textError: Color { text.error }
    var textInverse: Color { text.inverse }
    var textNotInverted: Color { text.notInverted }
    var textPlaceholder: Color { text.placeholder }
    var textPositive: Color { text.positive }
    var textPrimary: Color { text.primary }
    var textSecondary: Color { text.secondary }
    var textTertiary: Color { text.tertiary }
    var textWarning: Color { text.warning }

    // Toast
    var toastBg: Color { toast.bg }
    var toastBgError: Color { toast.bgError }
    var toastText: Color { toast.text }

}

// MARK: - Light Theme

/// Light тема (из Light.tokens.json)
public let lightWFMColors = WFMSemanticColors(
    badge: BadgeColors(
        blueBgBright: WFMPrimitiveColors.blue500,
        blueBgLight: WFMPrimitiveColors.blue100,
        blueTextBright: WFMPrimitiveColors.blue600,
        blueTextLight: WFMPrimitiveColors.blue100,
        brandBgBright: WFMPrimitiveColors.brand500,
        brandBgLight: WFMPrimitiveColors.brand100,
        brandTextBright: WFMPrimitiveColors.brand500,
        brandTextLight: WFMPrimitiveColors.brand0,
        greenBgBright: WFMPrimitiveColors.green600,
        greenBgLight: WFMPrimitiveColors.green50,
        greenTextBright: WFMPrimitiveColors.green800,
        greenTextLight: WFMPrimitiveColors.green50,
        orangeBgBright: WFMPrimitiveColors.orange400,
        orangeBgLight: WFMPrimitiveColors.orange50,
        orangeTextBright: WFMPrimitiveColors.orange600,
        orangeTextLight: WFMPrimitiveColors.orange50,
        pinkBgBright: WFMPrimitiveColors.pink400,
        pinkBgLight: WFMPrimitiveColors.pink50,
        pinkTextBright: WFMPrimitiveColors.pink600,
        pinkTextLight: WFMPrimitiveColors.pink50,
        redBgBright: WFMPrimitiveColors.red400,
        redBgLight: WFMPrimitiveColors.red50,
        redTextBright: WFMPrimitiveColors.red700,
        redTextLight: WFMPrimitiveColors.red50,
        yellowBgBright: WFMPrimitiveColors.yellow600,
        yellowBgLight: WFMPrimitiveColors.yellow50,
        yellowTextBright: WFMPrimitiveColors.yellow700,
        yellowTextLight: WFMPrimitiveColors.yellow50
    ),
    bars: BarsColors(
        border: WFMPrimitiveColors.neutral200,
        icon: WFMPrimitiveColors.neutral900,
        iconBrand: WFMPrimitiveColors.brand500,
        textPrimary: WFMPrimitiveColors.neutral900,
        textSecondary: WFMPrimitiveColors.neutral800
    ),
    bg: BgColors(
        brandDefault: WFMPrimitiveColors.brand500,
        brandDisabled: WFMPrimitiveColors.brand100,
        errorBright: WFMPrimitiveColors.red500,
        errorLight: WFMPrimitiveColors.red50,
        infoLight: WFMPrimitiveColors.neutral200,
        notInverted: WFMPrimitiveColors.neutral0,
        passive: WFMPrimitiveColors.neutral400,
        positiveBright: WFMPrimitiveColors.green600,
        positiveLight: WFMPrimitiveColors.green50,
        secondaryDefault: WFMPrimitiveColors.brand100,
        secondaryNeutral: WFMPrimitiveColors.neutral200,
        secondaryNeutralDisabled: WFMPrimitiveColors.neutral200,
        warningBright: WFMPrimitiveColors.yellow400,
        warningLight: WFMPrimitiveColors.yellow50
    ),
    border: BorderColors(
        base: WFMPrimitiveColors.brand100,
        brand: WFMPrimitiveColors.brand500,
        error: WFMPrimitiveColors.red500,
        positive: WFMPrimitiveColors.green600,
        secondary: WFMPrimitiveColors.neutral200,
        tertiary: WFMPrimitiveColors.neutral300,
        warning: WFMPrimitiveColors.yellow400
    ),
    button: ButtonColors(
        iconBg: WFMPrimitiveColors.neutral0,
        iconBorder: WFMPrimitiveColors.neutral300,
        iconIconActive: WFMPrimitiveColors.neutral900,
        iconIconDisabled: WFMPrimitiveColors.neutral500,
        linkIconDefault: WFMPrimitiveColors.brand500,
        linkIconDisabled: WFMPrimitiveColors.brand200,
        linkTextDefault: WFMPrimitiveColors.brand500,
        linkTextDisabled: WFMPrimitiveColors.brand200,
        primaryBgDefault: WFMPrimitiveColors.brand500,
        primaryBgDisabled: WFMPrimitiveColors.brand100,
        primaryBorder: WFMPrimitiveColors.brand500,
        primaryIconDefault: WFMPrimitiveColors.neutral0,
        primaryIconDisabled: WFMPrimitiveColors.brand200,
        primaryTextDefault: WFMPrimitiveColors.neutral0,
        primaryTextDisabled: WFMPrimitiveColors.brand200,
        secondaryBgDefault: WFMPrimitiveColors.brand100,
        secondaryBgDisabled: WFMPrimitiveColors.brand100,
        secondaryBorder: WFMPrimitiveColors.brand100,
        secondaryIconDefault: WFMPrimitiveColors.brand500,
        secondaryIconDisabled: WFMPrimitiveColors.brand200,
        secondaryTextDefault: WFMPrimitiveColors.brand500,
        secondaryTextDisabled: WFMPrimitiveColors.brand200,
        tertiaryBgDefault: WFMPrimitiveColors.neutral200,
        tertiaryBgDisabled: WFMPrimitiveColors.neutral200,
        tertiaryIconDefault: WFMPrimitiveColors.neutral900,
        tertiaryIconDisabled: WFMPrimitiveColors.neutral500,
        tertiaryTextDefault: WFMPrimitiveColors.neutral900,
        tertiaryTextDisabled: WFMPrimitiveColors.neutral600
    ),
    card: CardColors(
        borderError: WFMPrimitiveColors.red500,
        borderSecondary: WFMPrimitiveColors.neutral200,
        borderTertiary: WFMPrimitiveColors.neutral300,
        iconBgBrand: WFMPrimitiveColors.brand100,
        iconBrand: WFMPrimitiveColors.brand500,
        iconError: WFMPrimitiveColors.red500,
        iconPrimary: WFMPrimitiveColors.neutral900,
        iconSecondary: WFMPrimitiveColors.neutral600,
        surfaceBase: WFMPrimitiveColors.neutral100,
        surfaceError: WFMPrimitiveColors.red50,
        surfaceInfo: WFMPrimitiveColors.neutral200,
        surfaceSecondary: WFMPrimitiveColors.neutral0,
        textError: WFMPrimitiveColors.red500,
        textPrimary: WFMPrimitiveColors.neutral900,
        textSecondary: WFMPrimitiveColors.neutral800,
        textTertuary: WFMPrimitiveColors.neutral600
    ),
    icon: IconColors(
        brand: WFMPrimitiveColors.brand500,
        brandDisabled: WFMPrimitiveColors.brand200,
        empty: WFMPrimitiveColors.neutral500,
        error: WFMPrimitiveColors.red500,
        imgEmptyState: WFMPrimitiveColors.neutral400,
        inverse: WFMPrimitiveColors.neutral0,
        notInverted: WFMPrimitiveColors.neutral0,
        positive: WFMPrimitiveColors.green600,
        primary: WFMPrimitiveColors.neutral900,
        secondary: WFMPrimitiveColors.neutral600,
        warning: WFMPrimitiveColors.yellow400
    ),
    indicators: IndicatorsColors(
        bgEmpty: WFMPrimitiveColors.neutral200,
        bgFilled: WFMPrimitiveColors.brand500,
        icon: WFMPrimitiveColors.neutral0,
        pause: WFMPrimitiveColors.neutral500,
        text: WFMPrimitiveColors.neutral800
    ),
    input: InputColors(
        bg: WFMPrimitiveColors.neutral0,
        border: WFMPrimitiveColors.neutral200,
        borderDisabled: WFMPrimitiveColors.neutral300,
        borderError: WFMPrimitiveColors.red500,
        caption: WFMPrimitiveColors.neutral800,
        captionDisabled: WFMPrimitiveColors.neutral600,
        captionError: WFMPrimitiveColors.red500,
        cursor: WFMPrimitiveColors.neutral900,
        icon: WFMPrimitiveColors.neutral900,
        iconDisabled: WFMPrimitiveColors.neutral600,
        label: WFMPrimitiveColors.neutral900,
        labelDisabled: WFMPrimitiveColors.neutral600,
        placeholder: WFMPrimitiveColors.neutral500,
        textDisabled: WFMPrimitiveColors.neutral500,
        textFilled: WFMPrimitiveColors.neutral900
    ),
    segmentedControl: SegmentedControlColors(
        bg: WFMPrimitiveColors.neutral200,
        bgControlActive: WFMPrimitiveColors.neutral0,
        border: WFMPrimitiveColors.neutral300,
        textActive: WFMPrimitiveColors.neutral900,
        textDefault: WFMPrimitiveColors.neutral600
    ),
    selection: SelectionColors(
        bgChecked: WFMPrimitiveColors.brand500,
        bgDefault: WFMPrimitiveColors.neutral100,
        bgDisabled: WFMPrimitiveColors.neutral200,
        bgThumb: WFMPrimitiveColors.neutral0,
        borderDefault: WFMPrimitiveColors.neutral300,
        iconChecked: WFMPrimitiveColors.neutral0
    ),
    surface: SurfaceColors(
        base: WFMPrimitiveColors.neutral100,
        dark: WFMPrimitiveColors.neutral900,
        overlayModal: Color(hex: 0x000000, alpha: 0.699999988079071),
        primary: WFMPrimitiveColors.neutral100,
        raised: WFMPrimitiveColors.neutral100,
        secondary: WFMPrimitiveColors.neutral0,
        tertiary: WFMPrimitiveColors.neutral200
    ),
    tabbar: TabbarColors(
        bg: WFMPrimitiveColors.neutral0,
        border: WFMPrimitiveColors.neutral200,
        tabActive: WFMPrimitiveColors.brand500,
        tabDefault: WFMPrimitiveColors.neutral900
    ),
    text: TextColors(
        brand: WFMPrimitiveColors.brand500,
        brandDisabled: WFMPrimitiveColors.brand200,
        error: WFMPrimitiveColors.red500,
        inverse: WFMPrimitiveColors.neutral0,
        notInverted: WFMPrimitiveColors.neutral0,
        placeholder: WFMPrimitiveColors.neutral500,
        positive: WFMPrimitiveColors.green600,
        primary: WFMPrimitiveColors.neutral900,
        secondary: WFMPrimitiveColors.neutral800,
        tertiary: WFMPrimitiveColors.neutral600,
        warning: WFMPrimitiveColors.yellow400
    ),
    toast: ToastColors(
        bg: WFMPrimitiveColors.neutral900,
        bgError: WFMPrimitiveColors.red500,
        text: WFMPrimitiveColors.neutral0
    )
)

// MARK: - Dark Theme

/// Dark тема (из Dark.tokens.json)
public let darkWFMColors = WFMSemanticColors(
    badge: BadgeColors(
        blueBgBright: WFMPrimitiveColors.blue500,
        blueBgLight: WFMPrimitiveColors.blue100,
        blueTextBright: WFMPrimitiveColors.blue600,
        blueTextLight: WFMPrimitiveColors.blue100,
        brandBgBright: WFMPrimitiveColors.brand500,
        brandBgLight: WFMPrimitiveColors.brand100,
        brandTextBright: WFMPrimitiveColors.brand500,
        brandTextLight: WFMPrimitiveColors.brand0,
        greenBgBright: WFMPrimitiveColors.green600,
        greenBgLight: WFMPrimitiveColors.green50,
        greenTextBright: WFMPrimitiveColors.green800,
        greenTextLight: WFMPrimitiveColors.green50,
        orangeBgBright: WFMPrimitiveColors.orange400,
        orangeBgLight: WFMPrimitiveColors.orange50,
        orangeTextBright: WFMPrimitiveColors.orange600,
        orangeTextLight: WFMPrimitiveColors.orange50,
        pinkBgBright: WFMPrimitiveColors.pink400,
        pinkBgLight: WFMPrimitiveColors.pink50,
        pinkTextBright: WFMPrimitiveColors.pink600,
        pinkTextLight: WFMPrimitiveColors.pink50,
        redBgBright: WFMPrimitiveColors.red400,
        redBgLight: WFMPrimitiveColors.red50,
        redTextBright: WFMPrimitiveColors.red700,
        redTextLight: WFMPrimitiveColors.red50,
        yellowBgBright: WFMPrimitiveColors.yellow600,
        yellowBgLight: WFMPrimitiveColors.yellow50,
        yellowTextBright: WFMPrimitiveColors.yellow700,
        yellowTextLight: WFMPrimitiveColors.yellow50
    ),
    bars: BarsColors(
        border: WFMPrimitiveColors.neutral200,
        icon: WFMPrimitiveColors.neutral900,
        iconBrand: WFMPrimitiveColors.brand500,
        textPrimary: WFMPrimitiveColors.neutral900,
        textSecondary: WFMPrimitiveColors.neutral800
    ),
    bg: BgColors(
        brandDefault: WFMPrimitiveColors.brand500,
        brandDisabled: WFMPrimitiveColors.brand100,
        errorBright: WFMPrimitiveColors.red500,
        errorLight: WFMPrimitiveColors.red50,
        infoLight: WFMPrimitiveColors.neutral200,
        notInverted: WFMPrimitiveColors.neutral0,
        passive: WFMPrimitiveColors.neutral400,
        positiveBright: WFMPrimitiveColors.green600,
        positiveLight: WFMPrimitiveColors.green50,
        secondaryDefault: WFMPrimitiveColors.brand100,
        secondaryNeutral: WFMPrimitiveColors.neutral200,
        secondaryNeutralDisabled: WFMPrimitiveColors.neutral200,
        warningBright: WFMPrimitiveColors.yellow400,
        warningLight: WFMPrimitiveColors.yellow50
    ),
    border: BorderColors(
        base: WFMPrimitiveColors.brand100,
        brand: WFMPrimitiveColors.brand500,
        error: WFMPrimitiveColors.red500,
        positive: WFMPrimitiveColors.green600,
        secondary: WFMPrimitiveColors.neutral200,
        tertiary: WFMPrimitiveColors.neutral300,
        warning: WFMPrimitiveColors.yellow400
    ),
    button: ButtonColors(
        iconBg: WFMPrimitiveColors.neutral0,
        iconBorder: WFMPrimitiveColors.neutral300,
        iconIconActive: WFMPrimitiveColors.neutral900,
        iconIconDisabled: WFMPrimitiveColors.neutral500,
        linkIconDefault: WFMPrimitiveColors.brand500,
        linkIconDisabled: WFMPrimitiveColors.brand200,
        linkTextDefault: WFMPrimitiveColors.brand500,
        linkTextDisabled: WFMPrimitiveColors.brand200,
        primaryBgDefault: WFMPrimitiveColors.brand500,
        primaryBgDisabled: WFMPrimitiveColors.brand100,
        primaryBorder: WFMPrimitiveColors.brand500,
        primaryIconDefault: WFMPrimitiveColors.neutral0,
        primaryIconDisabled: WFMPrimitiveColors.brand200,
        primaryTextDefault: WFMPrimitiveColors.neutral0,
        primaryTextDisabled: WFMPrimitiveColors.brand200,
        secondaryBgDefault: WFMPrimitiveColors.brand100,
        secondaryBgDisabled: WFMPrimitiveColors.brand100,
        secondaryBorder: WFMPrimitiveColors.brand100,
        secondaryIconDefault: WFMPrimitiveColors.brand500,
        secondaryIconDisabled: WFMPrimitiveColors.brand200,
        secondaryTextDefault: WFMPrimitiveColors.brand500,
        secondaryTextDisabled: WFMPrimitiveColors.brand200,
        tertiaryBgDefault: WFMPrimitiveColors.neutral200,
        tertiaryBgDisabled: WFMPrimitiveColors.neutral200,
        tertiaryIconDefault: WFMPrimitiveColors.neutral900,
        tertiaryIconDisabled: WFMPrimitiveColors.neutral500,
        tertiaryTextDefault: WFMPrimitiveColors.neutral900,
        tertiaryTextDisabled: WFMPrimitiveColors.neutral600
    ),
    card: CardColors(
        borderError: WFMPrimitiveColors.red500,
        borderSecondary: WFMPrimitiveColors.neutral200,
        borderTertiary: WFMPrimitiveColors.neutral300,
        iconBgBrand: WFMPrimitiveColors.brand100,
        iconBrand: WFMPrimitiveColors.brand500,
        iconError: WFMPrimitiveColors.red500,
        iconPrimary: WFMPrimitiveColors.neutral900,
        iconSecondary: WFMPrimitiveColors.neutral600,
        surfaceBase: WFMPrimitiveColors.neutral100,
        surfaceError: WFMPrimitiveColors.red50,
        surfaceInfo: WFMPrimitiveColors.neutral200,
        surfaceSecondary: WFMPrimitiveColors.neutral0,
        textError: WFMPrimitiveColors.red500,
        textPrimary: WFMPrimitiveColors.neutral900,
        textSecondary: WFMPrimitiveColors.neutral800,
        textTertuary: WFMPrimitiveColors.neutral600
    ),
    icon: IconColors(
        brand: WFMPrimitiveColors.brand500,
        brandDisabled: WFMPrimitiveColors.brand200,
        empty: WFMPrimitiveColors.neutral500,
        error: WFMPrimitiveColors.red500,
        imgEmptyState: WFMPrimitiveColors.neutral400,
        inverse: WFMPrimitiveColors.neutral0,
        notInverted: WFMPrimitiveColors.neutral0,
        positive: WFMPrimitiveColors.green600,
        primary: WFMPrimitiveColors.neutral900,
        secondary: WFMPrimitiveColors.neutral600,
        warning: WFMPrimitiveColors.yellow400
    ),
    indicators: IndicatorsColors(
        bgEmpty: WFMPrimitiveColors.neutral200,
        bgFilled: WFMPrimitiveColors.brand500,
        icon: WFMPrimitiveColors.neutral0,
        pause: WFMPrimitiveColors.neutral500,
        text: WFMPrimitiveColors.neutral800
    ),
    input: InputColors(
        bg: WFMPrimitiveColors.neutral0,
        border: WFMPrimitiveColors.neutral200,
        borderDisabled: WFMPrimitiveColors.neutral300,
        borderError: WFMPrimitiveColors.red500,
        caption: WFMPrimitiveColors.neutral800,
        captionDisabled: WFMPrimitiveColors.neutral600,
        captionError: WFMPrimitiveColors.red500,
        cursor: WFMPrimitiveColors.neutral900,
        icon: WFMPrimitiveColors.neutral900,
        iconDisabled: WFMPrimitiveColors.neutral600,
        label: WFMPrimitiveColors.neutral900,
        labelDisabled: WFMPrimitiveColors.neutral600,
        placeholder: WFMPrimitiveColors.neutral500,
        textDisabled: WFMPrimitiveColors.neutral500,
        textFilled: WFMPrimitiveColors.neutral900
    ),
    segmentedControl: SegmentedControlColors(
        bg: WFMPrimitiveColors.neutral200,
        bgControlActive: WFMPrimitiveColors.neutral0,
        border: WFMPrimitiveColors.neutral300,
        textActive: WFMPrimitiveColors.neutral900,
        textDefault: WFMPrimitiveColors.neutral600
    ),
    selection: SelectionColors(
        bgChecked: WFMPrimitiveColors.brand500,
        bgDefault: WFMPrimitiveColors.neutral100,
        bgDisabled: WFMPrimitiveColors.neutral200,
        bgThumb: WFMPrimitiveColors.neutral0,
        borderDefault: WFMPrimitiveColors.neutral300,
        iconChecked: WFMPrimitiveColors.neutral0
    ),
    surface: SurfaceColors(
        base: WFMPrimitiveColors.neutral100,
        dark: WFMPrimitiveColors.neutral900,
        overlayModal: Color(hex: 0x000000, alpha: 0.699999988079071),
        primary: WFMPrimitiveColors.neutral100,
        raised: WFMPrimitiveColors.neutral100,
        secondary: WFMPrimitiveColors.neutral0,
        tertiary: WFMPrimitiveColors.neutral200
    ),
    tabbar: TabbarColors(
        bg: WFMPrimitiveColors.neutral0,
        border: WFMPrimitiveColors.neutral200,
        tabActive: WFMPrimitiveColors.brand500,
        tabDefault: WFMPrimitiveColors.neutral900
    ),
    text: TextColors(
        brand: WFMPrimitiveColors.brand500,
        brandDisabled: WFMPrimitiveColors.brand200,
        error: WFMPrimitiveColors.red500,
        inverse: WFMPrimitiveColors.neutral0,
        notInverted: WFMPrimitiveColors.neutral0,
        placeholder: WFMPrimitiveColors.neutral500,
        positive: WFMPrimitiveColors.green600,
        primary: WFMPrimitiveColors.neutral900,
        secondary: WFMPrimitiveColors.neutral800,
        tertiary: WFMPrimitiveColors.neutral600,
        warning: WFMPrimitiveColors.yellow400
    ),
    toast: ToastColors(
        bg: WFMPrimitiveColors.neutral900,
        bgError: WFMPrimitiveColors.red500,
        text: WFMPrimitiveColors.neutral0
    )
)

// MARK: - Environment Key

private struct WFMColorsKey: EnvironmentKey {
    static let defaultValue: WFMSemanticColors = lightWFMColors
}

public extension EnvironmentValues {
    var wfmColors: WFMSemanticColors {
        get { self[WFMColorsKey.self] }
        set { self[WFMColorsKey.self] = newValue }
    }
}

// MARK: - Color Extension

public extension Color {
    /// Создание Color из hex значения
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}

// MARK: - View Modifier

public struct WFMThemeModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    public func body(content: Content) -> some View {
        content
            .environment(\.wfmColors, colorScheme == .dark ? darkWFMColors : lightWFMColors)
    }
}

public extension View {
    /// Применяет тему WFM к view
    func wfmTheme() -> some View {
        modifier(WFMThemeModifier())
    }
}
