package com.beyondviolet.wfm.features.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.beyondviolet.wfm.features.home.components.ShiftCard
import com.beyondviolet.wfm.features.home.components.ShiftCardState
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmTheme
import org.koin.androidx.compose.koinViewModel
import com.beyondviolet.wfm.ui.theme.*

/**
 * Экран "Главная"
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = koinViewModel(),
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isShiftLoading by viewModel.isShiftLoading.collectAsState()
    val currentShift by viewModel.currentShift.collectAsState()
    val shiftCardState by viewModel.shiftCardState.collectAsState()
    val positionName by viewModel.positionName.collectAsState()
    val storeName by viewModel.storeName.collectAsState()
    val shiftStatusText by viewModel.shiftStatusText.collectAsState()
    val closeShiftMessage by viewModel.closeShiftMessage.collectAsState()
    val closeShiftTitle by viewModel.closeShiftTitle.collectAsState()
    val closeShiftForce by viewModel.closeShiftForce.collectAsState()
    val shiftClosedSuccessfully by viewModel.shiftClosedSuccessfully.collectAsState()
    val planTasks by viewModel.planTasks.collectAsState()
    val isPlanTasksLoading by viewModel.isPlanTasksLoading.collectAsState()
    val colors = WfmTheme.colors

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
        com.beyondviolet.wfm.features.home.components.ProfileHeader(
            greetingName = viewModel.getGreetingName(),
            formattedDate = viewModel.getFormattedDate(),
            photoUrl = viewModel.getPhotoUrl()
        )

        // Прокручиваемый контент с Pull-to-Refresh
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
                        .verticalScroll(rememberScrollState())
                ) {
                    when (uiState) {
                        is HomeViewModel.UiState.Loading -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(screenHeight),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                        is HomeViewModel.UiState.Success,
                        is HomeViewModel.UiState.Error -> {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = screenHeight)
                                    .padding(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                ShiftCard(
                                    state = shiftCardState,
                                    shift = currentShift,
                                    positionName = positionName,
                                    storeName = storeName,
                                    statusText = shiftStatusText,
                                    isShiftLoading = isShiftLoading,
                                    planTasks = planTasks,
                                    isPlanTasksLoading = isPlanTasksLoading,
                                    onOpenShift = {
                                        if (shiftCardState is ShiftCardState.InProgress) {
                                            // Закрытие смены - подготавливаем данные БШ на основе локальных задач
                                            viewModel.prepareCloseShiftBottomSheet()
                                            showCloseShiftSheet = true
                                        } else {
                                            viewModel.openShift()
                                        }
                                    },
                                    onTakeTask = { viewModel.takeNewTask() },
                                    onRefresh = {
                                        viewModel.refreshData() }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

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

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    WFMAppTheme {
        HomeScreen()
    }
}
