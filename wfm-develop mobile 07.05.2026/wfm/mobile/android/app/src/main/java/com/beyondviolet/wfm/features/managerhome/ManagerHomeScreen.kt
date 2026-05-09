package com.beyondviolet.wfm.features.managerhome

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.features.home.CloseShiftBottomSheet
import com.beyondviolet.wfm.features.home.components.ShiftCard
import com.beyondviolet.wfm.features.home.components.ShiftCardState
import com.beyondviolet.wfm.features.home.HomeViewModel
import com.beyondviolet.wfm.features.home.HomeUserRole
import com.beyondviolet.wfm.features.manager.presentation.ui.TaskReviewSheet
import com.beyondviolet.wfm.features.managerhome.components.ManagerTaskCardView
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.features.home.components.ProfileHeader
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.theme.WfmTheme
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject
import org.koin.core.parameter.parametersOf
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.utils.clickableDebounced

/**
 * Экран "Главная" для менеджера (только шапка с профилем и временем)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManagerHomeScreen(
    viewModel: HomeViewModel = koinViewModel { parametersOf(HomeUserRole.MANAGER) },
    tasksService: TasksService = koinInject(),
    toastManager: ToastManager = koinInject(),
    analyticsService: AnalyticsService = koinInject(),
    onShowAllTasks: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val tasksForReview by viewModel.tasksForReview.collectAsState()
    val currentShift by viewModel.currentShift.collectAsState()
    val shiftCardState by viewModel.shiftCardState.collectAsState()
    val positionName by viewModel.positionName.collectAsState()
    val storeName by viewModel.storeName.collectAsState()
    val shiftStatusText by viewModel.shiftStatusText.collectAsState()
    val isShiftLoading by viewModel.isShiftLoading.collectAsState()
    val closeShiftMessage by viewModel.closeShiftMessage.collectAsState()
    val closeShiftTitle by viewModel.closeShiftTitle.collectAsState()
    val closeShiftForce by viewModel.closeShiftForce.collectAsState()
    val shiftClosedSuccessfully by viewModel.shiftClosedSuccessfully.collectAsState()
    val colors = WfmTheme.colors

    // State для Bottom Sheets
    var showReviewSheet by remember { mutableStateOf(false) }
    var selectedTask by remember { mutableStateOf<Task?>(null) }
    var showCloseShiftSheet by remember { mutableStateOf(false) }

    // Fallback: если сервер вернул ошибку (локальные данные устарели) - показываем БШ
    LaunchedEffect(closeShiftTitle) {
        if (closeShiftTitle != null && !showCloseShiftSheet) {
            // Появилось сообщение после ошибки сервера - открываем БШ
            showCloseShiftSheet = true
        }
    }

    // Закрываем BottomSheet при успешном закрытии смены
    LaunchedEffect(shiftClosedSuccessfully) {
        if (shiftClosedSuccessfully) {
            showCloseShiftSheet = false
            viewModel.resetShiftClosedFlag()
        }
    }

    LaunchedEffect(Unit) {
        viewModel.onAppear()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.surfaceBase)
    ) {
        // Заголовок с профилем (фиксированный)
        ProfileHeader(
            greetingName = viewModel.getGreetingName(),
            formattedDate = viewModel.getFormattedDate(),
            photoUrl = viewModel.getPhotoUrl()
        )

        // Пустой прокручиваемый контент с Pull-to-Refresh
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val screenHeight = maxHeight

            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { viewModel.loadUser() },
                modifier = Modifier.fillMaxSize()
            ) {
                // Скроллируемый контейнер (нужен для работы pull gesture)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = screenHeight) // Минимальная высота для работы pull gesture
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Карточка смены
                    ShiftCard(
                        state = shiftCardState,
                        shift = currentShift,
                        positionName = positionName,
                        storeName = storeName,
                        statusText = shiftStatusText,
                        isShiftLoading = isShiftLoading,
                        onOpenShift = {
                            if (shiftCardState is ShiftCardState.InProgress) {
                                // Закрытие смены - подготавливаем данные БШ на основе локальных задач
                                viewModel.prepareCloseShiftBottomSheet()
                                showCloseShiftSheet = true
                            } else {
                                viewModel.openShift()
                            }
                        },
                        onTakeTask = { /* TODO: Navigate to tasks tab */ },
                        onRefresh = { viewModel.refreshData() }
                    )

                    // Секция "Задачи на проверку"
                    if (tasksForReview.isNotEmpty()) {
                        TasksToReviewSection(
                            tasks = tasksForReview,
                            onShowAllClick = onShowAllTasks,
                            onTaskClick = { task ->
                                selectedTask = task
                                showReviewSheet = true
                            }
                        )
                    }
                }
            }
        }
    }

    // Bottom Sheet для проверки задачи
    selectedTask?.let { task ->
        TaskReviewSheet(
            task = task,
            tasksService = tasksService,
            toastManager = toastManager,
            isVisible = showReviewSheet,
            analyticsService = analyticsService,
            onDismiss = {
                showReviewSheet = false
                selectedTask = null
                // Обновляем список задач после закрытия
                viewModel.loadUser()
            }
        )
    }

    // Bottom Sheet для закрытия смены
    CloseShiftBottomSheet(
        isVisible = showCloseShiftSheet,
        title = closeShiftTitle ?: "Закрыть смену?",
        message = closeShiftMessage,
        onDismiss = {
            showCloseShiftSheet = false
            viewModel.clearCloseShiftMessage()
        },
        onConfirm = {
            // Делаем запрос с правильным force флагом, БШ закроется автоматически при успехе
            viewModel.openShift(force = closeShiftForce)
        }
    )
}

/**
 * Секция "Задачи на проверку"
 */
@Composable
private fun TasksToReviewSection(
    tasks: List<Task>,
    onShowAllClick: () -> Unit,
    onTaskClick: (Task) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography
    val spacing = WfmTheme.spacing

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Заголовок секции
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = spacing.L),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Задачи на проверку",
                style = typography.Headline18Bold,
                color = colors.cardTextPrimary
            )

            // Кнопка "Все"
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickableDebounced(debounceTime = 500L, onClick = onShowAllClick)
                    .padding(horizontal = spacing.S, vertical = spacing.XXS),
                horizontalArrangement = Arrangement.spacedBy(spacing.XXXS),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Все",
                    style = typography.Body12Medium,
                    color = colors.buttonLinkTextDefault
                )

                Icon(
                    painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_chevron_right),
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = colors.textBrand
                )
            }
        }

        // Горизонтальный скролл с карточками
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val cardWidth = maxWidth - 62.dp

            LazyRow(
                contentPadding = PaddingValues(horizontal = spacing.L),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(
                    items = tasks,
                    key = { task -> task.id ?: "unknown-${tasks.indexOf(task)}" }
                ) { task ->
                    ManagerTaskCardView(
                        task = task,
                        onTap = { onTaskClick(task) },
                        modifier = Modifier.width(cardWidth)
                    )
                }
            }
        }
    }
}
