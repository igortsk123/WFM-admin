package com.beyondviolet.wfm.features.tasks.presentation.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.Category
import com.beyondviolet.wfm.core.models.HistoryBrief
import com.beyondviolet.wfm.core.models.WorkType
import com.beyondviolet.wfm.core.models.PermissionType
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskReviewState
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.models.Zone
import com.beyondviolet.wfm.core.models.categoryBadgeText
import com.beyondviolet.wfm.core.models.categoryBadgeScheme
import com.beyondviolet.wfm.core.models.formattedTimeRange
import com.beyondviolet.wfm.core.models.zoneWithCategoryDisplayName
import com.beyondviolet.wfm.ui.components.WfmBadge
import com.beyondviolet.wfm.ui.components.WfmProgressBar
import com.beyondviolet.wfm.ui.components.WfmProgressState
import com.beyondviolet.wfm.ui.components.WfmProgressType
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.utils.clickableDebounced

// MARK: - Task Extension для кнопки действия

/**
 * Текст кнопки действия в зависимости от состояния задачи
 */
fun Task.actionButtonText(): String {
    // Для отклоненных задач показываем "Возвращена"
    if (safeState() == TaskState.PAUSED && isRejected()) {
        return "Возвращена"
    }

    // Для задач на проверке показываем "На проверке"
    if (safeState() == TaskState.COMPLETED && reviewState == TaskReviewState.ON_REVIEW) {
        return "На проверке"
    }

    return when (safeState()) {
        TaskState.NEW -> "К задаче"
        TaskState.IN_PROGRESS -> "В работе"
        TaskState.PAUSED -> "Приостановлена"
        TaskState.COMPLETED -> "Завершена"
    }
}

/**
 * Вычислить прогресс выполнения задачи (0.0f - 1.0f)
 */
fun Task.calculateProgress(): Float {
    val historyBrief = historyBrief ?: return 0f
    val duration = historyBrief.duration ?: return 0f
    val plannedMinutes = plannedMinutes ?: return 0f

    val plannedSeconds = plannedMinutes * 60f
    var totalSeconds = duration.toFloat()

    // Только для IN_PROGRESS добавляем время с последнего обновления
    if (safeState() == TaskState.IN_PROGRESS) {
        historyBrief.timeStateUpdated?.let { timeStateUpdated ->
            val elapsedSinceUpdate = (System.currentTimeMillis() - timeStateUpdated.toEpochMilliseconds()) / 1000f
            totalSeconds += elapsedSinceUpdate
        }
    }

    val progress = totalSeconds / plannedSeconds
    return progress.coerceAtMost(1f)
}

/**
 * Карточка задачи для нового дизайна списка задач
 * Соответствует дизайну Figma node-id=3491-8538
 */
@Composable
fun TaskCardView(
    task: Task,
    onDetail: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = colors.surfaceSecondary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .border(
                width = 1.dp,
                color = if (task.safeState() == TaskState.PAUSED && task.isRejected()) {
                    colors.borderError
                } else {
                    colors.cardBorderSecondary
                },
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .clickableDebounced(onClick = onDetail)
    ) {
        // Контейнер для badge + название
        Column(
            modifier = Modifier.padding(
                top = WfmSpacing.M,
                start = WfmSpacing.M,
                end = WfmSpacing.M
            ),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
        ) {
            // Badge категории (только если есть)
            task.categoryBadgeText()?.let { badgeText ->
                WfmBadge(
                    text = badgeText,
                    color = task.categoryBadgeScheme()
                )
            }

            // Название зоны (с категорией если применимо)
            Text(
                text = task.zoneWithCategoryDisplayName(),
                style = WfmTypography.Headline14Medium,
                color = colors.cardTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textDecoration = if (task.safeState() == TaskState.COMPLETED && !task.isRejected() && task.reviewState != TaskReviewState.ON_REVIEW) {
                    TextDecoration.LineThrough
                } else {
                    null
                }
            )
        }

        // Прогресс-бар (только для IN_PROGRESS и PAUSED)
        if (task.safeState() == TaskState.IN_PROGRESS || task.safeState() == TaskState.PAUSED) {
            WfmProgressBar(
                progress = task.calculateProgress(),
                type = WfmProgressType.SOLID,
                state = if (task.safeState() == TaskState.PAUSED) WfmProgressState.PAUSED else WfmProgressState.NORMAL,
                showText = false,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.M)
                    .padding(bottom = WfmSpacing.S)
                    .padding(top = WfmSpacing.S)
            )
        }

        // Строка: Время + Кнопка действия (скрываем только для успешно завершённых, кроме задач на проверке)
        if (task.safeState() != TaskState.COMPLETED || task.isRejected() || task.reviewState == TaskReviewState.ON_REVIEW) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        start = WfmSpacing.M,
                        end = WfmSpacing.M,
                        bottom = WfmSpacing.M
                    ),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Иконка часов + время
                Row(
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXXS),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_time),
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = colors.cardTextTertuary
                    )
                    Text(
                        text = task.formattedTimeRange(),
                        style = WfmTypography.Caption12Regular,
                        color = colors.cardTextTertuary
                    )
                }

                // Кнопка действия (текст зависит от состояния)
                TextButton(
                    onClick = onDetail,
                    modifier = Modifier
                        .height(24.dp),
                    shape = RoundedCornerShape(WfmRadius.S),
                    colors = ButtonDefaults.textButtonColors(
                        containerColor = colors.buttonTertiaryBgDefault,
                        contentColor = colors.buttonTertiaryTextDefault
                    ),
                    contentPadding = PaddingValues(
                        horizontal = WfmSpacing.S,
                        vertical = 0.dp
                    )
                ) {
                    Text(
                        text = task.actionButtonText(),
                        style = WfmTypography.Body12Medium
                    )
                }
            }
        } else {
            // Для успешно завершённых задач добавляем bottom padding
            Spacer(modifier = Modifier.height(WfmSpacing.M))
        }

        // Блок с сообщением об отклонении (только для отклоненных задач в PAUSED)
        task.safeReviewComment()?.takeIf { task.safeState() == TaskState.PAUSED }?.let { reviewComment ->
            Text(
                text = reviewComment,
                style = WfmTypography.Caption12Regular,
                color = colors.cardTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.badgeRedBgLight)
                    .padding(
                        horizontal = WfmSpacing.M,
                        vertical = WfmSpacing.S
                    )
            )
        }
    }
}

