package com.beyondviolet.wfm.features.tasks.presentation.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.beyondviolet.wfm.core.models.isActive
import com.beyondviolet.wfm.features.tasks.presentation.ui.components.EmptyState
import com.beyondviolet.wfm.features.tasks.presentation.ui.components.ShiftInfoBlock
import com.beyondviolet.wfm.features.tasks.presentation.ui.components.TaskCardView
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TasksListUiState
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TasksListViewModel
import com.beyondviolet.wfm.features.tasks.presentation.ui.components.EmptyStateButton
import com.beyondviolet.wfm.ui.components.WfmLoader
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TasksListScreen(
    onTaskClick: (String) -> Unit,
    onOpenShift: () -> Unit,
    viewModel: TasksListViewModel,
    modifier: Modifier = Modifier,
    onNavigateToControl: (() -> Unit)? = null
) {
    val uiState by viewModel.uiState.collectAsState()
    val activeTask by viewModel.activeTask.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val hasOpenShift by viewModel.hasOpenShift.collectAsState()
    val currentAssignment by viewModel.userManager.currentAssignment.collectAsState()
    val colors = WfmTheme.colors
    val view = LocalView.current

    // Устанавливаем цвет status bar и восстанавливаем при уходе с экрана
    DisposableEffect(Unit) {
        val window = (view.context as? android.app.Activity)?.window
        val originalStatusBarColor = window?.statusBarColor
        val insetsController = window?.let { WindowCompat.getInsetsController(it, view) }
        val originalAppearanceLightStatusBars = insetsController?.isAppearanceLightStatusBars

        // Установить цвет для текущего экрана
        window?.let {
            insetsController?.isAppearanceLightStatusBars = true
            it.statusBarColor = colors.surfaceSecondary.toArgb()
        }

        onDispose {
            // Восстановить исходный цвет при уходе с экрана
            window?.let {
                originalStatusBarColor?.let { color -> it.statusBarColor = color }
                originalAppearanceLightStatusBars?.let { appearance ->
                    insetsController?.isAppearanceLightStatusBars = appearance
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        viewModel.loadTasks()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.surfaceBase)
    ) {
        // Заголовок с приветствием
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surfaceSecondary)
        ) {
            Text(
                text = "Список задач",
                style = WfmTypography.Headline20Bold,
                color = colors.textPrimary,
                modifier = Modifier.padding(16.dp)
            )
            HorizontalDivider(
                thickness = 1.dp,
                color = colors.borderSecondary
            )

            // Блок информации о смене (если смена открыта)
            val currentShift by viewModel.userManager.currentShift.collectAsState()
            currentShift?.let { shift ->
                if (shift.status?.isActive() == true) {
                    val tasks = (uiState as? TasksListUiState.Success)?.tasks ?: emptyList()
                    ShiftInfoBlock(
                        shift = shift,
                        tasks = tasks,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(colors.surfaceSecondary)
                    )
                }
            }
        }

        // Контент с Pull-to-Refresh
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize()
        ) {
            when (val state = uiState) {
                is TasksListUiState.Loading -> {
                    // Прокручиваемый контейнер обязателен для работы pull-to-refresh
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                        contentAlignment = Alignment.Center
                    ) {
                        WfmLoader()
                    }
                }

                is TasksListUiState.Success -> {
                    when {
                        // Empty state: нет открытой смены
                        !hasOpenShift -> {
                            val isManager = currentAssignment?.position?.role?.id == 2

                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isManager && onNavigateToControl != null) {
                                    // Заглушка для менеджера
                                    EmptyState(
                                        title = "Смена не открыта",
                                        description = "Задачи появятся, когда смена будет открыта. Сейчас доступна проверка сотрудников",
                                        buttons = listOf(
                                            EmptyStateButton(
                                                title = "Проверить сотрудников",
                                                style = EmptyStateButton.ButtonStyle.LINK,
                                                action = onNavigateToControl
                                            ),
                                            EmptyStateButton(
                                                title = "Открыть смену",
                                                style = EmptyStateButton.ButtonStyle.PRIMARY,
                                                action = onOpenShift
                                            )
                                        )
                                    )
                                } else {
                                    // Заглушка для работника
                                    EmptyState(
                                        title = "Список задач будет доступен после открытия смены",
                                        description = null,
                                        buttons = listOf(
                                            EmptyStateButton(
                                                title = "Открыть смену",
                                                style = EmptyStateButton.ButtonStyle.PRIMARY,
                                                action = onOpenShift
                                            )
                                        )
                                    )
                                }
                            }
                        }

                        // Empty state: пустой список при открытой смене
                        state.tasks.isEmpty() -> {
                            val isManager = currentAssignment?.position?.role?.id == 2

                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isManager && onNavigateToControl != null) {
                                    // Заглушка для менеджера
                                    EmptyState(
                                        title = "У вас нет задач",
                                        description = "Вы можете проверить задачи сотрудников",
                                        buttons = listOf(
                                            EmptyStateButton(
                                                title = "Проверить сотрудников",
                                                style = EmptyStateButton.ButtonStyle.SECONDARY,
                                                action = onNavigateToControl
                                            )
                                        )
                                    )
                                } else {
                                    // Заглушка для работника
                                    EmptyState(
                                        title = "У вас нет задач",
                                        description = "Обратитесь к руководителю для назначения задач",
                                        buttons = emptyList()
                                    )
                                }
                            }
                        }

                        // Список карточек задач
                        else -> {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(
                                    start = 16.dp,
                                    end = 16.dp,
                                    top = 12.dp,
                                    bottom = 16.dp
                                ),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(state.tasks, key = { it.safeId() }) { task ->
                                    TaskCardView(
                                        task = task,
                                        onDetail = { onTaskClick(task.safeId()) }
                                    )
                                }
                            }
                        }
                    }
                }

                is TasksListUiState.Error -> {
                    // Прокручиваемый контейнер обязателен для работы pull-to-refresh
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                        contentAlignment = Alignment.Center
                    ) {
                        EmptyState(
                            title = "Данные не загрузились",
                            description = "Попробуйте проверить соединение или обновить страницу",
                            buttons = listOf(
                                EmptyStateButton(
                                    title = "Обновить",
                                    style = EmptyStateButton.ButtonStyle.SECONDARY,
                                    action = { viewModel.refresh() }
                                )
                            )
                        )
                    }
                }
            }
        }
    }
}
