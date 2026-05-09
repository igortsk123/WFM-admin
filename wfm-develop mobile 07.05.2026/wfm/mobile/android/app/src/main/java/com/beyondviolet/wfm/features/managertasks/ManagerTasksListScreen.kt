package com.beyondviolet.wfm.features.managertasks

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.*
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.features.manager.presentation.ui.TaskReviewSheet
import com.beyondviolet.wfm.features.managerhome.components.ManagerTaskCardView
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmLinkButton
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.components.WfmSegmentedControl
import com.beyondviolet.wfm.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick

/**
 * Экран "Контроль задач" для менеджера
 * Дизайн: Figma node-id=3601:12843
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManagerTasksListScreen(
    viewModel: ManagerTasksListViewModel = koinViewModel(),
    onNavigateToTasksTab: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val selectedSegmentIndex by viewModel.selectedSegmentIndex.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val showFilters by viewModel.showFilters.collectAsState()
    val filterGroups by viewModel.filterGroups.collectAsState()
    val taskFilterIndices by viewModel.taskFilterIndices.collectAsState()
    val colors = WfmTheme.colors
    val view = LocalView.current

    // Локальное состояние фильтров для BottomSheet (синхронизируется при открытии)
    var localFilterGroups by remember(showFilters) { mutableStateOf(filterGroups) }

    // State для TaskReviewSheet
    var showReviewSheet by remember { mutableStateOf(false) }
    var selectedTask by remember { mutableStateOf<Task?>(null) }

    // Зависимости для TaskReviewSheet
    val tasksService: TasksService = koinInject()
    val toastManager: ToastManager = koinInject()
    val analyticsService: AnalyticsService = koinInject()
    val coroutineScope = rememberCoroutineScope()

    // Устанавливаем цвет status bar и восстанавливаем при уходе с экрана
    DisposableEffect(Unit) {
        val window = (view.context as? android.app.Activity)?.window
        val originalStatusBarColor = window?.statusBarColor
        val insetsController = window?.let { WindowCompat.getInsetsController(it, view) }
        val originalAppearanceLightStatusBars = insetsController?.isAppearanceLightStatusBars

        window?.let {
            insetsController?.isAppearanceLightStatusBars = true
            it.statusBarColor = colors.surfaceSecondary.toArgb()
        }

        onDispose {
            window?.let {
                originalStatusBarColor?.let { color -> it.statusBarColor = color }
                originalAppearanceLightStatusBars?.let { appearance ->
                    insetsController?.isAppearanceLightStatusBars = appearance
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        viewModel.onAppear()
    }

    // Debounce для кнопки фильтра
    val (filterButtonEnabled, debouncedOpenFilters) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = { viewModel.openFilters() }
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.surfaceBase)
    ) {
        // Кастомная шапка
        CustomHeader(
            hasActiveFilters = viewModel.hasActiveFilters(),
            filterButtonEnabled = filterButtonEnabled,
            onFilterClick = debouncedOpenFilters
        )

        // Основной контент с Pull-to-Refresh
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .navigationBarsPadding()
                    .padding(WfmSpacing.L)
            ) {
                // Segmented Control
                WfmSegmentedControl(
                    selectedIndex = selectedSegmentIndex,
                    options = listOf("Проверить", "Принятые"),
                    onSelectionChange = { viewModel.onSegmentChanged(it) },
                    modifier = Modifier.fillMaxWidth(),
                    height = 40.dp
                )

                Spacer(modifier = Modifier.height(WfmSpacing.S))

                // Список карточек задач
                if (tasks.isNotEmpty()) {
                    tasks.forEach { task ->
                        ManagerTaskCardView(
                            task = task,
                            onTap = {
                                selectedTask = task
                                showReviewSheet = true
                            }
                        )
                        Spacer(modifier = Modifier.height(WfmSpacing.S))
                    }
                } else {
                    val errorMessage by viewModel.errorMessage.collectAsState()

                    if (errorMessage != null) {
                        ErrorState(
                            onRetry = { viewModel.refresh() }
                        )
                    } else {
                        EmptyState(
                            selectedSegmentIndex = selectedSegmentIndex,
                            hasActiveFilters = viewModel.hasActiveFilters(),
                            onResetFilters = {
                                val resetFilterGroups = viewModel.filterGroups.value.map { group ->
                                    group.copy(items = group.items.map { it.copy(isSelected = false) })
                                }
                                viewModel.applyFilters(resetFilterGroups)
                            },
                            onNavigateToTasksTab = onNavigateToTasksTab,
                            onSwitchToReviewTab = {
                                viewModel.onSegmentChanged(0)
                            }
                        )
                    }
                }

                // Дополнительный отступ снизу для таб бара
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }

    // TaskReviewSheet для проверки задачи
    selectedTask?.let { task ->
        TaskReviewSheet(
            task = task,
            tasksService = tasksService,
            toastManager = toastManager,
            isVisible = showReviewSheet,
            analyticsService = analyticsService,
            onSuccess = {
                coroutineScope.launch {
                    viewModel.loadTasksSuspend()
                }
            },
            onDismiss = {
                showReviewSheet = false
                selectedTask = null
            }
        )
    }

    // BottomSheet фильтров задач
    WfmBottomSheet(
        isVisible = showFilters,
        onDismiss = { viewModel.closeFilters() },
        showOverlay = true
    ) {
        TaskFiltersBottomSheetContent(
            filterGroups = localFilterGroups,
            taskFilterIndices = taskFilterIndices,
            onFilterGroupsChange = { localFilterGroups = it },
            onApply = { groups -> viewModel.applyFilters(groups) },
            onDismiss = { viewModel.closeFilters() }
        )
    }
}

/**
 * Кастомная шапка с кнопкой фильтра
 */
