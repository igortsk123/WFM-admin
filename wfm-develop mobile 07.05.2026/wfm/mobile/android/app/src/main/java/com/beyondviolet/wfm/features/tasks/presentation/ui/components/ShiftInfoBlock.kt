package com.beyondviolet.wfm.features.tasks.presentation.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.ShiftStatus
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskReviewState
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.models.TaskType
import com.beyondviolet.wfm.core.models.formatShiftTime
import com.beyondviolet.wfm.core.utils.DateFormatters
import com.beyondviolet.wfm.ui.components.WfmProgressBar
import com.beyondviolet.wfm.ui.components.WfmProgressType
import com.beyondviolet.wfm.ui.components.WfmProgressState
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Блок информации о текущей смене
 * Показывает дату, время и прогресс выполнения задач
 *
 * @param shift Текущая смена
 * @param tasks Список всех задач
 * @param modifier Modifier для кастомизации компонента
 */
@Composable
fun ShiftInfoBlock(
    shift: CurrentShift,
    tasks: List<Task>,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    // Вычисляем общее количество плановых задач
    val totalTasksCount = tasks.count { it.type == TaskType.PLANNED }

    // Вычисляем количество завершённых и принятых плановых задач
    val completedTasksCount = tasks.count { task ->
        task.type == TaskType.PLANNED &&
        task.state == TaskState.COMPLETED &&
        task.reviewState == TaskReviewState.ACCEPTED
    }

    // Вычисляем прогресс (0.0 - 1.0)
    val progress = if (totalTasksCount > 0) {
        completedTasksCount.toFloat() / totalTasksCount.toFloat()
    } else {
        0f
    }

    Column(
        modifier = modifier.padding(WfmSpacing.L),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XS)
    ) {
        // Секция с датой и временем
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            // Дата
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
            ) {
                Text(
                    text = "Дата",
                    style = WfmTypography.Caption12Regular,
                    color = colors.cardTextTertuary
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_calendar),
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = colors.cardTextPrimary
                    )

                    Text(
                        text = DateFormatters.formatShiftDate(shift.shiftDate ?: ""),
                        style = WfmTypography.Body14Regular,
                        color = colors.cardTextPrimary
                    )
                }
            }

            // Время
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
            ) {
                Text(
                    text = "Время",
                    style = WfmTypography.Caption12Regular,
                    color = colors.cardTextTertuary
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_time),
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = colors.cardTextPrimary
                    )

                    Text(
                        text = formatShiftTime(
                            start = shift.startTime ?: "",
                            end = shift.endTime ?: ""
                        ),
                        style = WfmTypography.Body14Regular,
                        color = colors.cardTextPrimary
                    )
                }
            }
        }

        // Прогресс-бар
        WfmProgressBar(
            progress = progress,
            type = WfmProgressType.DASHED,
            state = WfmProgressState.NORMAL,
            segmentCount = totalTasksCount,
            showText = true,
            text = "Выполнено $completedTasksCount из $totalTasksCount основных задач"
        )
    }
}

// MARK: - Preview

@Preview(name = "Shift Info Block - С задачами", showBackground = true)
@Composable
private fun ShiftInfoBlockPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            ShiftInfoBlock(
                shift = CurrentShift(
                    id = 123,
                    planId = 456,
                    status = ShiftStatus.OPENED,
                    assignmentId = 123,
                    openedAt = null,
                    closedAt = null,
                    startTime = "08:00:00",
                    endTime = "20:00:00",
                    shiftDate = "2025-02-12"
                ),
                tasks = listOf(
                    Task(
                        id = "task-1",
                        title = "Задача 1",
                        description = "Описание задачи 1",
                        plannedMinutes = 60,
                        creatorId = 1,
                        assigneeId = 2,
                        state = TaskState.COMPLETED,
                        reviewState = TaskReviewState.ACCEPTED,
                        createdAt = kotlinx.datetime.Clock.System.now(),
                        updatedAt = kotlinx.datetime.Clock.System.now()
                    ),
                    Task(
                        id = "task-2",
                        title = "Задача 2",
                        description = "Описание задачи 2",
                        plannedMinutes = 90,
                        creatorId = 1,
                        assigneeId = 2,
                        state = TaskState.COMPLETED,
                        reviewState = TaskReviewState.ACCEPTED,
                        createdAt = kotlinx.datetime.Clock.System.now(),
                        updatedAt = kotlinx.datetime.Clock.System.now()
                    ),
                    Task(
                        id = "task-3",
                        title = "Задача 3",
                        description = "Описание задачи 3",
                        plannedMinutes = 30,
                        creatorId = 1,
                        assigneeId = 2,
                        state = TaskState.IN_PROGRESS,
                        createdAt = kotlinx.datetime.Clock.System.now(),
                        updatedAt = kotlinx.datetime.Clock.System.now()
                    ),
                    Task(
                        id = "task-4",
                        title = "Задача 4",
                        description = "Описание задачи 4",
                        plannedMinutes = 45,
                        creatorId = 1,
                        assigneeId = 2,
                        state = TaskState.NEW,
                        createdAt = kotlinx.datetime.Clock.System.now(),
                        updatedAt = kotlinx.datetime.Clock.System.now()
                    ),
                    Task(
                        id = "task-5",
                        title = "Задача 5",
                        description = "Описание задачи 5",
                        plannedMinutes = 120,
                        creatorId = 1,
                        assigneeId = 2,
                        state = TaskState.NEW,
                        createdAt = kotlinx.datetime.Clock.System.now(),
                        updatedAt = kotlinx.datetime.Clock.System.now()
                    )
                ),
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Shift Info Block - Пустой список", showBackground = true)
@Composable
private fun ShiftInfoBlockEmptyPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            ShiftInfoBlock(
                shift = CurrentShift(
                    id = 124,
                    planId = 457,
                    status = ShiftStatus.OPENED,
                    assignmentId = 124,
                    openedAt = null,
                    closedAt = null,
                    startTime = "09:00:00",
                    endTime = "18:00:00",
                    shiftDate = "2025-03-15"
                ),
                tasks = emptyList(),
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}