// MARK: - Preview Helpers

private fun createPreviewTask(
    state: TaskState = TaskState.NEW,
    withRejection: Boolean = false,
    withProgress: Boolean = false,
    withCategory: Boolean = false
): Task {
    val now = kotlinx.datetime.Clock.System.now()
    return Task(
        id = "preview-task-123",
        title = null,
        description = "Выкладка товара в торговом зале",
        type = null,
        plannedMinutes = 60,
        creatorId = 123,
        assigneeId = 456,
        state = if (withRejection) TaskState.PAUSED else state,
        reviewState = if (withRejection) com.beyondviolet.wfm.core.models.TaskReviewState.REJECTED else null,
        acceptancePolicy = com.beyondviolet.wfm.core.models.AcceptancePolicy.MANUAL,
        requiresPhoto = false,
        comment = null,
        reportText = null,
        reportImageUrl = null,
        createdAt = now,
        updatedAt = now,
        reviewComment = if (withRejection) "Ценники на 'Ликер' остались старыми. Проверь новые поступления в конверте у старшего смены и обнови их." else null,
        externalId = 12345,
        shiftId = 789,
        priority = 1,
        workTypeId = if (withCategory) 4 else 1,
        workType = WorkType(id = if (withCategory) 4 else 1, name = if (withCategory) "Ценообразование" else "Мерчендайзинг"),
        zoneId = 1,
        zone = Zone(id = 1, name = if (withCategory) "Заморозка" else "Фреш1", priority = 1),
        categoryId = if (withCategory) 30 else 1,
        category = Category(id = if (withCategory) 30 else 1, name = if (withCategory) "МЯСО ЗАМОРОЖЕННОЕ" else "Выкладка"),
        timeStart = "10:10:00",
        timeEnd = "10:30:00",
        source = "LAMA",
        historyBrief = if (withProgress) {
            HistoryBrief(
                duration = 600, // 10 минут
                timeStart = now,
                timeStateUpdated = now
            )
        } else null
    )
}

// MARK: - Previews

@Preview(name = "Task Card - NEW", showBackground = true)
@Composable
private fun TaskCardViewNewPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            TaskCardView(
                task = createPreviewTask(state = TaskState.NEW),
                onDetail = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Task Card - IN_PROGRESS", showBackground = true)
@Composable
private fun TaskCardViewInProgressPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            TaskCardView(
                task = createPreviewTask(state = TaskState.IN_PROGRESS, withProgress = true),
                onDetail = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Task Card - PAUSED", showBackground = true)
@Composable
private fun TaskCardViewPausedPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            TaskCardView(
                task = createPreviewTask(state = TaskState.PAUSED, withProgress = true),
                onDetail = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Task Card - COMPLETED", showBackground = true)
@Composable
private fun TaskCardViewCompletedPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            TaskCardView(
                task = createPreviewTask(state = TaskState.COMPLETED),
                onDetail = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Task Card - REJECTED", showBackground = true)
@Composable
private fun TaskCardViewRejectedPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            TaskCardView(
                task = createPreviewTask(state = TaskState.PAUSED, withRejection = true),
                onDetail = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Task Card - With Category", showBackground = true)
@Composable
private fun TaskCardViewWithCategoryPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            TaskCardView(
                task = createPreviewTask(state = TaskState.NEW, withCategory = true),
                onDetail = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Task Card - Multiple States", showBackground = true)
@Composable
private fun TaskCardViewMultiplePreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TaskCardView(
                    task = createPreviewTask(state = TaskState.NEW),
                    onDetail = {}
                )
                TaskCardView(
                    task = createPreviewTask(state = TaskState.IN_PROGRESS, withProgress = true),
                    onDetail = {}
                )
                TaskCardView(
                    task = createPreviewTask(state = TaskState.COMPLETED),
                    onDetail = {}
                )
            }
        }
    }
}
