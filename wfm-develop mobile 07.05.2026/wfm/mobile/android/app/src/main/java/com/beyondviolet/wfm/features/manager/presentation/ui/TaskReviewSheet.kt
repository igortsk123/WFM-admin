package com.beyondviolet.wfm.features.manager.presentation.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.analytics.NoOpAnalyticsService
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.RejectTaskRequest
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.ui.components.BadgeColor
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import com.beyondviolet.wfm.ui.components.WfmBadge
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.components.WfmTextField
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSemanticColors
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.ceil
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.models.formatTime
import com.beyondviolet.wfm.core.models.formatDuration
import com.beyondviolet.wfm.core.models.formatDurationFromSeconds

/**
 * Bottom Sheet для проверки и подтверждения/отклонения задачи менеджером
 */
@Composable
fun TaskReviewSheet(
    task: Task,
    tasksService: TasksService,
    toastManager: ToastManager,
    isVisible: Boolean,
    onDismiss: () -> Unit,
    analyticsService: AnalyticsService = NoOpAnalyticsService(),
    onSuccess: (() -> Unit)? = null
) {
    val viewModel = remember(task) {
        TaskReviewViewModel(task, tasksService, toastManager, analyticsService)
    }

    LaunchedEffect(isVisible) {
        if (isVisible) {
            analyticsService.track(
                AnalyticsEvent.TaskReviewSheetOpened(
                    taskReviewState = task.reviewState?.name ?: "NONE"
                )
            )
        }
    }
    val uiState by viewModel.uiState.collectAsState()

    WfmBottomSheet(
        isVisible = isVisible,
        onDismiss = {
            onDismiss()
        },
        showOverlay = true,
        toastManager = toastManager
    ) {
        TaskReviewSheetContent(
            task = uiState.task,
            rejectionReason = uiState.rejectionReason,
            isLoading = uiState.isLoading,
            isCommentError = uiState.isCommentError,
            badgeColor = viewModel.getBadgeColor(),
            onReasonChange = { viewModel.updateRejectionReason(it) },
            onApprove = {
                viewModel.approveTask(
                    onSuccess = {
                        onSuccess?.invoke()
                        onDismiss()
                    }
                )
            },
            onReject = {
                viewModel.rejectTask(
                    onSuccess = {
                        onSuccess?.invoke()
                        onDismiss()
                    }
                )
            }
        )
    }
}

@Composable
private fun TaskReviewSheetContent(
    task: Task,
    rejectionReason: TextFieldValue,
    isLoading: Boolean,
    isCommentError: Boolean,
    badgeColor: BadgeColor,
    onReasonChange: (TextFieldValue) -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surfaceSecondary)
            .verticalScroll(rememberScrollState())
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WfmSpacing.L),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.L)
        ) {
            // Заголовок с badge, названием и исполнителем
            HeaderSection(task, badgeColor, colors)

            // Карточка с временем (План/Факт)
            TimetablesCard(task, colors)

            // Фотографии (если есть)
            task.reportImageUrl?.let { imageUrl ->
                PhotosSection(imageUrl, colors)
            }

            // Комментарий по задаче
            CommentSection(
                task = task,
                rejectionReason = rejectionReason,
                isCommentError = isCommentError,
                onReasonChange = onReasonChange,
                colors = colors
            )
        }

        // Кнопки действий
        ActionsSection(
            isLoading = isLoading,
            onApprove = onApprove,
            onReject = onReject,
            colors = colors
        )
    }
}

// MARK: - Header Section

@Composable
private fun HeaderSection(task: Task, badgeColor: BadgeColor, colors: WfmSemanticColors) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
    ) {
        // Badge с типом работы
        task.workType?.let { workType ->
            WfmBadge(
                text = workType.name,
                color = badgeColor
            )
        }

        // Название задачи
        Text(
            text = task.title ?: task.workType?.name ?: "Задача",
            style = WfmTypography.Headline18Bold,
            color = colors.cardTextPrimary,
            maxLines = 2
        )

        // Имя работника
        task.assignee?.let { assignee ->
            Text(
                text = assignee.formattedName(),
                style = WfmTypography.Headline14Medium,
                color = colors.cardTextPrimary
            )
        }
    }
}

// MARK: - Timetables Card