@Composable
private fun CustomHeader(
    hasActiveFilters: Boolean,
    filterButtonEnabled: Boolean,
    onFilterClick: () -> Unit
) {
    val colors = WfmTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surfaceSecondary)
            .padding(WfmSpacing.L),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Контроль задач",
            style = WfmTypography.Headline20Bold,
            color = colors.textPrimary,
            modifier = Modifier.weight(1f)
        )

        // Кнопка фильтра с индикатором
        Box {
            IconButton(
                onClick = onFilterClick,
                enabled = filterButtonEnabled,
                modifier = Modifier
                    .size(40.dp)
                    .border(
                        width = 1.dp,
                        color = colors.cardBorderSecondary,
                        shape = RoundedCornerShape(WfmRadius.L)
                    )
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_filter),
                    contentDescription = "Фильтр",
                    modifier = Modifier.size(20.dp),
                    tint = colors.iconPrimary
                )
            }

            // Индикатор активных фильтров
            if (hasActiveFilters) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = (-4).dp, y = 4.dp)
                        .size(8.dp)
                        .background(colors.badgeBrandBgBright, CircleShape)
                )
            }
        }
    }
}

/**
 * Пустое состояние
 */
@Composable
private fun EmptyState(
    selectedSegmentIndex: Int,
    hasActiveFilters: Boolean,
    onResetFilters: () -> Unit,
    onNavigateToTasksTab: () -> Unit,
    onSwitchToReviewTab: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 100.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Featured Icon (56x56) с иконкой info
        Image(
            painter = painterResource(id = R.drawable.ic_featured_info),
            contentDescription = null,
            modifier = Modifier.size(56.dp)
        )

        Spacer(modifier = Modifier.height(WfmSpacing.S))

        if (hasActiveFilters) {
            EmptyStateWithFilters(
                selectedSegmentIndex = selectedSegmentIndex,
                onResetFilters = onResetFilters
            )
        } else {
            EmptyStateNoFilters(
                selectedSegmentIndex = selectedSegmentIndex,
                onNavigateToTasksTab = onNavigateToTasksTab,
                onSwitchToReviewTab = onSwitchToReviewTab
            )
        }
    }
}

/**
 * Пустое состояние с активными фильтрами
 */
@Composable
private fun EmptyStateWithFilters(
    selectedSegmentIndex: Int,
    onResetFilters: () -> Unit
) {
    val colors = WfmTheme.colors

    val titleText = if (selectedSegmentIndex == 0) {
        "Нет задач на проверку"
    } else {
        "Нет принятых задач"
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = titleText,
            style = WfmTypography.Headline16Bold,
            color = colors.textPrimary
        )

        Spacer(modifier = Modifier.height(WfmSpacing.XS))

        Text(
            text = "Чтобы посмотреть больше задач,\nпопробуйте очистить фильтры",
            style = WfmTypography.Body14Regular,
            color = colors.textTertiary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = WfmSpacing.XL)
        )

        Spacer(modifier = Modifier.height(WfmSpacing.L))

        WfmSecondaryButton(
            text = "Сбросить фильтры",
            onClick = onResetFilters,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WfmSpacing.XL)
        )
    }
}

/**
 * Пустое состояние без фильтров
 */
@Composable
private fun EmptyStateNoFilters(
    selectedSegmentIndex: Int,
    onNavigateToTasksTab: () -> Unit,
    onSwitchToReviewTab: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (selectedSegmentIndex == 0) {
            Text(
                text = "Нет задач на проверку",
                style = WfmTypography.Headline18Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(WfmSpacing.S))

            Text(
                text = "Пока нет задач на проверку, вы можете делать свои задачи",
                style = WfmTypography.Body16Regular,
                color = colors.cardTextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = WfmSpacing.L)
            )

            Spacer(modifier = Modifier.height(WfmSpacing.L))

            WfmSecondaryButton(
                text = "К своим задачам",
                onClick = onNavigateToTasksTab,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.XXXL)
            )
        } else {
            Text(
                text = "Нет принятых задач",
                style = WfmTypography.Headline18Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(WfmSpacing.S))

            Text(
                text = "Проверьте задачи или выполните свои",
                style = WfmTypography.Body16Regular,
                color = colors.cardTextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = WfmSpacing.L)
            )

            Spacer(modifier = Modifier.height(WfmSpacing.L))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.XXXL),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
            ) {
                WfmLinkButton(
                    text = "Проверить",
                    onClick = onSwitchToReviewTab,
                    modifier = Modifier.fillMaxWidth()
                )

                WfmSecondaryButton(
                    text = "К своим задачам",
                    onClick = onNavigateToTasksTab,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

/**
 * Экран ошибки загрузки данных
 */
@Composable
private fun ErrorState(
    onRetry: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 100.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(
            painter = painterResource(id = R.drawable.ic_featured_info),
            contentDescription = null,
            modifier = Modifier.size(56.dp)
        )

        Spacer(modifier = Modifier.height(WfmSpacing.S))

        Text(
            text = "Данные не загрузились",
            style = WfmTypography.Headline18Bold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(WfmSpacing.S))

        Text(
            text = "Попробуйте проверить соединение или обновить страницу",
            style = WfmTypography.Body16Regular,
            color = colors.cardTextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = WfmSpacing.L)
        )

        Spacer(modifier = Modifier.height(WfmSpacing.L))

        WfmSecondaryButton(
            text = "Обновить",
            onClick = onRetry,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WfmSpacing.XXXL)
        )
    }
}

