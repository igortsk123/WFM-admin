package com.beyondviolet.wfm.features.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.ui.res.painterResource
import com.beyondviolet.wfm.R
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.ShiftStatus
import com.beyondviolet.wfm.core.models.categoryBadgeScheme
import com.beyondviolet.wfm.core.models.durationOnly
import com.beyondviolet.wfm.core.models.formatShiftDuration
import com.beyondviolet.wfm.core.models.formatTime
import com.beyondviolet.wfm.ui.components.BadgeColor
import com.beyondviolet.wfm.ui.components.WfmButtonSize
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.*

/**
 * Состояния карточки смены на главном экране
 */
sealed class ShiftCardState {
    data object New : ShiftCardState()          // Новая смена (ещё не началась)
    data object InProgress : ShiftCardState()   // Смена в процессе
    data object Delay : ShiftCardState()        // Опаздывает на смену
    data object Done : ShiftCardState()         // Смена закрыта
    data object NoData : ShiftCardState()       // Данные не загрузились
    data object Empty : ShiftCardState()        // Нет задач
}

/**
 * Карточка смены на главном экране
 */
@Composable
fun ShiftCard(
    state: ShiftCardState,
    shift: CurrentShift?,
    positionName: String?,
    storeName: String?,
    statusText: String,
    isShiftLoading: Boolean = false,
    planTasks: List<com.beyondviolet.wfm.core.models.Task> = emptyList(),
    isPlanTasksLoading: Boolean = false,
    onOpenShift: () -> Unit,
    onTakeTask: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val spacing = WfmTheme.spacing

    val cardBackground = when (state) {
        is ShiftCardState.Empty -> colors.cardSurfaceSecondary
        else -> colors.cardSurfaceSecondary
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.L))
            .background(cardBackground)
            .border(
                width = 1.dp,
                color = colors.cardBorderSecondary,
                shape = RoundedCornerShape(spacing.L)
            )
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Содержимое карточки в зависимости от состояния
        when (state) {
            is ShiftCardState.New,
            is ShiftCardState.InProgress,
            is ShiftCardState.Delay -> {
                ShiftInfoSection(
                    state = state,
                    shift = shift,
                    positionName = positionName,
                    storeName = storeName,
                    statusText = statusText
                )

                // План дня - отдельно от информации о смене
                /*PlanSection(
                    planTasks = planTasks,
                    isPlanTasksLoading = isPlanTasksLoading
                )*/
            }
            is ShiftCardState.Done -> {
                ShiftInfoSection(
                    state = state,
                    shift = shift,
                    positionName = positionName,
                    storeName = storeName,
                    statusText = statusText
                )
            }
            is ShiftCardState.NoData -> {
                EmptyStateSection(
                    icon = {
                        Icon(
                            painter = painterResource(R.drawable.ic_featured),
                            contentDescription = null,
                            tint = Color.Unspecified,
                            modifier = Modifier.size(56.dp)
                        )
                    },
                    title = "Данные не загрузились",
                    subtitle = "Попробуйте обновить страницу",
                    backgroundColor = colors.surfaceBase
                )
            }
            is ShiftCardState.Empty -> {
                EmptyStateSection(
                    icon = {
                        Icon(
                            painter = painterResource(R.drawable.ic_featured_info),
                            contentDescription = null,
                            tint = Color.Unspecified,
                            modifier = Modifier.size(56.dp)
                        )
                    },
                    title = "У вас нет задач",
                    subtitle = "Ожидайте назначения задач или обратитесь к директору",
                    backgroundColor = colors.surfaceBase
                )
            }
        }

        // Кнопка действия
        ActionButton(
            state = state,
            isShiftLoading = isShiftLoading,
            onOpenShift = onOpenShift,
            onTakeTask = onTakeTask,
            onRefresh = onRefresh
        )
    }
}

