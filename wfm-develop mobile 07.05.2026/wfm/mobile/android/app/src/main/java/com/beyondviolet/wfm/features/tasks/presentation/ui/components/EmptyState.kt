package com.beyondviolet.wfm.features.tasks.presentation.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.components.WfmTextButton
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Модель кнопки для WfmEmptyState
 */
data class EmptyStateButton(
    val title: String,
    val style: ButtonStyle,
    val action: () -> Unit
) {
    enum class ButtonStyle {
        PRIMARY,    // WfmPrimaryButton
        SECONDARY,  // WfmSecondaryButton
        LINK        // WfmTextButton
    }
}

/**
 * Переиспользуемый компонент для отображения пустых состояний
 * Используется для "нет открытой смены" и "нет задач"
 *
 * @param icon Composable для иконки (обычно Material Icon)
 * @param title Заголовок
 * @param description Описание (опционально)
 * @param buttons Список кнопок
 * @param modifier Modifier
 */
@Composable
fun EmptyState(
    title: String,
    description: String? = null,
    buttons: List<EmptyStateButton> = emptyList(),
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = WfmSpacing.L),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Иконка + текст
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Иконка с оригинальными цветами (56dp)
            Icon(
                painter = painterResource(R.drawable.ic_featured_info),
                contentDescription = null,
                tint = Color.Unspecified,
                modifier = Modifier.size(56.dp)
            )

            Spacer(modifier = Modifier.height(WfmSpacing.S))

            // Заголовок
            Text(
                text = title,
                style = WfmTypography.Headline18Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            // Описание (опционально)
            if (description != null) {
                Spacer(modifier = Modifier.height(WfmSpacing.S))
                Text(
                    text = description,
                    style = WfmTypography.Body16Regular,
                    color = colors.cardTextSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // Кнопки
        if (buttons.isNotEmpty()) {
            Spacer(modifier = Modifier.height(WfmSpacing.L))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 52.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                buttons.forEachIndexed { index, button ->
                    if (index > 0) {
                        Spacer(modifier = Modifier.height(WfmSpacing.XXS))
                    }

                    when (button.style) {
                        EmptyStateButton.ButtonStyle.PRIMARY -> {
                            WfmPrimaryButton(
                                text = button.title,
                                onClick = button.action,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        EmptyStateButton.ButtonStyle.SECONDARY -> {
                            WfmSecondaryButton(
                                text = button.title,
                                onClick = button.action,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        EmptyStateButton.ButtonStyle.LINK -> {
                            WfmTextButton(
                                text = button.title,
                                onClick = button.action,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Previews

@Preview(showBackground = true)
@Composable
fun PreviewEmptyStateNoShift() {
    WfmTheme {
        EmptyState(
            title = "Список задач будет доступен после открытия смены",
            description = null,
            buttons = listOf(
                EmptyStateButton(
                    title = "Открыть смену",
                    style = EmptyStateButton.ButtonStyle.PRIMARY,
                    action = {}
                )
            )
        )
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewEmptyStateNoTasks() {
    WfmTheme {
        EmptyState(
            title = "У вас нет задач",
            description = "Пока нет задач, вы можете освежить знания по регламентам или сообщить директору.",
            buttons = listOf(
                EmptyStateButton(
                    title = "Регламенты",
                    style = EmptyStateButton.ButtonStyle.LINK,
                    action = {}
                ),
                EmptyStateButton(
                    title = "Сообщить директору",
                    style = EmptyStateButton.ButtonStyle.SECONDARY,
                    action = {}
                )
            )
        )
    }
}
