package com.beyondviolet.wfm.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Цвета дизайн-системы WFM
 * Токены из Figma (Light.tokens.json / Dark.tokens.json)
 */
object WfmColors {

    // ═══════════════════════════════════════════════════════════════════
    // PRIMITIVE COLORS (одинаковы для Light/Dark)
    // ═══════════════════════════════════════════════════════════════════

    // Brand (фиолетовый)
    val Brand0 = Color(0xFFF8F5FF)
    val Brand100 = Color(0xFFEFE8FF)
    val Brand200 = Color(0xFFB398F9)
    val Brand300 = Color(0xFF9570F2)
    val Brand400 = Color(0xFF7C50E9)
    val Brand500 = Color(0xFF6738DD)
    val Brand600 = Color(0xFF5627CD)
    val Brand700 = Color(0xFF471BB8)
    val Brand800 = Color(0xFF3B13A0)
    val Brand900 = Color(0xFF300E87)

    // Neutral (серый)
    val Neutral0 = Color(0xFFFFFFFF)
    val Neutral100 = Color(0xFFF5F5FC)
    val Neutral200 = Color(0xFFEEEEF8)
    val Neutral300 = Color(0xFFE5E5F1)
    val Neutral400 = Color(0xFFDADAE7)
    val Neutral500 = Color(0xFF9898AE)
    val Neutral600 = Color(0xFF808095)
    val Neutral700 = Color(0xFF737385)
    val Neutral800 = Color(0xFF5E5E6D)
    val Neutral900 = Color(0xFF373742)

    // Red
    val Red100 = Color(0xFFF8C7CB)
    val Red200 = Color(0xFFF3A1A7)
    val Red300 = Color(0xFFEE7B84)
    val Red400 = Color(0xFFE8505B)
    val Red50 = Color(0xFFFDEDEE)
    val Red500 = Color(0xFFE4303D)
    val Red600 = Color(0xFFCE1B28)
    val Red700 = Color(0xFFA81621)
    val Red800 = Color(0xFF821119)
    val Red900 = Color(0xFF36070B)

    // Green
    val Green100 = Color(0xFFD5ECD2)
    val Green200 = Color(0xFFBCE0B7)
    val Green300 = Color(0xFFA3D49C)
    val Green400 = Color(0xFF8AC881)
    val Green50 = Color(0xFFEEF7ED)
    val Green500 = Color(0xFF7CC272)
    val Green600 = Color(0xFF59B04C)
    val Green700 = Color(0xFF4B9540)
    val Green800 = Color(0xFF3D7A35)
    val Green900 = Color(0xFF22441D)

    // Blue
    val Blue100 = Color(0xFFEAF7FB)
    val Blue200 = Color(0xFFAAC3FA)
    val Blue300 = Color(0xFF80A6F8)
    val Blue400 = Color(0xFF5588F5)
    val Blue50 = Color(0xFFFFFFFF)
    val Blue500 = Color(0xFF326FF3)
    val Blue600 = Color(0xFF0D51E3)
    val Blue700 = Color(0xFF0B42B9)
    val Blue800 = Color(0xFF08338F)
    val Blue900 = Color(0xFF031C50)

    // Yellow
    val Yellow100 = Color(0xFFFEF5E2)
    val Yellow200 = Color(0xFFFFEBC0)
    val Yellow300 = Color(0xFFFFD06A)
    val Yellow400 = Color(0xFFFFC33F)
    val Yellow50 = Color(0xFFFFF7E3)
    val Yellow500 = Color(0xFFFFB514)
    val Yellow600 = Color(0xFFFEAE00)
    val Yellow700 = Color(0xFFA65E01)
    val Yellow800 = Color(0xFF934700)
    val Yellow900 = Color(0xFF3D2A00)

    // Pink
    val Pink100 = Color(0xFFEFD0EF)
    val Pink200 = Color(0xFFE4AFE4)
    val Pink300 = Color(0xFFDA8FDA)
    val Pink400 = Color(0xFFCF6FCF)
    val Pink50 = Color(0xFFFAF0FA)
    val Pink500 = Color(0xFFC44FC4)
    val Pink600 = Color(0xFFAE3AAE)
    val Pink700 = Color(0xFF8E2F8E)
    val Pink800 = Color(0xFF6E256E)
    val Pink900 = Color(0xFF2E0F2E)

    // Orange
    val Orange100 = Color(0xFFFFD9C0)
    val Orange200 = Color(0xFFFFC095)
    val Orange300 = Color(0xFFFFA66A)
    val Orange400 = Color(0xFFFF8C3F)
    val Orange50 = Color(0xFFFFF3EB)
    val Orange500 = Color(0xFFFF7314)
    val Orange600 = Color(0xFFBE4C00)
    val Orange700 = Color(0xFF933B00)
    val Orange800 = Color(0xFF682A00)
    val Orange900 = Color(0xFF3D1900)

    // Gradient (для будущего использования)
    val GradientBrandStart = Color(0xFF612EE5)
    val GradientBrandEnd = Color(0xFF9D2CF4)
    val GradientHighlightStart = Color(0xFFFE6600)
    val GradientHighlightEnd = Color(0xFFC32B23)
}

// ═══════════════════════════════════════════════════════════════════
// SEMANTIC COLOR GROUPS
// ═══════════════════════════════════════════════════════════════════