// MARK: - Preview Helpers

private fun createPreviewTask(
    id: String = "preview-task-1",
    workTypeId: Int = 4,
    workTypeName: String = "Другие работы",
    assigneeId: Int = 123,
    assignee: AssigneeBrief? = AssigneeBrief(
        id = 123,
        firstName = "Анна",
        lastName = "Елисеева",
        middleName = "Михайловна"
    ),
    state: TaskState = TaskState.COMPLETED
): Task {
    val now = kotlinx.datetime.Clock.System.now()
    return Task(
        id = id,
        title = null,
        description = "Уборка в отделе ФРОВ",
        plannedMinutes = 30,
        assigneeId = assigneeId,
        assignee = assignee,
        state = state,
        createdAt = now,
        updatedAt = now,
        workTypeId = workTypeId,
        workType = WorkType(id = workTypeId, name = workTypeName),
        zoneId = 1,
        zone = Zone(id = 1, name = "ФРОВ", priority = 1),
        categoryId = 1,
        category = Category(id = 1, name = "Уборка"),
        timeStart = "08:30:00",
        timeEnd = "09:00:00",
        reviewState = TaskReviewState.ON_REVIEW
    )
}

// MARK: - Previews

@Preview(name = "Custom Header", showBackground = true)
@Composable
private fun CustomHeaderPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceSecondary) {
            CustomHeader(
                hasActiveFilters = true,
                filterButtonEnabled = true,
                onFilterClick = {}
            )
        }
    }
}

@Preview(name = "Empty State - Review Tab (No Filters)", showBackground = true)
@Composable
private fun EmptyStateReviewTabNoFiltersPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            EmptyState(
                selectedSegmentIndex = 0,
                hasActiveFilters = false,
                onResetFilters = {},
                onNavigateToTasksTab = {},
                onSwitchToReviewTab = {}
            )
        }
    }
}

@Preview(name = "Empty State - Accepted Tab (No Filters)", showBackground = true)
@Composable
private fun EmptyStateAcceptedTabNoFiltersPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            EmptyState(
                selectedSegmentIndex = 1,
                hasActiveFilters = false,
                onResetFilters = {},
                onNavigateToTasksTab = {},
                onSwitchToReviewTab = {}
            )
        }
    }
}

@Preview(name = "Empty State - With Active Filters", showBackground = true)
@Composable
private fun EmptyStateWithFiltersPreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            EmptyState(
                selectedSegmentIndex = 0,
                hasActiveFilters = true,
                onResetFilters = {},
                onNavigateToTasksTab = {},
                onSwitchToReviewTab = {}
            )
        }
    }
}

@Preview(name = "Error State", showBackground = true)
@Composable
private fun ErrorStatePreview() {
    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            ErrorState(
                onRetry = {}
            )
        }
    }
}

@Preview(name = "Tasks List Content", showBackground = true)
@Composable
private fun TasksListContentPreview() {
    val tasks = listOf(
        createPreviewTask(
            id = "1",
            workTypeId = 4,
            workTypeName = "Другие работы",
            state = TaskState.COMPLETED
        ),
        createPreviewTask(
            id = "2",
            workTypeId = 3,
            workTypeName = "Смена ценников",
            assigneeId = 456,
            assignee = AssigneeBrief(
                id = 456,
                firstName = "Иван",
                lastName = "Петров",
                middleName = null
            ),
            state = TaskState.COMPLETED
        ).copy(
            description = "Молочные продукты",
            plannedMinutes = 60,
            zone = Zone(id = 2, name = "Молочка", priority = 2),
            timeStart = "11:00:00",
            timeEnd = "12:00:00"
        )
    )

    WfmTheme {
        Surface(color = WfmTheme.colors.surfaceBase) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(WfmSpacing.L),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
            ) {
                WfmSegmentedControl(
                    selectedIndex = 0,
                    options = listOf("Проверить", "Принятые"),
                    onSelectionChange = {},
                    modifier = Modifier.fillMaxWidth(),
                    height = 40.dp
                )

                tasks.forEach { task ->
                    ManagerTaskCardView(
                        task = task,
                        onTap = {}
                    )
                }
            }
        }
    }
}
