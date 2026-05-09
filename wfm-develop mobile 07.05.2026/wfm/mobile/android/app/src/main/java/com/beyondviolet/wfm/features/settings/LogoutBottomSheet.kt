package com.beyondviolet.wfm.features.settings

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
 * BottomSheet подтверждения выхода из профиля
 *
 * @param isVisible показывать ли BottomSheet
 * @param onDismiss вызывается при закрытии (свайп вниз / клик на overlay)
 * @param onConfirm вызывается при подтверждении выхода
 *
 * Использование:
 * ```
 * LogoutBottomSheet(
 *     isVisible = showLogoutSheet,
 *     onDismiss = { showLogoutSheet = false },
 *     onConfirm = {
 *         viewModel.logout()
 *         onLogout()
 *     }
 * )
 * ```
 */
@Composable
fun LogoutBottomSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    WfmBottomSheet(
        isVisible = isVisible,
        onDismiss = onDismiss,
        showOverlay = true
    ) {
        LogoutBottomSheetContent(
            onCancel = onDismiss,
            onLogout = {
                onDismiss()
                onConfirm()
            }
        )
    }
}

@Composable
private fun LogoutBottomSheetContent(
    onCancel: () -> Unit,
    onLogout: () -> Unit
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
        Text(
            text = "Вы хотите выйти из профиля?",
            style = WfmTypography.Headline20Bold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = WfmSpacing.L, bottom = WfmSpacing.S)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = WfmSpacing.L),
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
        ) {
            // "Отменить" — secondary (neutral) кнопка
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

            // "Выйти" — primary кнопка
            WfmPrimaryButton(
                text = "Выйти",
                onClick = onLogout,
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// PREVIEW
// ─────────────────────────────────────────────────────────────────

@Preview(name = "Logout BottomSheet - Light", showBackground = true)
@Composable
private fun LogoutBottomSheetPreview() {
    WFMAppTheme(darkTheme = false) {
        LogoutBottomSheetContent(
            onCancel = {},
            onLogout = {}
        )
    }
}

@Preview(name = "Logout BottomSheet - Dark", showBackground = true)
@Composable
private fun LogoutBottomSheetDarkPreview() {
    WFMAppTheme(darkTheme = true) {
        LogoutBottomSheetContent(
            onCancel = {},
            onLogout = {}
        )
    }
}