@Immutable
data class BadgeColors(
    val blueBgBright: Color,
    val blueBgLight: Color,
    val blueTextBright: Color,
    val blueTextLight: Color,
    val brandBgBright: Color,
    val brandBgLight: Color,
    val brandTextBright: Color,
    val brandTextLight: Color,
    val greenBgBright: Color,
    val greenBgLight: Color,
    val greenTextBright: Color,
    val greenTextLight: Color,
    val orangeBgBright: Color,
    val orangeBgLight: Color,
    val orangeTextBright: Color,
    val orangeTextLight: Color,
    val pinkBgBright: Color,
    val pinkBgLight: Color,
    val pinkTextBright: Color,
    val pinkTextLight: Color,
    val redBgBright: Color,
    val redBgLight: Color,
    val redTextBright: Color,
    val redTextLight: Color,
    val yellowBgBright: Color,
    val yellowBgLight: Color,
    val yellowTextBright: Color,
    val yellowTextLight: Color
)

@Immutable
data class BarsColors(
    val border: Color,
    val icon: Color,
    val iconBrand: Color,
    val textPrimary: Color,
    val textSecondary: Color
)

@Immutable
data class BgColors(
    val brandDefault: Color,
    val brandDisabled: Color,
    val errorBright: Color,
    val errorLight: Color,
    val infoLight: Color,
    val notInverted: Color,
    val passive: Color,
    val positiveBright: Color,
    val positiveLight: Color,
    val secondaryDefault: Color,
    val secondaryNeutral: Color,
    val secondaryNeutralDisabled: Color,
    val warningBright: Color,
    val warningLight: Color
)

@Immutable
data class BorderColors(
    val base: Color,
    val brand: Color,
    val error: Color,
    val positive: Color,
    val secondary: Color,
    val tertiary: Color,
    val warning: Color
)

@Immutable
data class ButtonColors(
    val iconBg: Color,
    val iconBorder: Color,
    val iconIconActive: Color,
    val iconIconDisabled: Color,
    val linkIconDefault: Color,
    val linkIconDisabled: Color,
    val linkTextDefault: Color,
    val linkTextDisabled: Color,
    val primaryBgDefault: Color,
    val primaryBgDisabled: Color,
    val primaryBorder: Color,
    val primaryIconDefault: Color,
    val primaryIconDisabled: Color,
    val primaryTextDefault: Color,
    val primaryTextDisabled: Color,
    val secondaryBgDefault: Color,
    val secondaryBgDisabled: Color,
    val secondaryBorder: Color,
    val secondaryIconDefault: Color,
    val secondaryIconDisabled: Color,
    val secondaryTextDefault: Color,
    val secondaryTextDisabled: Color,
    val tertiaryBgDefault: Color,
    val tertiaryBgDisabled: Color,
    val tertiaryIconDefault: Color,
    val tertiaryIconDisabled: Color,
    val tertiaryTextDefault: Color,
    val tertiaryTextDisabled: Color
)

@Immutable
data class CardColors(
    val borderError: Color,
    val borderSecondary: Color,
    val borderTertiary: Color,
    val iconBgBrand: Color,
    val iconBrand: Color,
    val iconError: Color,
    val iconPrimary: Color,
    val iconSecondary: Color,
    val surfaceBase: Color,
    val surfaceError: Color,
    val surfaceInfo: Color,
    val surfaceSecondary: Color,
    val textError: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textTertuary: Color
)

@Immutable
data class IconColors(
    val brand: Color,
    val brandDisabled: Color,
    val empty: Color,
    val error: Color,
    val imgEmptyState: Color,
    val inverse: Color,
    val notInverted: Color,
    val positive: Color,
    val primary: Color,
    val secondary: Color,
    val warning: Color
)

@Immutable
data class IndicatorsColors(
    val bgEmpty: Color,
    val bgFilled: Color,
    val icon: Color,
    val pause: Color,
    val text: Color
)

@Immutable
data class InputColors(
    val bg: Color,
    val border: Color,
    val borderDisabled: Color,
    val borderError: Color,
    val caption: Color,
    val captionDisabled: Color,
    val captionError: Color,
    val cursor: Color,
    val icon: Color,
    val iconDisabled: Color,
    val label: Color,
    val labelDisabled: Color,
    val placeholder: Color,
    val textDisabled: Color,
    val textFilled: Color
)

@Immutable
data class SegmentedControlColors(
    val bg: Color,
    val bgControlActive: Color,
    val border: Color,
    val textActive: Color,
    val textDefault: Color
)

@Immutable
data class SelectionColors(
    val bgChecked: Color,
    val bgDefault: Color,
    val bgDisabled: Color,
    val bgThumb: Color,
    val borderDefault: Color,
    val iconChecked: Color
)

@Immutable
data class SurfaceColors(
    val base: Color,
    val dark: Color,
    val overlayModal: Color,
    val primary: Color,
    val raised: Color,
    val secondary: Color,
    val tertiary: Color
)

@Immutable
data class TabbarColors(
    val bg: Color,
    val border: Color,
    val tabActive: Color,
    val tabDefault: Color
)

@Immutable
data class TextColors(
    val brand: Color,
    val brandDisabled: Color,
    val error: Color,
    val inverse: Color,
    val notInverted: Color,
    val placeholder: Color,
    val positive: Color,
    val primary: Color,
    val secondary: Color,
    val tertiary: Color,
    val warning: Color
)

