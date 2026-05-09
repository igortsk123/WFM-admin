package com.beyondviolet.wfm.features.main

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.beyondviolet.wfm.features.managerhome.ManagerHomeScreen
import com.beyondviolet.wfm.features.home.HomeViewModel
import com.beyondviolet.wfm.features.home.HomeUserRole
import com.beyondviolet.wfm.features.managertasks.ManagerTasksListScreen
import com.beyondviolet.wfm.features.managertasks.ManagerTasksListViewModel
import com.beyondviolet.wfm.feature.auth.presentation.ui.SupportScreen
import com.beyondviolet.wfm.features.settings.DeleteAccountScreen
import com.beyondviolet.wfm.features.settings.SettingsScreen
import com.beyondviolet.wfm.features.settings.SettingsViewModel
import com.beyondviolet.wfm.features.tasks.presentation.ui.TasksListScreen
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TasksListViewModel
import com.beyondviolet.wfm.navigation.MainTab
import com.beyondviolet.wfm.ui.theme.WfmTheme
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import com.beyondviolet.wfm.ui.theme.*

/**
 * Главный экран с нижней навигацией для менеджера (Tab Bar)
 *
 * Табы:
 * 1. Главная — профиль пользователя и время
 * 2. Задачи — список задач работника
 * 3. Контроль — контроль выполнения задач сотрудниками
 * 4. Профиль — профиль пользователя, выход
 *
 * Стартовый таб — Главная (индекс 0)
 */
@Composable
fun ManagerMainTabScreen(
    onTaskClick: (String) -> Unit,
    onLogout: () -> Unit,
    settingsViewModel: SettingsViewModel = koinViewModel()
) {
    var selectedTab by rememberSaveable { mutableStateOf(MainTab.startTab.route) }
    var showAssignmentsList by rememberSaveable { mutableStateOf(false) }
    var showSupportScreen by rememberSaveable { mutableStateOf(false) }
    var showDeleteAccountScreen by rememberSaveable { mutableStateOf(false) }
    val colors = WfmTheme.colors

    // ViewModel для главного экрана (менеджер)
    val homeViewModel: HomeViewModel = koinViewModel { parametersOf(HomeUserRole.MANAGER) }
    // ViewModel для задач менеджера (общий для списка и фильтра)
    val managerTasksViewModel: ManagerTasksListViewModel = koinViewModel()
    // ViewModel для задач работника
    val workerTasksViewModel: TasksListViewModel = koinViewModel()

    // Следим за успешным открытием смены и переключаем на таб Задачи
    val shiftOpenedSuccessfully by homeViewModel.shiftOpenedSuccessfully.collectAsState()
    LaunchedEffect(shiftOpenedSuccessfully) {
        if (shiftOpenedSuccessfully) {
            selectedTab = MainTab.Tasks.route
            homeViewModel.resetShiftOpenedFlag()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            bottomBar = {
                // Скрываем Tab Bar когда показывается список назначений, экран поддержки или удаления аккаунта
                if (!showAssignmentsList && !showSupportScreen && !showDeleteAccountScreen) {
                    Column {
                        HorizontalDivider(
                            thickness = 1.dp,
                            color = colors.tabbarBorder
                        )
                        NavigationBar(
                            containerColor = colors.tabbarBg
                        ) {
                            MainTab.managerEntries.forEach { tab ->
                                NavigationBarItem(
                                    selected = selectedTab == tab.route,
                                    onClick = { selectedTab = tab.route },
                                    icon = {
                                        Icon(
                                            painter = painterResource(id = tab.icon),
                                            contentDescription = tab.title,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    },
                                    label = {
                                        Text(
                                            text = tab.title,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Medium,
                                            lineHeight = 14.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    },
                                    colors = androidx.compose.material3.NavigationBarItemDefaults.colors(
                                        selectedIconColor = colors.tabbarTabActive,
                                        selectedTextColor = colors.tabbarTabActive,
                                        unselectedIconColor = colors.tabbarTabDefault,
                                        unselectedTextColor = colors.tabbarTabDefault,
                                        indicatorColor = Color.Transparent
                                    )
                                )
                            }
                        }
                    }
                }
            }
        ) { paddingValues ->
            when (selectedTab) {
                MainTab.Home.route -> {
                    ManagerHomeScreen(
                        viewModel = homeViewModel,
                        onShowAllTasks = {
                            selectedTab = MainTab.Control.route
                        },
                        modifier = Modifier.padding(paddingValues)
                    )
                }

                MainTab.Tasks.route -> {
                    TasksListScreen(
                        onTaskClick = onTaskClick,
                        onOpenShift = {
                            selectedTab = MainTab.Home.route
                        },
                        viewModel = workerTasksViewModel,
                        modifier = Modifier.padding(paddingValues),
                        onNavigateToControl = {
                            selectedTab = MainTab.Control.route
                        }
                    )
                }

                MainTab.Control.route -> {
                    ManagerTasksListScreen(
                        viewModel = managerTasksViewModel,
                        onNavigateToTasksTab = { selectedTab = MainTab.Tasks.route },
                        modifier = Modifier.padding(paddingValues)
                    )
                }

                MainTab.Settings.route -> {
                    SettingsScreen(
                        onLogout = onLogout,
                        showAssignmentsList = showAssignmentsList,
                        onShowAssignmentsListChange = { showAssignmentsList = it },
                        showSupportScreen = showSupportScreen,
                        onShowSupportScreenChange = { showSupportScreen = it },
                        showDeleteAccountScreen = showDeleteAccountScreen,
                        onShowDeleteAccountScreenChange = { showDeleteAccountScreen = it },
                        modifier = Modifier.padding(paddingValues),
                        viewModel = settingsViewModel
                    )
                }
            }
        }

        // Экран поддержки поверх Scaffold (без двойного padding от системных отступов)
        if (showSupportScreen) {
            BackHandler { showSupportScreen = false }
            SupportScreen(
                onNavigateBack = { showSupportScreen = false }
            )
        }

        // Экран удаления аккаунта поверх Scaffold (без padding)
        if (showDeleteAccountScreen) {
            DeleteAccountScreen(
                viewModel = settingsViewModel,
                onSuccess = {
                    showDeleteAccountScreen = false
                    settingsViewModel.logout()
                    onLogout()
                },
                onDismiss = { showDeleteAccountScreen = false }
            )
        }
    } // Box
}