@Composable
private fun TimetablesCard(task: Task, colors: WfmSemanticColors) {
    var isExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(WfmRadius.XL))
            .background(
                color = colors.cardBorderTertiary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .border(
                width = 1.dp,
                color = colors.borderSecondary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
    ) {
        // План
        PlanSection(task, colors)

        // Факт
        val hasMultipleIntervals = (task.historyBrief?.workIntervals?.size ?: 0) > 1
        FactSection(
            task = task,
            colors = colors,
            isExpanded = isExpanded,
            hasMultipleIntervals = hasMultipleIntervals,
            onToggle = { isExpanded = !isExpanded }
        )

        // Раскрывающийся список интервалов
        if (isExpanded) {
            IntervalsSection(task, colors)
        }

        // Отклонение (если есть)
        val deviation = calculateDeviation(task)
        if (deviation != null && deviation > 0) {
            DeviationSection(deviation, colors)
        }
    }
}

@Composable
private fun PlanSection(task: Task, colors: WfmSemanticColors) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.cardSurfaceSecondary)
            .padding(WfmSpacing.M),
        horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
    ) {
        Text(
            text = "План",
            style = WfmTypography.Headline14Medium,
            color = colors.cardTextPrimary,
            modifier = Modifier.width(98.dp)
        )

        task.timeStart?.let { timeStart ->
            task.timeEnd?.let { timeEnd ->
                Text(
                    text = "${formatTime(timeStart)}-${formatTime(timeEnd)}",
                    style = WfmTypography.Headline14Medium,
                    color = colors.cardTextPrimary,
                    modifier = Modifier.width(98.dp)
                )
            }
        }

        Text(
            text = formatDuration(task.plannedMinutes ?: 0),
            style = WfmTypography.Headline14Medium,
            color = colors.cardTextPrimary,
            modifier = Modifier.weight(1f)
        )
    }

    // Divider
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(colors.borderSecondary)
    )
}

@Composable
private fun FactSection(
    task: Task,
    colors: WfmSemanticColors,
    isExpanded: Boolean,
    hasMultipleIntervals: Boolean,
    onToggle: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.cardSurfaceBase)
            .then(if (hasMultipleIntervals) Modifier.clickable(onClick = onToggle) else Modifier)
            .padding(WfmSpacing.M),
        horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Факт",
            style = WfmTypography.Headline14Medium,
            color = colors.cardTextPrimary,
            modifier = Modifier.width(98.dp)
        )

        task.historyBrief?.let { historyBrief ->
            historyBrief.timeStart?.let { timeStart ->
                historyBrief.timeStateUpdated?.let { timeEnd ->
                    Text(
                        text = "${formatTime(timeStart)}-${formatTime(timeEnd)}",
                        style = WfmTypography.Headline14Medium,
                        color = colors.cardTextPrimary,
                        modifier = Modifier.width(98.dp)
                    )
                }
            }
        }

        Text(
            text = formatDurationFromSeconds(task.historyBrief?.duration),
            style = WfmTypography.Headline14Medium,
            color = colors.cardTextPrimary,
            modifier = Modifier.weight(1f)
        )

        // Chevron icon (только если есть несколько отрезков)
        if (hasMultipleIntervals) {
            Icon(
                painter = painterResource(
                    if (isExpanded) com.beyondviolet.wfm.ui.R.drawable.ic_chevron_up
                    else com.beyondviolet.wfm.ui.R.drawable.ic_chevron_down
                ),
                contentDescription = if (isExpanded) "Свернуть" else "Развернуть",
                tint = colors.cardTextPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
private fun IntervalsSection(task: Task, colors: WfmSemanticColors) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.cardSurfaceBase)
    ) {
        task.historyBrief?.workIntervals?.forEach { interval ->
            interval.timeEnd?.let { timeEnd ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 118.dp, end = WfmSpacing.M)
                        .padding(vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
                ) {
                    Text(
                        text = "${formatTime(interval.timeStart)}-${formatTime(timeEnd)}",
                        style = WfmTypography.Body14Regular,
                        color = colors.cardTextPrimary,
                        modifier = Modifier.width(98.dp),
                        maxLines = 1
                    )

                    Text(
                        text = formatDuration(
                            ceil((timeEnd.toEpochMilliseconds() - interval.timeStart.toEpochMilliseconds()) / 1000.0 / 60.0).toInt()
                        ),
                        style = WfmTypography.Body14Regular,
                        color = colors.cardTextPrimary,
                        modifier = Modifier.width(64.dp),
                        maxLines = 1
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(WfmSpacing.S))
    }
}

@Composable
private fun DeviationSection(deviation: Int, colors: WfmSemanticColors) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.badgeRedBgLight)
            .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.S)
    ) {
        Text(
            text = "Отклонение: +${formatDuration(deviation)}",
            style = WfmTypography.Body12Regular,
            color = colors.cardTextError,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

// MARK: - Photos Section

@Composable
private fun PhotosSection(imageUrl: String, colors: WfmSemanticColors) {
    var showFullscreenImage by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
    ) {
        Text(
            text = "Фотографии",
            style = WfmTypography.Headline14Medium,
            color = colors.cardTextPrimary
        )

        // Горизонтальный скролл фотографий
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
        ) {
            // Пока одна фотография, но готово к расширению
            item {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = "Фото задачи",
                    modifier = Modifier
                        .width(153.dp)
                        .height(101.dp)
                        .clip(RoundedCornerShape(WfmRadius.XL))
                        .clickable { showFullscreenImage = true },
                    contentScale = ContentScale.Crop
                )
            }
        }
    }

    // Полноэкранный просмотр фотографии
    if (showFullscreenImage) {
        FullscreenImageDialog(
            imageUrl = imageUrl,
            onDismiss = { showFullscreenImage = false }
        )
    }
}