@Immutable
data class ToastColors(
    val bg: Color,
    val bgError: Color,
    val text: Color
)

/**
 * Семантические цвета для темы WFM
 * Значения меняются в зависимости от Light/Dark режима
 */
@Immutable
data class WfmSemanticColors(
    val badge: BadgeColors,
    val bars: BarsColors,
    val bg: BgColors,
    val border: BorderColors,
    val button: ButtonColors,
    val card: CardColors,
    val icon: IconColors,
    val indicators: IndicatorsColors,
    val input: InputColors,
    val segmentedControl: SegmentedControlColors,
    val selection: SelectionColors,
    val surface: SurfaceColors,
    val tabbar: TabbarColors,
    val text: TextColors,
    val toast: ToastColors
)

// ═══════════════════════════════════════════════════════════════════
// EXTENSION PROPERTIES (обратная совместимость)
// ═══════════════════════════════════════════════════════════════════

// Badge
val WfmSemanticColors.badgeBlueBgBright get() = badge.blueBgBright
val WfmSemanticColors.badgeBlueBgLight get() = badge.blueBgLight
val WfmSemanticColors.badgeBlueTextBright get() = badge.blueTextBright
val WfmSemanticColors.badgeBlueTextLight get() = badge.blueTextLight
val WfmSemanticColors.badgeBrandBgBright get() = badge.brandBgBright
val WfmSemanticColors.badgeBrandBgLight get() = badge.brandBgLight
val WfmSemanticColors.badgeBrandTextBright get() = badge.brandTextBright
val WfmSemanticColors.badgeBrandTextLight get() = badge.brandTextLight
val WfmSemanticColors.badgeGreenBgBright get() = badge.greenBgBright
val WfmSemanticColors.badgeGreenBgLight get() = badge.greenBgLight
val WfmSemanticColors.badgeGreenTextBright get() = badge.greenTextBright
val WfmSemanticColors.badgeGreenTextLight get() = badge.greenTextLight
val WfmSemanticColors.badgeOrangeBgBright get() = badge.orangeBgBright
val WfmSemanticColors.badgeOrangeBgLight get() = badge.orangeBgLight
val WfmSemanticColors.badgeOrangeTextBright get() = badge.orangeTextBright
val WfmSemanticColors.badgeOrangeTextLight get() = badge.orangeTextLight
val WfmSemanticColors.badgePinkBgBright get() = badge.pinkBgBright
val WfmSemanticColors.badgePinkBgLight get() = badge.pinkBgLight
val WfmSemanticColors.badgePinkTextBright get() = badge.pinkTextBright
val WfmSemanticColors.badgePinkTextLight get() = badge.pinkTextLight
val WfmSemanticColors.badgeRedBgBright get() = badge.redBgBright
val WfmSemanticColors.badgeRedBgLight get() = badge.redBgLight
val WfmSemanticColors.badgeRedTextBright get() = badge.redTextBright
val WfmSemanticColors.badgeRedTextLight get() = badge.redTextLight
val WfmSemanticColors.badgeYellowBgBright get() = badge.yellowBgBright
val WfmSemanticColors.badgeYellowBgLight get() = badge.yellowBgLight
val WfmSemanticColors.badgeYellowTextBright get() = badge.yellowTextBright
val WfmSemanticColors.badgeYellowTextLight get() = badge.yellowTextLight

// Bars
val WfmSemanticColors.barsBorder get() = bars.border
val WfmSemanticColors.barsIcon get() = bars.icon
val WfmSemanticColors.barsIconBrand get() = bars.iconBrand
val WfmSemanticColors.barsTextPrimary get() = bars.textPrimary
val WfmSemanticColors.barsTextSecondary get() = bars.textSecondary

// Bg
val WfmSemanticColors.bgBrandDefault get() = bg.brandDefault
val WfmSemanticColors.bgBrandDisabled get() = bg.brandDisabled
val WfmSemanticColors.bgErrorBright get() = bg.errorBright
val WfmSemanticColors.bgErrorLight get() = bg.errorLight
val WfmSemanticColors.bgInfoLight get() = bg.infoLight
val WfmSemanticColors.bgNotInverted get() = bg.notInverted
val WfmSemanticColors.bgPassive get() = bg.passive
val WfmSemanticColors.bgPositiveBright get() = bg.positiveBright
val WfmSemanticColors.bgPositiveLight get() = bg.positiveLight
val WfmSemanticColors.bgSecondaryDefault get() = bg.secondaryDefault
val WfmSemanticColors.bgSecondaryNeutral get() = bg.secondaryNeutral
val WfmSemanticColors.bgSecondaryNeutralDisabled get() = bg.secondaryNeutralDisabled
val WfmSemanticColors.bgWarningBright get() = bg.warningBright
val WfmSemanticColors.bgWarningLight get() = bg.warningLight

// Border
val WfmSemanticColors.borderBase get() = border.base
val WfmSemanticColors.borderBrand get() = border.brand
val WfmSemanticColors.borderError get() = border.error
val WfmSemanticColors.borderPositive get() = border.positive
val WfmSemanticColors.borderSecondary get() = border.secondary
val WfmSemanticColors.borderTertiary get() = border.tertiary
val WfmSemanticColors.borderWarning get() = border.warning

