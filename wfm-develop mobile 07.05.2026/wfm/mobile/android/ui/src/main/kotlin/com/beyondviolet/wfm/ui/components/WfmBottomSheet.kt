package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Реиспользуемый BottomSheet с дизайном WFM
 *
 * Обёртка над Material 3 [ModalBottomSheet].
 * Закрывается свайпом вниз или кликом на затемнённый overlay.
 *
 * @param isVisible показывать ли лист
 * @param onDismiss вызывается при закрытии (свайп вниз / клик на overlay)
 * @param showOverlay показывать ли затемнение фона (surfaceOverlayModal). По умолчанию false
 * @param skipPartiallyExpanded открывать сразу на полную высоту (true) или на половину (false). По умолчанию true
 * @param toastManager опциональный ToastManager для показа тостов поверх BottomSheet
 * @param modifier Modifier для листа
 * @param content контент листа
 *
 * Использование:
 * ```
 * var showSheet by remember { mutableStateOf(false) }
 *
 * Button(onClick = { showSheet = true }) { Text("Открыть") }
 *
 * WfmBottomSheet(
 *     isVisible = showSheet,
 *     onDismiss = { showSheet = false },
 *     showOverlay = true,  // для модальных действий (выход, закрытие смены)
 *     skipPartiallyExpanded = true  // открыть сразу на полную высоту
 * ) {
 *     Column(modifier = Modifier.padding(WfmSpacing.L)) {
 *         Text("Контент", style = WfmTypography.Headline20Bold)
 *     }
 * }
 * ```
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WfmBottomSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    showOverlay: Boolean = false,
    skipPartiallyExpanded: Boolean = true,
    toastManager: ToastManager? = null,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    if (!isVisible) return

    val colors = WfmTheme.colors
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = skipPartiallyExpanded
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier,
        containerColor = colors.surfaceSecondary,
        scrimColor = if (showOverlay) colors.surfaceOverlayModal else Color.Transparent,
        shape = RoundedCornerShape(topStart = WfmRadius.XL, topEnd = WfmRadius.XL),
        dragHandle = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = WfmSpacing.S, bottom = WfmSpacing.S),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(48.dp)
                        .height(5.dp)
                        .background(
                            color = WfmColors.Neutral400,
                            shape = RoundedCornerShape(50)
                        )
                )
            }
        }
    ) {
        val maxSheetHeight = LocalConfiguration.current.screenHeightDp.dp * 0.9f
        // Box для наложения Toast поверх контента
        Box(modifier = Modifier.fillMaxWidth().heightIn(max = maxSheetHeight)) {
            // Контент листа в Column
            Column(modifier = Modifier.fillMaxWidth()) {
                content()
            }

            // Toast поверх контента BottomSheet
            if (toastManager != null) {
                val isToastVisible by toastManager.isVisible.collectAsState()
                val currentToast by toastManager.current.collectAsState()

                val currentData = currentToast
                if (isToastVisible && currentData != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomCenter)
                            .padding(horizontal = 16.dp)
                            .padding(bottom = 16.dp)
                    ) {
                        WfmToastContent(data = currentData)
                    }
                }
            }
        }
    }
}

// MARK: - Preview helpers

/**
 * Контейнер-заглушка для превью, имитирующий внешний вид BottomSheet
 */
@Composable
private fun SheetPreviewContainer(content: @Composable ColumnScope.() -> Unit) {
    val colors = WfmTheme.colors

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surfaceOverlayModal),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(topStart = WfmRadius.XL, topEnd = WfmRadius.XL),
            color = colors.surfaceSecondary
        ) {
            Column {
                // Drag indicator
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = WfmSpacing.S),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .width(48.dp)
                            .height(5.dp)
                            .background(
                                color = WfmColors.Neutral400,
                                shape = RoundedCornerShape(50)
                            )
                    )
                }
                Column(content = content)
            }
        }
    }
}

// MARK: - Previews

@Preview(showBackground = true, backgroundColor = 0xFF373742)
@Composable
private fun WfmBottomSheetSimplePreview() {
    WfmTheme {
        SheetPreviewContainer {
            Column(
                modifier = Modifier.padding(WfmSpacing.L),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.L)
            ) {
                Text(
                    text = "Заголовок BottomSheet",
                    style = WfmTypography.Headline20Bold,
                    color = WfmTheme.colors.textPrimary
                )
                Text(
                    text = "Описание контента листа",
                    style = WfmTypography.Body14Regular,
                    color = WfmTheme.colors.textSecondary
                )
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF373742)
@Composable
private fun WfmBottomSheetScrollablePreview() {
    WfmTheme {
        val colors = WfmTheme.colors
        SheetPreviewContainer {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(WfmSpacing.L),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
            ) {
                Text(
                    text = "Длинный список",
                    style = WfmTypography.Headline20Bold,
                    color = colors.textPrimary
                )
                repeat(10) { index ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = colors.surfaceSecondary,
                        shape = RoundedCornerShape(WfmRadius.S)
                    ) {
                        Text(
                            text = "Item ${index + 1}",
                            style = WfmTypography.Body14Regular,
                            color = colors.textPrimary,
                            modifier = Modifier.padding(WfmSpacing.L)
                        )
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF373742)
@Composable
private fun WfmBottomSheetButtonsPreview() {
    WfmTheme {
        val colors = WfmTheme.colors
        SheetPreviewContainer {
            Column(
                modifier = Modifier.padding(WfmSpacing.L),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.L)
            ) {
                Text(
                    text = "Подтвердите действие",
                    style = WfmTypography.Headline20Bold,
                    color = colors.textPrimary,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
                ) {
                    // Secondary button
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .background(
                                color = colors.buttonSecondaryBgDefault,
                                shape = RoundedCornerShape(WfmRadius.L)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Отмена",
                            style = WfmTypography.Headline16Bold,
                            color = colors.buttonSecondaryTextDefault
                        )
                    }
                    // Primary button
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .background(
                                color = colors.buttonPrimaryBgDefault,
                                shape = RoundedCornerShape(WfmRadius.L)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Подтвердить",
                            style = WfmTypography.Headline16Bold,
                            color = colors.buttonPrimaryTextDefault
                        )
                    }
                }
            }
        }
    }
}
