package com.beyondviolet.wfm.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

/**
 * Material3 color scheme для Light темы
 */
private val LightMaterialColorScheme = lightColorScheme(
    primary = WfmColors.Brand500,
    onPrimary = WfmColors.Neutral0,
    primaryContainer = WfmColors.Brand100,
    onPrimaryContainer = WfmColors.Brand900,

    secondary = WfmColors.Brand300,
    onSecondary = WfmColors.Neutral0,
    secondaryContainer = WfmColors.Brand100,
    onSecondaryContainer = WfmColors.Brand900,

    tertiary = WfmColors.Neutral700,
    onTertiary = WfmColors.Neutral0,
    tertiaryContainer = WfmColors.Neutral200,
    onTertiaryContainer = WfmColors.Neutral900,

    background = WfmColors.Neutral100,
    onBackground = WfmColors.Neutral900,

    surface = WfmColors.Neutral0,
    onSurface = WfmColors.Neutral900,
    surfaceVariant = WfmColors.Neutral200,
    onSurfaceVariant = WfmColors.Neutral800,

    outline = WfmColors.Neutral300,
    outlineVariant = WfmColors.Neutral200,

    error = WfmColors.Red500,
    onError = WfmColors.Neutral0,
    errorContainer = WfmColors.Red50,
    onErrorContainer = WfmColors.Red500
)

/**
 * Material3 color scheme для Dark темы
 */
private val DarkMaterialColorScheme = darkColorScheme(
    primary = WfmColors.Brand500,
    onPrimary = WfmColors.Neutral0,
    primaryContainer = WfmColors.Brand800,
    onPrimaryContainer = WfmColors.Brand200,

    secondary = WfmColors.Brand300,
    onSecondary = WfmColors.Neutral900,
    secondaryContainer = WfmColors.Brand800,
    onSecondaryContainer = WfmColors.Brand200,

    tertiary = WfmColors.Neutral300,
    onTertiary = WfmColors.Neutral900,
    tertiaryContainer = WfmColors.Neutral800,
    onTertiaryContainer = WfmColors.Neutral200,

    background = WfmColors.Neutral800,
    onBackground = WfmColors.Neutral0,

    surface = WfmColors.Neutral900,
    onSurface = WfmColors.Neutral0,
    surfaceVariant = WfmColors.Neutral700,
    onSurfaceVariant = WfmColors.Neutral300,

    outline = WfmColors.Neutral600,
    outlineVariant = WfmColors.Neutral700,

    error = WfmColors.Red500,
    onError = WfmColors.Neutral0,
    errorContainer = WfmColors.Red300,
    onErrorContainer = WfmColors.Neutral900
)

/**
 * Основная тема WFM с поддержкой Light/Dark режимов
 *
 * Использование семантических цветов:
 * ```
 * val colors = WfmTheme.colors
 * Text(
 *     text = "Hello",
 *     color = colors.textPrimary
 * )
 * ```
 */
@Composable
fun WfmTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val wfmColors = if (darkTheme) getDarkSemantic() else getLightSemantic()
    val materialColorScheme = if (darkTheme) DarkMaterialColorScheme else LightMaterialColorScheme

    CompositionLocalProvider(
        LocalWfmColors provides wfmColors
    ) {
        MaterialTheme(
            colorScheme = materialColorScheme,
            content = content
        )
    }
}

/**
 * Объект для доступа к цветам и типографике темы WFM
 */
object WfmTheme {
    /**
     * Семантические цвета текущей темы (Light или Dark)
     */
    val colors: WfmSemanticColors
        @Composable
        @ReadOnlyComposable
        get() = LocalWfmColors.current

    /**
     * Кастомная типографика WFM из Figma
     */
    val typography: WfmTypography
        get() = WfmTypography

    /**
     * Material3 типографика
     */
    val materialTypography: androidx.compose.material3.Typography
        @Composable
        @ReadOnlyComposable
        get() = MaterialTheme.typography

    /**
     * Отступы WFM
     */
    val spacing: WfmSpacing
        get() = WfmSpacing

    /**
     * Радиусы скругления WFM
     */
    val radius: WfmRadius
        get() = WfmRadius

    /**
     * Толщина линий WFM
     */
    val stroke: WfmStroke
        get() = WfmStroke
}