// Button
val WfmSemanticColors.buttonIconBg get() = button.iconBg
val WfmSemanticColors.buttonIconBorder get() = button.iconBorder
val WfmSemanticColors.buttonIconIconActive get() = button.iconIconActive
val WfmSemanticColors.buttonIconIconDisabled get() = button.iconIconDisabled
val WfmSemanticColors.buttonLinkIconDefault get() = button.linkIconDefault
val WfmSemanticColors.buttonLinkIconDisabled get() = button.linkIconDisabled
val WfmSemanticColors.buttonLinkTextDefault get() = button.linkTextDefault
val WfmSemanticColors.buttonLinkTextDisabled get() = button.linkTextDisabled
val WfmSemanticColors.buttonPrimaryBgDefault get() = button.primaryBgDefault
val WfmSemanticColors.buttonPrimaryBgDisabled get() = button.primaryBgDisabled
val WfmSemanticColors.buttonPrimaryBorder get() = button.primaryBorder
val WfmSemanticColors.buttonPrimaryIconDefault get() = button.primaryIconDefault
val WfmSemanticColors.buttonPrimaryIconDisabled get() = button.primaryIconDisabled
val WfmSemanticColors.buttonPrimaryTextDefault get() = button.primaryTextDefault
val WfmSemanticColors.buttonPrimaryTextDisabled get() = button.primaryTextDisabled
val WfmSemanticColors.buttonSecondaryBgDefault get() = button.secondaryBgDefault
val WfmSemanticColors.buttonSecondaryBgDisabled get() = button.secondaryBgDisabled
val WfmSemanticColors.buttonSecondaryBorder get() = button.secondaryBorder
val WfmSemanticColors.buttonSecondaryIconDefault get() = button.secondaryIconDefault
val WfmSemanticColors.buttonSecondaryIconDisabled get() = button.secondaryIconDisabled
val WfmSemanticColors.buttonSecondaryTextDefault get() = button.secondaryTextDefault
val WfmSemanticColors.buttonSecondaryTextDisabled get() = button.secondaryTextDisabled
val WfmSemanticColors.buttonTertiaryBgDefault get() = button.tertiaryBgDefault
val WfmSemanticColors.buttonTertiaryBgDisabled get() = button.tertiaryBgDisabled
val WfmSemanticColors.buttonTertiaryIconDefault get() = button.tertiaryIconDefault
val WfmSemanticColors.buttonTertiaryIconDisabled get() = button.tertiaryIconDisabled
val WfmSemanticColors.buttonTertiaryTextDefault get() = button.tertiaryTextDefault
val WfmSemanticColors.buttonTertiaryTextDisabled get() = button.tertiaryTextDisabled

// Card
val WfmSemanticColors.cardBorderError get() = card.borderError
val WfmSemanticColors.cardBorderSecondary get() = card.borderSecondary
val WfmSemanticColors.cardBorderTertiary get() = card.borderTertiary
val WfmSemanticColors.cardIconBgBrand get() = card.iconBgBrand
val WfmSemanticColors.cardIconBrand get() = card.iconBrand
val WfmSemanticColors.cardIconError get() = card.iconError
val WfmSemanticColors.cardIconPrimary get() = card.iconPrimary
val WfmSemanticColors.cardIconSecondary get() = card.iconSecondary
val WfmSemanticColors.cardSurfaceBase get() = card.surfaceBase
val WfmSemanticColors.cardSurfaceError get() = card.surfaceError
val WfmSemanticColors.cardSurfaceInfo get() = card.surfaceInfo
val WfmSemanticColors.cardSurfaceSecondary get() = card.surfaceSecondary
val WfmSemanticColors.cardTextError get() = card.textError
val WfmSemanticColors.cardTextPrimary get() = card.textPrimary
val WfmSemanticColors.cardTextSecondary get() = card.textSecondary
val WfmSemanticColors.cardTextTertuary get() = card.textTertuary

// Icon
val WfmSemanticColors.iconBrand get() = icon.brand
val WfmSemanticColors.iconBrandDisabled get() = icon.brandDisabled
val WfmSemanticColors.iconEmpty get() = icon.empty
val WfmSemanticColors.iconError get() = icon.error
val WfmSemanticColors.iconImgEmptyState get() = icon.imgEmptyState
val WfmSemanticColors.iconInverse get() = icon.inverse
val WfmSemanticColors.iconNotInverted get() = icon.notInverted
val WfmSemanticColors.iconPositive get() = icon.positive
val WfmSemanticColors.iconPrimary get() = icon.primary
val WfmSemanticColors.iconSecondary get() = icon.secondary
val WfmSemanticColors.iconWarning get() = icon.warning

// Indicators
val WfmSemanticColors.indicatorsBgEmpty get() = indicators.bgEmpty
val WfmSemanticColors.indicatorsBgFilled get() = indicators.bgFilled
val WfmSemanticColors.indicatorsIcon get() = indicators.icon
val WfmSemanticColors.indicatorsPause get() = indicators.pause
val WfmSemanticColors.indicatorsText get() = indicators.text

