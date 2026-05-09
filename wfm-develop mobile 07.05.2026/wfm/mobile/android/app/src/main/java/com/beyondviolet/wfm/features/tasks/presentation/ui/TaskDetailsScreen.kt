package com.beyondviolet.wfm.features.tasks.presentation.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.AcceptancePolicy
import com.beyondviolet.wfm.core.models.Hint
import com.beyondviolet.wfm.core.models.Operation
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.models.TaskType
import com.beyondviolet.wfm.core.models.WorkType
import com.beyondviolet.wfm.core.models.Zone
import com.beyondviolet.wfm.core.models.Category
import com.beyondviolet.wfm.core.models.HistoryBrief
import com.beyondviolet.wfm.core.models.TaskReviewState
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TaskDetailsUiState
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TaskDetailsViewModel
import com.beyondviolet.wfm.ui.components.*
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick

/**
 * Экран деталей задачи
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailsScreen(
    taskId: String,
    viewModel: TaskDetailsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToTask: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val showCompleteConfirmation by viewModel.showCompleteConfirmation.collectAsState()
    val showActiveTaskConflict by viewModel.showActiveTaskConflict.collectAsState()
    val activeTaskId by viewModel.activeTaskId.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val colors = WfmTheme.colors

    val (backButtonEnabled, debouncedNavigateBack) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = onNavigateBack
    )

    Scaffold(
        containerColor = colors.surfaceBase,
        topBar = {
            TopAppBar(
                title = {
                    if (uiState is TaskDetailsUiState.Success) {
                        val task = (uiState as TaskDetailsUiState.Success).task
                        Text(
                            text = task.safeTitle(),
                            style = WfmTypography.Headline20Bold,
                            color = colors.textPrimary
                        )
                    } else {
                        Text("Задача")
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = debouncedNavigateBack,
                        enabled = backButtonEnabled
                    ) {
                        Icon(
                            painter = painterResource(com.beyondviolet.wfm.ui.R.drawable.ic_back),
                            contentDescription = "Назад",
                            tint = colors.textPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colors.surfaceSecondary
                ),
                modifier = Modifier.padding(bottom = 1.dp)
            )
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is TaskDetailsUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            is TaskDetailsUiState.Processing -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            is TaskDetailsUiState.Success -> {
                TaskDetailsContent(
                    task = state.task,
                    viewModel = viewModel,
                    isRefreshing = isRefreshing,
                    onNavigateBack = onNavigateBack,
                    modifier = Modifier.padding(paddingValues)
                )
            }

            is TaskDetailsUiState.Error -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(WfmSpacing.XL),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Ошибка: ${state.message}",
                        color = colors.textPrimary,
                        style = WfmTypography.Body14Regular
                    )
                    Spacer(modifier = Modifier.height(WfmSpacing.XL))
                    WfmPrimaryButton(
                        text = "Повторить",
                        onClick = { viewModel.refresh() }
                    )
                }
            }
        }

        // Bottom Sheet для подтверждения завершения
        WfmBottomSheet(
            isVisible = showCompleteConfirmation,
            onDismiss = { viewModel.cancelComplete() },
            showOverlay = true
        ) {
            val task = (uiState as? TaskDetailsUiState.Success)?.task
            CompleteConfirmationSheet(
                requiresPhoto = task?.requiresPhoto == true,
                toastManager = viewModel.getToastManager(),
                coroutineScope = viewModel.getViewModelScope(),
                onConfirm = { imageUri ->
                    val success = if (imageUri != null) {
                        viewModel.completeTaskWithPhoto(imageUri)
                    } else {
                        viewModel.completeTask()
                    }

                    if (success) {
                        if ((uiState as? TaskDetailsUiState.Success)?.task?.state == TaskState.COMPLETED) {
                            onNavigateBack()
                        }
                    }

                    success
                },
                onCancel = { viewModel.cancelComplete() }
            )
        }

        ActiveTaskConflictBottomSheet(
            isVisible = showActiveTaskConflict,
            activeTaskId = activeTaskId,
            onNavigateToTask = onNavigateToTask,
            onDismiss = { viewModel.dismissActiveTaskConflict() }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskDetailsContent(
    task: Task,
    viewModel: TaskDetailsViewModel,
    isRefreshing: Boolean,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val operations = task.operations ?: emptyList()
    val selectedOperationIds by viewModel.selectedOperationIds.collectAsState()
    val newOperations by viewModel.newOperations.collectAsState()
    val hints by viewModel.hints.collectAsState()
    val isLoadingHints by viewModel.isLoadingHints.collectAsState()
    val allowNewOperations = task.workType?.allowNewOperations == true

    var selectedTab by remember { mutableIntStateOf(0) }
    var showSelectOperationsSheet by remember { mutableStateOf(false) }
    var showCreateOperationsSheet by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Автообновление прогресса каждую секунду только для IN_PROGRESS
    var timerTick by remember { mutableIntStateOf(0) }
    LaunchedEffect(task.state) {
        if (task.state == TaskState.IN_PROGRESS) {
            while (true) {
                kotlinx.coroutines.delay(1000)
                timerTick++
            }
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        // Task Info Section (white background, fixed at top)
        TaskInfoSection(
            task = task,
            viewModel = viewModel,
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surfaceSecondary)
                .padding(WfmSpacing.L)
        )

        // Tab Bar
        WfmTabBar(
            selectedIndex = selectedTab,
            options = listOf("Подзадачи", "Подсказки"),
            onSelectionChange = { newTab ->
                if (newTab == 1 && selectedTab != 1) viewModel.trackHintsTabViewed()
                selectedTab = newTab
            },
            modifier = Modifier.background(colors.surfaceSecondary)
        )

        // Scrollable content + Actions
        Box(modifier = Modifier.fillMaxSize()) {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                ) {
                    // Info / review comment cards (вне табов)
                    InfoCardsSection(
                        task = task,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(colors.surfaceBase)
                            .padding(top = WfmSpacing.L)
                            .padding(horizontal = WfmSpacing.L)
                    )

                    // Tab content
                    when (selectedTab) {
                        0 -> SubtasksContent(
                            operations = operations,
                            selectedOperationIds = selectedOperationIds,
                            newOperations = newOperations,
                            allowNewOperations = allowNewOperations,
                            onToggle = { viewModel.toggleOperation(it) },
                            onRemoveNewOperation = { viewModel.removeNewOperation(it) },
                            onAddNewOperation = {
                                viewModel.trackSubtaskSelectSheetOpened("manual")
                                showSelectOperationsSheet = true
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(colors.surfaceBase)
                                .padding(top = WfmSpacing.L)
                                .padding(horizontal = WfmSpacing.L)
                        )
                        1 -> HintsContent(
                            hints = hints,
                            isLoading = isLoadingHints,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(colors.surfaceBase)
                                .padding(top = WfmSpacing.L)
                                .padding(horizontal = WfmSpacing.L)
                        )
                    }

                    // Spacer для Actions Section
                    if (task.safeState() != TaskState.COMPLETED || task.isRejected()) {
                        Spacer(modifier = Modifier.height(100.dp))
                    }
                }
            }

            // Actions Section (fixed at bottom)
            if (task.safeState() != TaskState.COMPLETED || task.isRejected()) {
                ActionsSection(
                    task = task,
                    onStartTask = { viewModel.startTask() },
                    onPauseTask = { viewModel.pauseTask() },
                    onResumeTask = { viewModel.resumeTask() },
                    onRequestComplete = {
                        if (allowNewOperations && selectedOperationIds.isEmpty() && newOperations.isEmpty()) {
                            viewModel.trackSubtaskSelectSheetOpened("auto")
                            showSelectOperationsSheet = true
                        } else {
                            viewModel.requestCompleteConfirmation()
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(colors.surfaceSecondary)
                        .padding(WfmSpacing.L)
                )
            }
        }
    }

    SelectOperationsBottomSheet(
        isVisible = showSelectOperationsSheet,
        operations = operations,
        initiallySelected = selectedOperationIds,
        onConfirm = { newSelection ->
            viewModel.setSelectedOperationIds(newSelection)
            showSelectOperationsSheet = false
        },
        onCreateNew = {
            viewModel.trackSubtaskCreateSheetOpened()
            showSelectOperationsSheet = false
            scope.launch { delay(300); showCreateOperationsSheet = true }
        },
        onDismiss = { showSelectOperationsSheet = false },
        onSearchUsed = { viewModel.trackSubtaskSearchUsed() }
    )

    CreateOperationBottomSheet(
        isVisible = showCreateOperationsSheet,
        onConfirm = { name ->
            viewModel.trackSubtaskCreated()
            viewModel.addNewOperation(name)
            showCreateOperationsSheet = false
        },
        onDismiss = { showCreateOperationsSheet = false }
    )
}

@Composable
private fun TaskInfoSection(
    task: Task,
    viewModel: TaskDetailsViewModel,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.L)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
        ) {
            task.zone?.let { zone ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXS),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Зона:", style = WfmTypography.Body14Medium, color = colors.textTertiary)
                    Text(text = zone.name, style = WfmTypography.Body14Medium, color = colors.textPrimary)
                }
            }

            task.category?.let { category ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXS),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Категория:", style = WfmTypography.Body14Medium, color = colors.textTertiary)
                    Text(text = category.name, style = WfmTypography.Body14Medium, color = colors.textPrimary)
                }
            }
        }

        if (task.safeState() == TaskState.COMPLETED) {
            if (task.reviewState == TaskReviewState.ON_REVIEW) {
                Text(
                    text = "Задача отправлена на проверку",
                    style = WfmTypography.Body14Medium,
                    color = colors.textPrimary,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                Text(
                    text = "Задача завершена",
                    style = WfmTypography.Body14Medium,
                    color = colors.textSecondary,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
                ) {
                    Text(text = "Период", style = WfmTypography.Body14Medium, color = colors.textTertiary)

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXXS),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.ic_time),
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = colors.textSecondary
                        )

                        Text(
                            text = when (task.safeState()) {
                                TaskState.NEW -> "${task.safePlannedMinutes()} минут"
                                TaskState.IN_PROGRESS, TaskState.PAUSED -> {
                                    "Осталось ${viewModel.calculateRemainingMinutes(task)} минут"
                                }
                                else -> "0 минут"
                            },
                            style = WfmTypography.Body14Medium,
                            color = colors.textSecondary
                        )
                    }
                }

                WfmProgressBar(
                    progress = viewModel.calculateProgress(task),
                    type = WfmProgressType.SOLID,
                    state = if (task.safeState() == TaskState.PAUSED) WfmProgressState.PAUSED else WfmProgressState.NORMAL,
                    showText = false
                )
            }
        }
    }
}

@Composable
private fun InfoCardsSection(
    task: Task,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val hasCards = task.comment != null || task.safeReviewComment() != null
    if (!hasCards) return

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
    ) {
        task.comment?.let { comment ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(color = colors.cardSurfaceInfo, shape = RoundedCornerShape(WfmRadius.XL))
                    .padding(horizontal = 12.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_info_fill),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = Color.Unspecified
                )
                Text(text = comment, style = WfmTypography.Body14Regular, color = colors.cardTextPrimary, modifier = Modifier.weight(1f))
            }
        }

        task.safeReviewComment()?.let { reviewComment ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(color = colors.cardSurfaceError, shape = RoundedCornerShape(WfmRadius.XL))
                    .padding(horizontal = 12.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_info_error),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = Color.Unspecified
                )
                Text(text = reviewComment, style = WfmTypography.Body14Regular, color = colors.cardTextPrimary, modifier = Modifier.weight(1f))
            }
        }
    }
}

// MARK: - SubtasksContent

@Composable
private fun SubtasksContent(
    operations: List<Operation>,
    selectedOperationIds: Set<Int>,
    newOperations: List<String>,
    allowNewOperations: Boolean,
    onToggle: (Int) -> Unit,
    onRemoveNewOperation: (Int) -> Unit,
    onAddNewOperation: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
    ) {
        if (allowNewOperations) {
            // Режим allowNewOperations: только выбранные + пользовательские + кнопка добавления
            val selectedOps = operations.filter { selectedOperationIds.contains(it.id) }

            selectedOps.forEach { operation ->
                WfmSelectionCard(
                    title = operation.name,
                    type = WfmSelectionCardType.SELECT,
                    isChecked = true,
                    onTap = { onToggle(operation.id) }
                )
            }

            newOperations.forEachIndexed { index, name ->
                WfmSelectionCard(
                    title = name,
                    type = WfmSelectionCardType.SELECT,
                    isChecked = true,
                    onTap = { onRemoveNewOperation(index) }
                )
            }

            AddOperationButton(onClick = onAddNewOperation)
        } else {
            // Обычный режим: весь список операций с чекбоксами
            if (operations.isEmpty()) {
                Text(
                    text = "Операции не указаны",
                    style = WfmTypography.Body14Regular,
                    color = WfmTheme.colors.textTertiary
                )
            } else {
                operations.forEach { operation ->
                    WfmSelectionCard(
                        title = operation.name,
                        type = WfmSelectionCardType.SELECT,
                        isChecked = selectedOperationIds.contains(operation.id),
                        onTap = { onToggle(operation.id) }
                    )
                }
            }
        }
    }
}

// MARK: - AddOperationButton

@Composable
private fun AddOperationButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val dashColor = WfmColors.Brand200

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.surfaceSecondary, RoundedCornerShape(16.dp))
            .drawBehind {
                val strokeWidth = 1.dp.toPx()
                val dashLength = 6.dp.toPx()
                val gapLength = 4.dp.toPx()
                val cornerRadius = 16.dp.toPx()
                val paint = androidx.compose.ui.graphics.Paint().apply {
                    this.color = dashColor
                    this.style = androidx.compose.ui.graphics.PaintingStyle.Stroke
                    asFrameworkPaint().apply {
                        this.strokeWidth = strokeWidth
                        pathEffect = android.graphics.DashPathEffect(
                            floatArrayOf(dashLength, gapLength), 0f
                        )
                    }
                }
                drawContext.canvas.drawRoundRect(
                    left = strokeWidth / 2,
                    top = strokeWidth / 2,
                    right = size.width - strokeWidth / 2,
                    bottom = size.height - strokeWidth / 2,
                    radiusX = cornerRadius,
                    radiusY = cornerRadius,
                    paint = paint
                )
            }
            .clickable(onClick = onClick)
            .padding(WfmSpacing.M)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Добавить подзадачу",
                style = WfmTypography.Headline14Medium,
                color = colors.textBrand
            )
            Icon(
                painter = painterResource(id = R.drawable.ic_plus),
                contentDescription = null,
                tint = colors.iconBrand,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

// MARK: - HintsContent

@Composable
private fun HintsContent(
    hints: List<Hint>,
    isLoading: Boolean,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        // Заголовок "Советы от ИИ"
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_ai_help),
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = Color.Unspecified
            )
            Text(
                text = "Советы от ИИ",
                style = WfmTypography.Body14Bold,
                color = colors.textPrimary
            )
        }

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = WfmSpacing.XL),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (hints.isEmpty()) {
            Text(
                text = "Подсказок пока нет",
                style = WfmTypography.Body14Regular,
                color = colors.textTertiary
            )
        } else {
            hints.forEach { hint ->
                HintCard(text = hint.text)
            }
        }
    }
}

@Composable
private fun HintCard(
    text: String,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    Text(
        text = text,
        style = WfmTypography.Body14Regular,
        color = colors.textPrimary,
        modifier = modifier
            .fillMaxWidth()
            .background(color = colors.surfaceSecondary, shape = RoundedCornerShape(WfmRadius.XL))
            .border(width = 1.dp, color = colors.cardBorderSecondary, shape = RoundedCornerShape(WfmRadius.XL))
            .padding(12.dp)
    )
}

@Composable
private fun ActionsSection(
    task: Task,
    onStartTask: () -> Unit,
    onPauseTask: () -> Unit,
    onResumeTask: () -> Unit,
    onRequestComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        when (task.safeState()) {
            TaskState.NEW -> {
                WfmPrimaryButton(
                    text = "Начать",
                    onClick = onStartTask,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            TaskState.IN_PROGRESS -> {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    WfmSecondaryButton(
                        text = "На паузу",
                        onClick = onPauseTask,
                        size = WfmButtonSize.Medium,
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                        icon = R.drawable.ic_pause
                    )
                    WfmPrimaryButton(
                        text = "Завершить",
                        onClick = onRequestComplete,
                        modifier = Modifier.weight(1f).fillMaxHeight()
                    )
                }
            }

            TaskState.PAUSED -> {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(IntrinsicSize.Min),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    WfmSecondaryButton(
                        text = "Продолжить",
                        onClick = onResumeTask,
                        size = WfmButtonSize.Medium,
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                        icon = R.drawable.ic_play
                    )
                    WfmPrimaryButton(
                        text = "Завершить",
                        onClick = onRequestComplete,
                        modifier = Modifier.weight(1f).fillMaxHeight()
                    )
                }
            }

            TaskState.COMPLETED -> {}
        }
    }
}

// MARK: - Preview Helpers

private fun createSampleTask(
    state: TaskState,
    withRejection: Boolean = false,
    withComment: Boolean = true
): Task {
    val now = Clock.System.now()
    return Task(
        id = "sample-task-123",
        title = "Выкладка товара",
        description = "Выложить товар в торговом зале согласно планограмме.",
        type = TaskType.PLANNED,
        plannedMinutes = 120,
        creatorId = 123,
        assigneeId = 456,
        state = state,
        comment = if (withComment) "Обрати внимание выкладку товара согласно планограмме" else null,
        reportText = null,
        createdAt = now,
        updatedAt = now,
        reviewComment = if (withRejection) "Неправильная выкладка товара" else null,
        reviewState = if (withRejection) TaskReviewState.REJECTED else null,
        acceptancePolicy = AcceptancePolicy.MANUAL,
        externalId = 12345,
        shiftId = 789,
        priority = 1,
        workTypeId = 1,
        workType = WorkType(id = 1, name = "Мерчендайзинг"),
        zoneId = 1,
        zone = Zone(id = 1, name = "Торговый зал", priority = 1),
        categoryId = 1,
        category = Category(id = 1, name = "Молочные продукты"),
        timeStart = "09:00:00",
        timeEnd = "11:00:00",
        source = "LAMA",
        historyBrief = if (state != TaskState.NEW) {
            HistoryBrief(duration = 1800, timeStart = now, timeStateUpdated = now)
        } else null
    )
}

@Preview(name = "Hint Card", showBackground = true)
@Composable
private fun HintCardPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            HintCard(
                text = "Убедитесь, что новые ценники соответствуют текущим акциям и скидкам.",
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Subtasks Content", showBackground = true)
@Composable
private fun SubtasksContentPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            SubtasksContent(
                operations = listOf(
                    Operation(id = 1, name = "Обновление ценников (проверка сканером)"),
                    Operation(id = 2, name = "Проверка сроков годности"),
                ),
                selectedOperationIds = setOf(1, 2),
                newOperations = listOf("Вывоз товара со склада"),
                allowNewOperations = true,
                onToggle = {},
                onRemoveNewOperation = {},
                onAddNewOperation = {},
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Preview(name = "Hints Content", showBackground = true)
@Composable
private fun HintsContentPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            HintsContent(
                hints = listOf(
                    Hint(id = 1, text = "Убедитесь, что новые ценники соответствуют текущим акциям и скидкам."),
                    Hint(id = 2, text = "Проверьте правильность указанных цен и сроков действия."),
                ),
                isLoading = false,
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}