// MARK: - Fullscreen Image Dialog

@Composable
private fun FullscreenImageDialog(
    imageUrl: String,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(androidx.compose.ui.graphics.Color.Black)
                .clickable { onDismiss() }
        ) {
            // Изображение по центру
            AsyncImage(
                model = imageUrl,
                contentDescription = "Фото задачи",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )

            // Кнопка закрытия в правом верхнем углу
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(WfmSpacing.L)
            ) {
                Icon(
                    painter = painterResource(com.beyondviolet.wfm.ui.R.drawable.ic_close),
                    contentDescription = "Закрыть",
                    tint = androidx.compose.ui.graphics.Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }
        }
    }
}

// MARK: - Comment Section

@Composable
private fun CommentSection(
    task: Task,
    rejectionReason: TextFieldValue,
    isCommentError: Boolean,
    onReasonChange: (TextFieldValue) -> Unit,
    colors: WfmSemanticColors
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
    ) {
        Text(
            text = "Комментарий по задаче",
            style = WfmTypography.Headline14Bold,
            color = colors.cardTextPrimary
        )

        // Показываем комментарий работника если есть
        task.reportText?.takeIf { it.isNotEmpty() }?.let { reportText ->
            Text(
                text = reportText,
                style = WfmTypography.Body14Regular,
                color = colors.cardTextPrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = colors.cardSurfaceBase,
                        shape = RoundedCornerShape(WfmRadius.L)
                    )
                    .border(
                        width = 1.dp,
                        color = colors.borderSecondary,
                        shape = RoundedCornerShape(WfmRadius.L)
                    )
                    .padding(WfmSpacing.M)
            )
        }

        // Текстовое поле для причины отклонения
        WfmTextField(
            value = rejectionReason,
            onValueChange = onReasonChange,
            placeholder = "Оставьте комментарий",
            modifier = Modifier
                .fillMaxWidth()
                .height(116.dp),
            maxLines = 5,
            backgroundColor = colors.surfacePrimary,
            isError = isCommentError,
            errorMessage = if (isCommentError) "Укажите причину отклонения" else null
        )
    }
}

// MARK: - Actions Section

@Composable
private fun ActionsSection(
    isLoading: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    colors: WfmSemanticColors
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WfmSpacing.L),
        horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
    ) {
        // Кнопка "На доработку"
        WfmSecondaryButton(
            text = "На доработку",
            onClick = onReject,
            modifier = Modifier
                .weight(1f)
                .height(48.dp),
            enabled = !isLoading
        )

        // Кнопка "Принять"
        WfmPrimaryButton(
            text = "Принять",
            onClick = onApprove,
            modifier = Modifier
                .weight(1f)
                .height(48.dp),
            enabled = !isLoading,
            isLoading = isLoading
        )
    }
}