// Input
val WfmSemanticColors.inputBg get() = input.bg
val WfmSemanticColors.inputBorder get() = input.border
val WfmSemanticColors.inputBorderDisabled get() = input.borderDisabled
val WfmSemanticColors.inputBorderError get() = input.borderError
val WfmSemanticColors.inputCaption get() = input.caption
val WfmSemanticColors.inputCaptionDisabled get() = input.captionDisabled
val WfmSemanticColors.inputCaptionError get() = input.captionError
val WfmSemanticColors.inputCursor get() = input.cursor
val WfmSemanticColors.inputIcon get() = input.icon
val WfmSemanticColors.inputIconDisabled get() = input.iconDisabled
val WfmSemanticColors.inputLabel get() = input.label
val WfmSemanticColors.inputLabelDisabled get() = input.labelDisabled
val WfmSemanticColors.inputPlaceholder get() = input.placeholder
val WfmSemanticColors.inputTextDisabled get() = input.textDisabled
val WfmSemanticColors.inputTextFilled get() = input.textFilled

// Segmentedcontrol
val WfmSemanticColors.segmentedControlBg get() = segmentedControl.bg
val WfmSemanticColors.segmentedControlBgControlActive get() = segmentedControl.bgControlActive
val WfmSemanticColors.segmentedControlBorder get() = segmentedControl.border
val WfmSemanticColors.segmentedControlTextActive get() = segmentedControl.textActive
val WfmSemanticColors.segmentedControlTextDefault get() = segmentedControl.textDefault

// Selection
val WfmSemanticColors.selectionBgChecked get() = selection.bgChecked
val WfmSemanticColors.selectionBgDefault get() = selection.bgDefault
val WfmSemanticColors.selectionBgDisabled get() = selection.bgDisabled
val WfmSemanticColors.selectionBgThumb get() = selection.bgThumb
val WfmSemanticColors.selectionBorderDefault get() = selection.borderDefault
val WfmSemanticColors.selectionIconChecked get() = selection.iconChecked

// Surface
val WfmSemanticColors.surfaceBase get() = surface.base
val WfmSemanticColors.surfaceDark get() = surface.dark
val WfmSemanticColors.surfaceOverlayModal get() = surface.overlayModal
val WfmSemanticColors.surfacePrimary get() = surface.primary
val WfmSemanticColors.surfaceRaised get() = surface.raised
val WfmSemanticColors.surfaceSecondary get() = surface.secondary
val WfmSemanticColors.surfaceTertiary get() = surface.tertiary

// Tabbar
val WfmSemanticColors.tabbarBg get() = tabbar.bg
val WfmSemanticColors.tabbarBorder get() = tabbar.border
val WfmSemanticColors.tabbarTabActive get() = tabbar.tabActive
val WfmSemanticColors.tabbarTabDefault get() = tabbar.tabDefault

// Text
val WfmSemanticColors.textBrand get() = text.brand
val WfmSemanticColors.textBrandDisabled get() = text.brandDisabled
val WfmSemanticColors.textError get() = text.error
val WfmSemanticColors.textInverse get() = text.inverse
val WfmSemanticColors.textNotInverted get() = text.notInverted
val WfmSemanticColors.textPlaceholder get() = text.placeholder
val WfmSemanticColors.textPositive get() = text.positive
val WfmSemanticColors.textPrimary get() = text.primary
val WfmSemanticColors.textSecondary get() = text.secondary
val WfmSemanticColors.textTertiary get() = text.tertiary
val WfmSemanticColors.textWarning get() = text.warning

// Toast
val WfmSemanticColors.toastBg get() = toast.bg
val WfmSemanticColors.toastBgError get() = toast.bgError
val WfmSemanticColors.toastText get() = toast.text

/**
 * Light тема (из Light.tokens.json)
 */