@Composable
private fun ShiftInfoSection(
    state: ShiftCardState,
    shift: CurrentShift?,
    positionName: String?,
    storeName: String?,
    statusText: String,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography
    val spacing = WfmTheme.spacing

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.M))
            .background(colors.cardSurfaceBase)
    ) {
        // Бейдж должности, время, статус
        val statusColor = if (state is ShiftCardState.Delay) colors.textError else colors.textSecondary

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = spacing.L, vertical = spacing.M),
            verticalArrangement = Arrangement.spacedBy(spacing.XXS),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (!positionName.isNullOrBlank()) {
                Text(
                    text = positionName,
                    style = typography.Body12Medium,
                    color = colors.buttonSecondaryTextDefault,
                    modifier = Modifier
                        .clip(RoundedCornerShape(spacing.XS))
                        .background(colors.buttonSecondaryBgDefault)
                        .padding(horizontal = spacing.XS, vertical = 2.dp)
                )
            }

            val timeText = if (shift?.startTime != null && shift.endTime != null) {
                "${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}"
            } else {
                "—"
            }
            Text(
                text = timeText,
                style = typography.Headline24Bold,
                color = colors.textPrimary
            )

            if (statusText.isNotEmpty()) {
                Text(
                    text = statusText,
                    style = typography.Body12Medium,
                    color = statusColor,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // Разделитель
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(colors.cardBorderTertiary)
        )

        // Адрес и длительность
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = spacing.M, vertical = spacing.S),
            horizontalArrangement = Arrangement.spacedBy(spacing.S)
        ) {
            // Адрес
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Icon(
                    painter = painterResource(R.drawable.ic_pin_filled),
                    contentDescription = null,
                    tint = Color.Unspecified,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text = storeName ?: "",
                    style = typography.Body12Medium,
                    color = colors.textSecondary,
                    maxLines = 1
                )
            }

            // Длительность
            val duration = formatShiftDuration(shift)
            if (duration.isNotEmpty()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(R.drawable.ic_duration),
                        contentDescription = null,
                        tint = Color.Unspecified,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = duration,
                        style = typography.Body12Medium,
                        color = colors.textSecondary
                    )
                }
            }
        }
    }
}

// MARK: - Plan Section

@Composable
private fun PlanSection(
    planTasks: List<com.beyondviolet.wfm.core.models.Task>,
    isPlanTasksLoading: Boolean,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography
    val spacing = WfmTheme.spacing

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(spacing.XS)
    ) {
        Text(
            text = "Ваш план дня",
            style = typography.Body14Bold,
            color = colors.textPrimary
        )

        if (isPlanTasksLoading) {
            // Skeleton loading - 6 карточек
            Column(
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                repeat(6) {
                    TaskRowSkeleton()
                }
            }
        } else if (planTasks.isNotEmpty()) {
            // Карточки задач
            Column(
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                planTasks.forEach { task ->
                    TaskRow(task = task)
                }
            }
        }
        // Если planTasks.isEmpty() и не загружается - просто не показываем ничего
    }
}

@Composable
private fun TaskRow(
    task: com.beyondviolet.wfm.core.models.Task,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography

    val taskColor = task.categoryBadgeScheme().toAccentColor()
    val duration = task.durationOnly()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(colors.surfaceBase)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = task.safeTitle(),
                style = typography.Body14Medium,
                color = colors.textPrimary,
                modifier = Modifier.weight(1f)
            )

            Text(
                text = duration,
                style = typography.Body12Medium,
                color = colors.textSecondary,
                textAlign = TextAlign.End
            )
        }

        // Индикатор overlay слева
        Spacer(
            modifier = Modifier
                .width(4.dp)
                .padding(vertical = 6.dp)
                .height(20.dp)
                .background(
                    color = taskColor,
                    shape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp)
                )
                .align(Alignment.CenterStart)
        )
    }
}

