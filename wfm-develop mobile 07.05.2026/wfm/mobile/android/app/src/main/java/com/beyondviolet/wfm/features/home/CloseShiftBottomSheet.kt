package com.beyondviolet.wfm.features.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * BottomSheet подтверждения закрытия смены
 *
 * @param isVisible показывать ли BottomSheet
 * @param message дополнительное сообщение (например, "У вас есть незавершённые задачи")
 * @param onDismiss вызывается при закрытии (свайп вниз / клик на overlay)
 * @param onConfirm вызывается при подтверждении закрытия
 *
 * Использование:
 * ```
 * CloseShiftBottomSheet(
 *     isVisible = showCloseShiftSheet,
 *     message = "У вас есть незавершённые задачи",
 *     onDismiss = { showCloseShiftSheet = false },
 *     onConfirm = { viewModel.openShift() }
 * )
 * ```
 */
@Composable
fun CloseShiftBottomSheet(
    isVisible: Boolean,
    title: String = "Закрыть смену?",
    message: String? = null,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    WfmBottomSheet(
        isVisible = isVisible,
        onDismiss = onDismiss,
        showOverlay = true
    ) {
        CloseShiftBottomSheetContent(
            title = title,
            message = message,
            onCancel = onDismiss,
            onClose = {
                // НЕ вызываем onDismiss - БШ закроется автоматически при успехе
                onConfirm()
            }
        )
    }
}

@Composable
private fun CloseShiftBottomSheetContent(
    title: String = "Закрыть смену?",
    message: String? = null,
    onCancel: () -> Unit,
    onClose: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = WfmSpacing.L,
                end = WfmSpacing.L
            ),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = WfmSpacing.L, bottom = WfmSpacing.S),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                style = WfmTypography.Headline20Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            if (message != null) {
                Text(
                    text = message,
                    style = WfmTypography.Body16Regular,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = WfmSpacing.L),
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .background(
                        color = colors.buttonSecondaryBgDefault,
                        shape = RoundedCornerShape(WfmRadius.L)
                    )
                    .clip(RoundedCornerShape(WfmRadius.L))
                    .clickable(onClick = onCancel),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Отменить",
                    style = WfmTypography.Headline16Bold,
                    color = colors.textBrand
                )
            }

            WfmPrimaryButton(
                text = "Закрыть",
                onClick = onClose,
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
            )
        }
    }
}

@Preview(name = "Close Shift BottomSheet - Light", showBackground = true)
@Composable
private fun CloseShiftBottomSheetPreview() {
    WFMAppTheme(darkTheme = false) {
        CloseShiftBottomSheetContent(
            onCancel = {},
            onClose = {}
        )
    }
}

@Preview(name = "Close Shift BottomSheet - Dark", showBackground = true)
@Composable
private fun CloseShiftBottomSheetDarkPreview() {
    WFMAppTheme(darkTheme = true) {
        CloseShiftBottomSheetContent(
            onCancel = {},
            onClose = {}
        )
    }
}