fun getLightSemantic() = WfmSemanticColors(
    badge = BadgeColors(
        blueBgBright = WfmColors.Blue500,
        blueBgLight = WfmColors.Blue100,
        blueTextBright = WfmColors.Blue600,
        blueTextLight = WfmColors.Blue100,
        brandBgBright = WfmColors.Brand500,
        brandBgLight = WfmColors.Brand100,
        brandTextBright = WfmColors.Brand500,
        brandTextLight = WfmColors.Brand0,
        greenBgBright = WfmColors.Green600,
        greenBgLight = WfmColors.Green50,
        greenTextBright = WfmColors.Green800,
        greenTextLight = WfmColors.Green50,
        orangeBgBright = WfmColors.Orange400,
        orangeBgLight = WfmColors.Orange50,
        orangeTextBright = WfmColors.Orange600,
        orangeTextLight = WfmColors.Orange50,
        pinkBgBright = WfmColors.Pink400,
        pinkBgLight = WfmColors.Pink50,
        pinkTextBright = WfmColors.Pink600,
        pinkTextLight = WfmColors.Pink50,
        redBgBright = WfmColors.Red400,
        redBgLight = WfmColors.Red50,
        redTextBright = WfmColors.Red700,
        redTextLight = WfmColors.Red50,
        yellowBgBright = WfmColors.Yellow600,
        yellowBgLight = WfmColors.Yellow50,
        yellowTextBright = WfmColors.Yellow700,
        yellowTextLight = WfmColors.Yellow50
    ),
    bars = BarsColors(
        border = WfmColors.Neutral200,
        icon = WfmColors.Neutral900,
        iconBrand = WfmColors.Brand500,
        textPrimary = WfmColors.Neutral900,
        textSecondary = WfmColors.Neutral800
    ),
    bg = BgColors(
        brandDefault = WfmColors.Brand500,
        brandDisabled = WfmColors.Brand100,
        errorBright = WfmColors.Red500,
        errorLight = WfmColors.Red50,
        infoLight = WfmColors.Neutral200,
        notInverted = WfmColors.Neutral0,
        passive = WfmColors.Neutral400,
        positiveBright = WfmColors.Green600,
        positiveLight = WfmColors.Green50,
        secondaryDefault = WfmColors.Brand100,
        secondaryNeutral = WfmColors.Neutral200,
        secondaryNeutralDisabled = WfmColors.Neutral200,
        warningBright = WfmColors.Yellow400,
        warningLight = WfmColors.Yellow50
    ),
    border = BorderColors(
        base = WfmColors.Brand100,
        brand = WfmColors.Brand500,
        error = WfmColors.Red500,
        positive = WfmColors.Green600,
        secondary = WfmColors.Neutral200,
        tertiary = WfmColors.Neutral300,
        warning = WfmColors.Yellow400
    ),
    button = ButtonColors(
        iconBg = WfmColors.Neutral0,
        iconBorder = WfmColors.Neutral300,
        iconIconActive = WfmColors.Neutral900,
        iconIconDisabled = WfmColors.Neutral500,
        linkIconDefault = WfmColors.Brand500,
        linkIconDisabled = WfmColors.Brand200,
        linkTextDefault = WfmColors.Brand500,
        linkTextDisabled = WfmColors.Brand200,
        primaryBgDefault = WfmColors.Brand500,
        primaryBgDisabled = WfmColors.Brand100,
        primaryBorder = WfmColors.Brand500,
        primaryIconDefault = WfmColors.Neutral0,
        primaryIconDisabled = WfmColors.Brand200,
        primaryTextDefault = WfmColors.Neutral0,
        primaryTextDisabled = WfmColors.Brand200,
        secondaryBgDefault = WfmColors.Brand100,
        secondaryBgDisabled = WfmColors.Brand100,
        secondaryBorder = WfmColors.Brand100,
        secondaryIconDefault = WfmColors.Brand500,
        secondaryIconDisabled = WfmColors.Brand200,
        secondaryTextDefault = WfmColors.Brand500,
        secondaryTextDisabled = WfmColors.Brand200,
        tertiaryBgDefault = WfmColors.Neutral200,
        tertiaryBgDisabled = WfmColors.Neutral200,
        tertiaryIconDefault = WfmColors.Neutral900,
        tertiaryIconDisabled = WfmColors.Neutral500,
        tertiaryTextDefault = WfmColors.Neutral900,
        tertiaryTextDisabled = WfmColors.Neutral600
    ),
    card = CardColors(
        borderError = WfmColors.Red500,
        borderSecondary = WfmColors.Neutral200,
        borderTertiary = WfmColors.Neutral300,
        iconBgBrand = WfmColors.Brand100,
        iconBrand = WfmColors.Brand500,
        iconError = WfmColors.Red500,
        iconPrimary = WfmColors.Neutral900,
        iconSecondary = WfmColors.Neutral600,
        surfaceBase = WfmColors.Neutral100,
        surfaceError = WfmColors.Red50,
        surfaceInfo = WfmColors.Neutral200,
        surfaceSecondary = WfmColors.Neutral0,
        textError = WfmColors.Red500,
        textPrimary = WfmColors.Neutral900,
        textSecondary = WfmColors.Neutral800,
        textTertuary = WfmColors.Neutral600
    ),
    icon = IconColors(
        brand = WfmColors.Brand500,
        brandDisabled = WfmColors.Brand200,
        empty = WfmColors.Neutral500,
        error = WfmColors.Red500,
        imgEmptyState = WfmColors.Neutral400,
        inverse = WfmColors.Neutral0,
        notInverted = WfmColors.Neutral0,
        positive = WfmColors.Green600,
        primary = WfmColors.Neutral900,
        secondary = WfmColors.Neutral600,
        warning = WfmColors.Yellow400
    ),
    indicators = IndicatorsColors(
        bgEmpty = WfmColors.Neutral200,
        bgFilled = WfmColors.Brand500,
        icon = WfmColors.Neutral0,
        pause = WfmColors.Neutral500,
        text = WfmColors.Neutral800
    ),
    input = InputColors(
        bg = WfmColors.Neutral0,
        border = WfmColors.Neutral200,
        borderDisabled = WfmColors.Neutral300,
        borderError = WfmColors.Red500,
        caption = WfmColors.Neutral800,
        captionDisabled = WfmColors.Neutral600,
        captionError = WfmColors.Red500,
        cursor = WfmColors.Neutral900,
        icon = WfmColors.Neutral900,
        iconDisabled = WfmColors.Neutral600,
        label = WfmColors.Neutral900,
        labelDisabled = WfmColors.Neutral600,
        placeholder = WfmColors.Neutral500,
        textDisabled = WfmColors.Neutral500,
        textFilled = WfmColors.Neutral900
    ),
    segmentedControl = SegmentedControlColors(
        bg = WfmColors.Neutral200,
        bgControlActive = WfmColors.Neutral0,
        border = WfmColors.Neutral300,
        textActive = WfmColors.Neutral900,
        textDefault = WfmColors.Neutral600
    ),
    selection = SelectionColors(
        bgChecked = WfmColors.Brand500,
        bgDefault = WfmColors.Neutral100,
        bgDisabled = WfmColors.Neutral200,
        bgThumb = WfmColors.Neutral0,
        borderDefault = WfmColors.Neutral300,
        iconChecked = WfmColors.Neutral0
    ),
    surface = SurfaceColors(
        base = WfmColors.Neutral100,
        dark = WfmColors.Neutral900,
        overlayModal = Color(0xB2000000),
        primary = WfmColors.Neutral100,
        raised = WfmColors.Neutral100,
        secondary = WfmColors.Neutral0,
        tertiary = WfmColors.Neutral200
    ),
    tabbar = TabbarColors(
        bg = WfmColors.Neutral0,
        border = WfmColors.Neutral200,
        tabActive = WfmColors.Brand500,
        tabDefault = WfmColors.Neutral900
    ),
    text = TextColors(
        brand = WfmColors.Brand500,
        brandDisabled = WfmColors.Brand200,
        error = WfmColors.Red500,
        inverse = WfmColors.Neutral0,
        notInverted = WfmColors.Neutral0,
        placeholder = WfmColors.Neutral500,
        positive = WfmColors.Green600,
        primary = WfmColors.Neutral900,
        secondary = WfmColors.Neutral800,
        tertiary = WfmColors.Neutral600,
        warning = WfmColors.Yellow400
    ),
    toast = ToastColors(
        bg = WfmColors.Neutral900,
        bgError = WfmColors.Red500,
        text = WfmColors.Neutral0
    )
)