@Composable
private fun TaskRowSkeleton(
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(colors.surfaceBase)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Skeleton для текста
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(14.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(colors.surfaceTertiary)
            )

            // Skeleton для времени
            Box(
                modifier = Modifier
                    .width(60.dp)
                    .height(14.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(colors.surfaceTertiary)
            )
        }

        // Индикатор overlay слева
        Spacer(
            modifier = Modifier
                .width(4.dp)
                .padding(vertical = 6.dp)
                .height(14.dp)
                .background(
                    color = colors.surfaceTertiary,
                    shape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp)
                )
                .align(Alignment.CenterStart)
        )
    }
}

// Helpers для задач

/**
 * Конвертирует BadgeColor в яркий акцентный цвет для индикатора задачи
 */
private fun BadgeColor.toAccentColor(): Color {
    return when (this) {
        BadgeColor.VIOLET -> WfmColors.Brand500
        BadgeColor.BLUE -> WfmColors.Blue500
        BadgeColor.YELLOW -> WfmColors.Yellow600
        BadgeColor.PINK -> WfmColors.Pink400
        BadgeColor.ORANGE -> WfmColors.Orange500
        BadgeColor.GREEN -> WfmColors.Green600
    }
}

@Composable
private fun EmptyStateSection(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String,
    backgroundColor: Color,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography
    val spacing = WfmTheme.spacing

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.L))
            .background(backgroundColor)
            .padding(horizontal = 12.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Иконка
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(colors.buttonSecondaryBgDefault),
            contentAlignment = Alignment.Center
        ) {
            icon()
        }

        // Заголовок
        Text(
            text = title,
            style = typography.Headline18Bold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center
        )

        // Подпись
        Text(
            text = subtitle,
            style = typography.Body16Regular,
            color = colors.textSecondary,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ActionButton(
    state: ShiftCardState,
    isShiftLoading: Boolean,
    onOpenShift: () -> Unit,
    onTakeTask: () -> Unit,
    onRefresh: () -> Unit
) {
    when (state) {
        is ShiftCardState.New,
        is ShiftCardState.Delay,
        is ShiftCardState.Done -> {
            WfmPrimaryButton(
                text = "Открыть смену",
                isLoading = isShiftLoading,
                onClick = onOpenShift,
                modifier = Modifier.fillMaxWidth()
            )
        }
        is ShiftCardState.InProgress -> {
            WfmSecondaryButton(
                text = "Закрыть смену",
                onClick = onOpenShift,
                modifier = Modifier.fillMaxWidth()
            )
        }
        is ShiftCardState.Empty -> {
            WfmPrimaryButton(
                text = "Закрыть смену",
                isLoading = isShiftLoading,
                onClick = onOpenShift,
                modifier = Modifier.fillMaxWidth()
            )
        }
        is ShiftCardState.NoData -> {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                WfmSecondaryButton(
                    text = "Обновить",
                    size = WfmButtonSize.Medium,
                    onClick = onRefresh,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

// Helpers

// Previews

@Preview(showBackground = true)
@Composable
private fun ShiftCardNewPreview() {
    WFMAppTheme {
        ShiftCard(
            state = ShiftCardState.New,
            shift = null,
            positionName = "Выкладка",
            storeName = "Магазин №1",
            statusText = "Начнется через 30 мин",
            onOpenShift = {},
            isPlanTasksLoading = true,
            onTakeTask = {},
            onRefresh = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftCardInProgressPreview() {
    WFMAppTheme {
        ShiftCard(
            state = ShiftCardState.InProgress,
            shift = null,
            positionName = "Выкладка",
            storeName = "Магазин №1",
            statusText = "",
            onOpenShift = {},
            onTakeTask = {},
            onRefresh = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftCardEmptyPreview() {
    WFMAppTheme {
        ShiftCard(
            state = ShiftCardState.Empty,
            shift = null,
            positionName = null,
            storeName = null,
            statusText = "",
            onOpenShift = {},
            onTakeTask = {},
            onRefresh = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftCardNoDataPreview() {
    WFMAppTheme {
        ShiftCard(
            state = ShiftCardState.NoData,
            shift = null,
            positionName = null,
            storeName = null,
            statusText = "",
            onOpenShift = {},
            onTakeTask = {},
            onRefresh = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}
