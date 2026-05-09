package com.beyondviolet.wfm.features.managerhome.components

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.*
import com.beyondviolet.wfm.ui.components.WfmBadge
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.utils.clickableDebounced

/**
 * Карточка задачи для менеджера (отображается на главной странице в секции "Задачи на проверку")
 * Дизайн: Figma node-id=3601:15750
 */
@Composable
fun ManagerTaskCardView(
    task: Task,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = colors.cardSurfaceSecondary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .border(
                width = 1.dp,
                color = colors.cardBorderSecondary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .clickableDebounced(debounceTime = 500L, onClick = onTap)
    ) {
        // Контейнер для badge + название
        Column(
            modifier = Modifier.padding(
                top = WfmSpacing.M,
                start = WfmSpacing.M,
                end = WfmSpacing.M,
                bottom = WfmSpacing.S
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

            // Название зоны
            Text(
                text = task.zoneDisplayName(),
                style = WfmTypography.Headline14Medium,
                color = colors.cardTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Строка: Время + Имя работника
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
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f, fill = false)
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

            Spacer(modifier = Modifier.width(WfmSpacing.XXS))

            // Имя работника
            task.assignee?.let { assignee ->
                Text(
                    text = assignee.formattedName(),
                    style = WfmTypography.Headline14Medium,
                    color = colors.cardTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

// MARK: - Preview Helpers

private fun createPreviewTask(
    workTypeId: Int = 4,
    workTypeName: String = "Другие работы",
    assigneeId: Int = 123,
    assignee: AssigneeBrief? = AssigneeBrief(
        id = 123,
        firstName = "Анна",
        lastName = "Елисеева",
        middleName = "Михайловна"
    )
): Task {
    val now = kotlinx.datetime.Clock.System.now()
    return Task(
        id = "preview-manager-task-123",
        title = null,
        description = "Уборка в отделе ФРОВ",
        plannedMinutes = 30,
        assigneeId = assigneeId,
        assignee = assignee,
        state = TaskState.COMPLETED,
        createdAt = now,
        updatedAt = now,
        workTypeId = workTypeId,
        workType = WorkType(id = workTypeId, name = workTypeName),
        zoneId = 1,
        zone = Zone(id = 1, name = "ФРОВ", priority = 1),
        categoryId = 1,
        category = Category(id = 1, name = "Уборка"),
        timeStart = "08:30:00",
        timeEnd = "09:00:00"
    )
}

// MARK: - Previews

@Preview(name = "Manager Task Card - Pink", showBackground = true)
@Composable
private fun ManagerTaskCardViewPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            ManagerTaskCardView(
                task = createPreviewTask(
                    workTypeId = 4,
                    workTypeName = "Другие работы"
                ),
                onTap = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Manager Task Card - Yellow", showBackground = true)
@Composable
private fun ManagerTaskCardViewYellowPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            ManagerTaskCardView(
                task = createPreviewTask(
                    workTypeId = 3,
                    workTypeName = "Смена ценников",
                    assigneeId = 456,
                    assignee = AssigneeBrief(
                        id = 456,
                        firstName = "Иван",
                        lastName = "Петров",
                        middleName = null
                    )
                ).copy(
                    description = "Молочные продукты",
                    plannedMinutes = 60,
                    zone = Zone(id = 2, name = "Молочка", priority = 2),
                    timeStart = "11:00:00",
                    timeEnd = "12:00:00"
                ),
                onTap = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Manager Task Card - Multiple", showBackground = true)
@Composable
private fun ManagerTaskCardViewMultiplePreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ManagerTaskCardView(
                    task = createPreviewTask(
                        workTypeId = 4,
                        workTypeName = "Другие работы"
                    ),
                    onTap = {}
                )
                ManagerTaskCardView(
                    task = createPreviewTask(
                        workTypeId = 3,
                        workTypeName = "Смена ценников",
                        assigneeId = 456,
                        assignee = AssigneeBrief(
                            id = 456,
                            firstName = "Иван",
                            lastName = "Петров",
                            middleName = null
                        )
                    ).copy(
                        description = "Молочные продукты",
                        plannedMinutes = 60,
                        zone = Zone(id = 2, name = "Молочка", priority = 2),
                        timeStart = "11:00:00",
                        timeEnd = "12:00:00"
                    ),
                    onTap = {}
                )
            }
        }
    }
}
