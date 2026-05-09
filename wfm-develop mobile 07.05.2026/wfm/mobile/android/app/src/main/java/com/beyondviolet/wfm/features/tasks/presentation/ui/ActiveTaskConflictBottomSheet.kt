package com.beyondviolet.wfm.features.tasks.presentation.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmLinkButton
import com.beyondviolet.wfm.ui.components.WfmLinkButtonSize
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Bottom Sheet для ошибки CONFLICT - "У сотрудника уже есть активная задача"
 *
 * Показывается когда работник пытается начать задачу, но у него уже есть активная задача.
 * Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3519-17575
 *
 * @param isVisible Показать или скрыть BottomSheet
 * @param activeTaskId UUID активной задачи (если есть в ответе сервера)
 * @param onNavigateToTask Callback для навигации к активной задаче
 * @param onDismiss Callback при закрытии BottomSheet
 */
@Composable
fun ActiveTaskConflictBottomSheet(
    isVisible: Boolean,
    activeTaskId: String?,
    onNavigateToTask: (String) -> Unit,
    onDismiss: () -> Unit
) {
    WfmBottomSheet(
        isVisible = isVisible,
        onDismiss = onDismiss,
        showOverlay = true
    ) {
        ActiveTaskConflictBottomSheetContent(
            activeTaskId = activeTaskId,
            onNavigateToTask = { taskId ->
                onDismiss()
                onNavigateToTask(taskId)
            },
            onDismiss = onDismiss
        )
    }
}

@Composable
private fun ActiveTaskConflictBottomSheetContent(
    activeTaskId: String?,
    onNavigateToTask: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                vertical = WfmSpacing.L,
                horizontal = WfmSpacing.XL
            ),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.S),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Заголовок
        Text(
            text = "Вы не можете выполнять две задачи одновременно",
            style = WfmTypography.Headline20Bold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        // Описание
        Text(
            text = "Чтобы начать эту задачу, завершите или приостановите текущую.",
            style = WfmTypography.Body16Regular,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(WfmSpacing.S))

        // Кнопки — зависит от наличия activeTaskId
        if (activeTaskId != null) {
            WfmPrimaryButton(
                text = "Перейти к текущей задаче",
                onClick = { onNavigateToTask(activeTaskId) },
                modifier = Modifier.fillMaxWidth()
            )

            WfmLinkButton(
                text = "Отмена",
                size = WfmLinkButtonSize.BIG,
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth()
            )
        } else {
            WfmPrimaryButton(
                text = "Понятно",
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ActiveTaskConflictBottomSheetContentWithTaskIdPreview() {
    WfmTheme {
        ActiveTaskConflictBottomSheetContent(
            activeTaskId = "2715499b-d174-43ab-a8c4-ffc078f02f3d",
            onNavigateToTask = {},
            onDismiss = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ActiveTaskConflictBottomSheetContentWithoutTaskIdPreview() {
    WfmTheme {
        ActiveTaskConflictBottomSheetContent(
            activeTaskId = null,
            onNavigateToTask = {},
            onDismiss = {}
        )
    }
}