/**
 * Dark тема (из Dark.tokens.json)
 */
fun getDarkSemantic() = WfmSemanticColors(
    badge = BadgeColors(
        blueBgBright = WfmColors.Blue500,
        blueBgLight = WfmColors.Blue100,
        blueTextBright = WfmColors.Blue600,
        blueTextLight = WfmColors.Blue100,
        brandBgBright = WfmColors.Brand500,
        brandBgLight = WfmColors.Brand100,
        brandTextBright = WfmColors.Brand500,
        brandTextLight = WfmColors.Brand0,
        greenBgBright = WfmColors.Green600,
        greenBgLight = WfmColors.Green50,
        greenTextBright = WfmColors.Green800,
        greenTextLight = WfmColors.Green50,
        orangeBgBright = WfmColors.Orange400,
        orangeBgLight = WfmColors.Orange50,
        orangeTextBright = WfmColors.Orange600,
        orangeTextLight = WfmColors.Orange50,
        pinkBgBright = WfmColors.Pink400,
        pinkBgLight = WfmColors.Pink50,
        pinkTextBright = WfmColors.Pink600,
        pinkTextLight = WfmColors.Pink50,
        redBgBright = WfmColors.Red400,
        redBgLight = WfmColors.Red50,
        redTextBright = WfmColors.Red700,
        redTextLight = WfmColors.Red50,
        yellowBgBright = WfmColors.Yellow600,
        yellowBgLight = WfmColors.Yellow50,
        yellowTextBright = WfmColors.Yellow700,
        yellowTextLight = WfmColors.Yellow50
    ),
    bars = BarsColors(
        border = WfmColors.Neutral200,
        icon = WfmColors.Neutral900,
        iconBrand = WfmColors.Brand500,
        textPrimary = WfmColors.Neutral900,
        textSecondary = WfmColors.Neutral800
    ),
    bg = BgColors(
        brandDefault = WfmColors.Brand500,
        brandDisabled = WfmColors.Brand100,
        errorBright = WfmColors.Red500,
        errorLight = WfmColors.Red50,
        infoLight = WfmColors.Neutral200,
        notInverted = WfmColors.Neutral0,
        passive = WfmColors.Neutral400,
        positiveBright = WfmColors.Green600,
        positiveLight = WfmColors.Green50,
        secondaryDefault = WfmColors.Brand100,
        secondaryNeutral = WfmColors.Neutral200,
        secondaryNeutralDisabled = WfmColors.Neutral200,
        warningBright = WfmColors.Yellow400,
        warningLight = WfmColors.Yellow50
    ),
    border = BorderColors(
        base = WfmColors.Brand100,
        brand = WfmColors.Brand500,
        error = WfmColors.Red500,
        positive = WfmColors.Green600,
        secondary = WfmColors.Neutral200,
        tertiary = WfmColors.Neutral300,
        warning = WfmColors.Yellow400
    ),
    button = ButtonColors(
        iconBg = WfmColors.Neutral0,
        iconBorder = WfmColors.Neutral300,
        iconIconActive = WfmColors.Neutral900,
        iconIconDisabled = WfmColors.Neutral500,
        linkIconDefault = WfmColors.Brand500,
        linkIconDisabled = WfmColors.Brand200,
        linkTextDefault = WfmColors.Brand500,
        linkTextDisabled = WfmColors.Brand200,
        primaryBgDefault = WfmColors.Brand500,
        primaryBgDisabled = WfmColors.Brand100,
        primaryBorder = WfmColors.Brand500,
        primaryIconDefault = WfmColors.Neutral0,
        primaryIconDisabled = WfmColors.Brand200,
        primaryTextDefault = WfmColors.Neutral0,
        primaryTextDisabled = WfmColors.Brand200,
        secondaryBgDefault = WfmColors.Brand100,
        secondaryBgDisabled = WfmColors.Brand100,
        secondaryBorder = WfmColors.Brand100,
        secondaryIconDefault = WfmColors.Brand500,
        secondaryIconDisabled = WfmColors.Brand200,
        secondaryTextDefault = WfmColors.Brand500,
        secondaryTextDisabled = WfmColors.Brand200,
        tertiaryBgDefault = WfmColors.Neutral200,
        tertiaryBgDisabled = WfmColors.Neutral200,
        tertiaryIconDefault = WfmColors.Neutral900,
        tertiaryIconDisabled = WfmColors.Neutral500,
        tertiaryTextDefault = WfmColors.Neutral900,
        tertiaryTextDisabled = WfmColors.Neutral600
    ),
    card = CardColors(
        borderError = WfmColors.Red500,
        borderSecondary = WfmColors.Neutral200,
        borderTertiary = WfmColors.Neutral300,
        iconBgBrand = WfmColors.Brand100,
        iconBrand = WfmColors.Brand500,
        iconError = WfmColors.Red500,
        iconPrimary = WfmColors.Neutral900,
        iconSecondary = WfmColors.Neutral600,
        surfaceBase = WfmColors.Neutral100,
        surfaceError = WfmColors.Red50,
        surfaceInfo = WfmColors.Neutral200,
        surfaceSecondary = WfmColors.Neutral0,
        textError = WfmColors.Red500,
        textPrimary = WfmColors.Neutral900,
        textSecondary = WfmColors.Neutral800,
        textTertuary = WfmColors.Neutral600
    ),
    icon = IconColors(
        brand = WfmColors.Brand500,
        brandDisabled = WfmColors.Brand200,
        empty = WfmColors.Neutral500,
        error = WfmColors.Red500,
        imgEmptyState = WfmColors.Neutral400,
        inverse = WfmColors.Neutral0,
        notInverted = WfmColors.Neutral0,
        positive = WfmColors.Green600,
        primary = WfmColors.Neutral900,
        secondary = WfmColors.Neutral600,
        warning = WfmColors.Yellow400
    ),
    indicators = IndicatorsColors(
        bgEmpty = WfmColors.Neutral200,
        bgFilled = WfmColors.Brand500,
        icon = WfmColors.Neutral0,
        pause = WfmColors.Neutral500,
        text = WfmColors.Neutral800
    ),
    input = InputColors(
        bg = WfmColors.Neutral0,
        border = WfmColors.Neutral200,
        borderDisabled = WfmColors.Neutral300,
        borderError = WfmColors.Red500,
        caption = WfmColors.Neutral800,
        captionDisabled = WfmColors.Neutral600,
        captionError = WfmColors.Red500,
        cursor = WfmColors.Neutral900,
        icon = WfmColors.Neutral900,
        iconDisabled = WfmColors.Neutral600,
        label = WfmColors.Neutral900,
        labelDisabled = WfmColors.Neutral600,
        placeholder = WfmColors.Neutral500,
        textDisabled = WfmColors.Neutral500,
        textFilled = WfmColors.Neutral900
    ),
    segmentedControl = SegmentedControlColors(
        bg = WfmColors.Neutral200,
        bgControlActive = WfmColors.Neutral0,
        border = WfmColors.Neutral300,
        textActive = WfmColors.Neutral900,
        textDefault = WfmColors.Neutral600
    ),
    selection = SelectionColors(
        bgChecked = WfmColors.Brand500,
        bgDefault = WfmColors.Neutral100,
        bgDisabled = WfmColors.Neutral200,
        bgThumb = WfmColors.Neutral0,
        borderDefault = WfmColors.Neutral300,
        iconChecked = WfmColors.Neutral0
    ),
    surface = SurfaceColors(
        base = WfmColors.Neutral100,
        dark = WfmColors.Neutral900,
        overlayModal = Color(0xB2000000),
        primary = WfmColors.Neutral100,
        raised = WfmColors.Neutral100,
        secondary = WfmColors.Neutral0,
        tertiary = WfmColors.Neutral200
    ),
    tabbar = TabbarColors(
        bg = WfmColors.Neutral0,
        border = WfmColors.Neutral200,
        tabActive = WfmColors.Brand500,
        tabDefault = WfmColors.Neutral900
    ),
    text = TextColors(
        brand = WfmColors.Brand500,
        brandDisabled = WfmColors.Brand200,
        error = WfmColors.Red500,
        inverse = WfmColors.Neutral0,
        notInverted = WfmColors.Neutral0,
        placeholder = WfmColors.Neutral500,
        positive = WfmColors.Green600,
        primary = WfmColors.Neutral900,
        secondary = WfmColors.Neutral800,
        tertiary = WfmColors.Neutral600,
        warning = WfmColors.Yellow400
    ),
    toast = ToastColors(
        bg = WfmColors.Neutral900,
        bgError = WfmColors.Red500,
        text = WfmColors.Neutral0
    )
)

/**
 * CompositionLocal для доступа к семантическим цветам в Compose
 */
val LocalWfmColors = staticCompositionLocalOf { getLightSemantic() }