// MARK: - Helper Functions

/**
 * Вычисляет отклонение от плана в минутах
 */
private fun calculateDeviation(task: Task): Int? {
    val plannedMinutes = task.plannedMinutes ?: return null
    val durationSeconds = task.historyBrief?.duration ?: return null

    val factMinutes = durationSeconds / 60
    val deviation = factMinutes - plannedMinutes

    return if (deviation > 0) deviation else null
}


// MARK: - ViewModel

class TaskReviewViewModel(
    initialTask: Task,
    private val tasksService: TasksService,
    private val toastManager: ToastManager,
    private val analyticsService: AnalyticsService = NoOpAnalyticsService()
) : ViewModel() {

    data class UiState(
        val task: Task,
        val rejectionReason: TextFieldValue = TextFieldValue(""),
        val isLoading: Boolean = false,
        val errorMessage: String? = null,
        val isCommentError: Boolean = false
    )

    private val _uiState = MutableStateFlow(UiState(task = initialTask))
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun updateRejectionReason(reason: TextFieldValue) {
        _uiState.value = _uiState.value.copy(rejectionReason = reason, isCommentError = false)
    }

    /**
     * Определяет цвет badge по типу работы (детерминированный выбор)
     */
    fun getBadgeColor(): BadgeColor {
        val workType = _uiState.value.task.workType ?: return BadgeColor.PINK

        // Детерминированный выбор цвета на основе hash workType.id
        val colors = listOf(
            BadgeColor.VIOLET,
            BadgeColor.BLUE,
            BadgeColor.YELLOW,
            BadgeColor.PINK,
            BadgeColor.ORANGE,
            BadgeColor.GREEN
        )
        val index = abs(workType.id.hashCode()) % colors.size
        return colors[index]
    }

    /**
     * Подтверждает задачу
     */
    fun approveTask(onSuccess: (() -> Unit)? = null) {
        val taskId = _uiState.value.task.id ?: return
        analyticsService.track(AnalyticsEvent.TaskApprovedTapped)

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            when (val response = tasksService.approveTask(taskId)) {
                is ApiResponse.Success -> {
                    _uiState.value = _uiState.value.copy(
                        task = response.data,
                        isLoading = false
                    )

                    // Показываем Toast (успех)
                    toastManager.show(
                        message = "Задача принята",
                        state = WfmToastState.DEFAULT
                    )

                    // Вызываем callback успеха
                    onSuccess?.invoke()
                }
                is ApiResponse.Error -> {
                    val errorMessage = response.message ?: "Ошибка при подтверждении задачи"
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = errorMessage
                    )

                    // Показываем Toast (ошибка)
                    toastManager.show(
                        message = errorMessage,
                        state = WfmToastState.ERROR
                    )
                }
            }
        }
    }

    /**
     * Отклоняет задачу
     */
    fun rejectTask(onSuccess: (() -> Unit)? = null) {
        val taskId = _uiState.value.task.id ?: return
        val reason = _uiState.value.rejectionReason.text.trim()
        analyticsService.track(AnalyticsEvent.TaskRejectedTapped(hasComment = reason.isNotEmpty()))

        // Проверяем что введена причина отклонения
        if (reason.isEmpty()) {
            _uiState.value = _uiState.value.copy(isCommentError = true)
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            val request = RejectTaskRequest(reason = reason)
            when (val response = tasksService.rejectTask(taskId, request)) {
                is ApiResponse.Success -> {
                    _uiState.value = _uiState.value.copy(
                        task = response.data,
                        isLoading = false
                    )

                    // Показываем Toast (успех)
                    toastManager.show(
                        message = "Задача отклонена",
                        state = WfmToastState.DEFAULT
                    )

                    // Вызываем callback успеха
                    onSuccess?.invoke()
                }
                is ApiResponse.Error -> {
                    val errorMessage = response.message ?: "Ошибка при отклонении задачи"
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = errorMessage
                    )

                    // Показываем Toast (ошибка)
                    toastManager.show(
                        message = errorMessage,
                        state = WfmToastState.ERROR
                    )
                }
            }
        }
    }
}
