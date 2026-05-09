package com.beyondviolet.wfm.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import com.beyondviolet.wfm.feature.auth.presentation.navigation.AuthRoute
import com.beyondviolet.wfm.feature.auth.presentation.navigation.authNavGraph
import com.beyondviolet.wfm.features.main.ManagerMainTabScreen
import com.beyondviolet.wfm.features.main.MainTabScreen
import com.beyondviolet.wfm.features.tasks.presentation.ui.TaskDetailsScreen
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TaskDetailsUiState
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TaskDetailsViewModel
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TasksListViewModel
import com.beyondviolet.wfm.features.noassignments.NoAssignmentsScreen
import com.beyondviolet.wfm.features.splash.SplashScreen
import com.beyondviolet.wfm.features.welcome.WelcomeScreen
import com.beyondviolet.wfm.ui.components.WfmLoader
import androidx.compose.ui.platform.LocalContext
import com.beyondviolet.wfm.core.notifications.NotificationsApiService
import com.beyondviolet.wfm.core.notifications.NotificationsWebSocketService
import com.beyondviolet.wfm.core.notifications.showLocalNotification
import com.beyondviolet.wfm.core.push.PushService
import com.beyondviolet.wfm.deeplink.PushDeepLink
import kotlinx.coroutines.launch
import org.koin.compose.koinInject
import org.koin.androidx.compose.koinViewModel

/**
 * Маршруты навигации
 */
sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Welcome : Screen("welcome")
    data object Loading : Screen("loading")
    data object NoAssignments : Screen("no_assignments")
    data object MainTabs : Screen("main_tabs")
    data object TasksList : Screen("tasks_list")
    data object TaskDetails : Screen("task_details/{taskId}") {
        fun createRoute(taskId: String) = "task_details/$taskId"
    }
    data object EmployeeFilter : Screen("employee_filter")
}

/**
 * Граф навигации приложения
 */
@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    tokenStorage: TokenStorage = koinInject(),
    userManager: UserManager = koinInject(),
    analyticsService: AnalyticsService = koinInject(),
    onSplashFinished: () -> Unit = {}
) {
    // Обработка push deep link: переход на экран задачи из любого места навигации
    LaunchedEffect(Unit) {
        PushDeepLink.taskIdFlow.collect { taskId ->
            navController.navigate(Screen.TaskDetails.createRoute(taskId))
        }
    }

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        // Splash экран
        composable(Screen.Splash.route) {
            val scope = rememberCoroutineScope()

            SplashScreen(
                onSplashFinished = {
                    // Восстанавливаем системные бары после splash
                    onSplashFinished()

                    scope.launch {
                        val nextRoute = if (tokenStorage.hasTokens()) {
                            // Если токены есть, показываем загрузку и определяем роль
                            Screen.Loading.route
                        } else {
                            // Если токенов нет, сразу показываем экран авторизации
                            AuthRoute.ROOT
                        }

                        navController.navigate(nextRoute) {
                            // Удаляем splash из back stack
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                }
            )
        }

        // Welcome экран (не показываем в основном flow, но оставляем в навигации)
        composable(Screen.Welcome.route) {
            WelcomeScreen(
                onSignInClick = {
                    navController.navigate(AuthRoute.ROOT)
                }
            )
        }

        // Auth flow из модуля feature-auth
            authNavGraph(
                navController = navController,
                onAuthenticationCompleted = {
                    // После авторизации показываем экран загрузки для определения роли
                    navController.navigate(Screen.Loading.route) {
                        popUpTo(AuthRoute.ROOT) { inclusive = true }
                    }
                },
                onTrack = { eventName ->
                    when (eventName) {
                        "phone_input_viewed" -> analyticsService.track(AnalyticsEvent.PhoneInputViewed)
                        "phone_submitted" -> analyticsService.track(AnalyticsEvent.PhoneSubmitted)
                        "code_input_viewed" -> analyticsService.track(AnalyticsEvent.CodeInputViewed)
                        "code_submitted" -> analyticsService.track(AnalyticsEvent.CodeSubmitted)
                    }
                }
            )

            // Экран загрузки - определяем роль и перенаправляем
            composable(Screen.Loading.route) {
                val userState by userManager.currentUser.collectAsState()
                val currentAssignment by userManager.currentAssignment.collectAsState()
                val errorState by userManager.error.collectAsState()

                LaunchedEffect(Unit) {
                    userManager.loadCurrentRole()
                }

                LaunchedEffect(userState, currentAssignment, errorState) {
                    // Проверяем наличие ошибки
                    if (errorState != null) {
                        // При ошибке показываем экран NoAssignments (не разлогиниваем автоматически)
                        // Передаём текст ошибки через savedStateHandle
                        navController.currentBackStackEntry?.savedStateHandle?.set("error_message", errorState)
                        navController.navigate(Screen.NoAssignments.route) {
                            popUpTo(Screen.Loading.route) { inclusive = true }
                        }
                        return@LaunchedEffect
                    }

                    // Если пользователь и assignment загружены, и ошибок нет
                    val user = userState
                    if (user != null && currentAssignment != null) {
                        // Определяем роль из текущего выбранного assignment
                        val role = currentAssignment?.position?.role

                        val destination = when (role?.code) {
                            "manager" -> Screen.MainTabs.route // Используем тот же маршрут для manager
                            "worker" -> Screen.MainTabs.route
                            else -> {
                                // Неизвестная роль - логаут
                                tokenStorage.clearTokens()
                                navController.navigate(AuthRoute.ROOT) {
                                    popUpTo(0) { inclusive = true }
                                }
                                return@LaunchedEffect
                            }
                        }

                        // Трекинг login_completed и установка userId после загрузки пользователя
                        val roleCode = role?.code ?: "worker"
                        analyticsService.setUser(userId = user.id, role = roleCode)
                        analyticsService.track(AnalyticsEvent.LoginCompleted(role = roleCode))

                        navController.navigate(destination) {
                            // Очищаем весь back stack, чтобы кнопка "назад" сворачивала приложение
                            popUpTo(0) { inclusive = true }
                        }
                    }
                }

                // Показываем индикатор загрузки
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    WfmLoader()
                }
            }

            // Экран "Нет назначений"
            composable(Screen.NoAssignments.route) { backStackEntry ->
                val scope = rememberCoroutineScope()

                // Определяем тип экрана: ошибка или отсутствие назначения
                val isError = navController.previousBackStackEntry
                    ?.savedStateHandle
                    ?.get<String>("error_message") != null

                NoAssignmentsScreen(
                    isError = isError,
                    userManager = userManager,
                    onLogout = {
                        scope.launch {
                            userManager.clear()
                            tokenStorage.clearTokens()
                            navController.navigate(AuthRoute.ROOT) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    },
                    onAssignmentReceived = {
                        // После успешного рефреша переходим на MainTabs
                        navController.navigate(Screen.MainTabs.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            // Главный экран с табами (для работника и менеджера)
            composable(Screen.MainTabs.route) { backStackEntry ->
                val scope = rememberCoroutineScope()
                val context = LocalContext.current
                val currentAssignment by userManager.currentAssignment.collectAsState()
                val role = currentAssignment?.position?.role
                val notificationsWsService: NotificationsWebSocketService = koinInject()
                val notificationsApiService: NotificationsApiService = koinInject()

                // Подключаем WebSocket при входе в MainTabs, отключаем при уходе
                DisposableEffect(Unit) {
                    notificationsWsService.connect()
                    onDispose { notificationsWsService.disconnect() }
                }

                // Регистрируем сохранённый push-токен при входе в авторизованную зону.
                // onNewToken() сохраняет токен локально при получении (даже до авторизации),
                // поэтому здесь не делаем сетевой запрос к push-сервису — читаем из SharedPreferences.
                val pushService: PushService = koinInject()
                LaunchedEffect(Unit) {
                    pushService.getSavedToken(context)?.let { token ->
                        notificationsApiService.registerDeviceToken(token)
                    }
                }

                // Определяем какой экран показывать на основе роли
                when (role?.code) {
                    "manager" -> {
                        // Менеджер: показываем системное уведомление при получении WS-уведомления
                        LaunchedEffect(Unit) {
                            notificationsWsService.notifications.collect { wsNotification ->
                                showLocalNotification(context, wsNotification)
                            }
                        }

                        // Менеджер: показываем ManagerMainTabScreen
                        ManagerMainTabScreen(
                            onTaskClick = { taskId ->
                                navController.navigate(Screen.TaskDetails.createRoute(taskId))
                            },
                            onLogout = {
                                scope.launch {
                                    userManager.clear()
                                    tokenStorage.clearTokens()
                                    navController.navigate(AuthRoute.ROOT) {
                                        popUpTo(0) { inclusive = true }
                                    }
                                }
                            }
                        )
                    }
                    "worker" -> {
                        // Работник: показываем MainTabScreen
                        val viewModel: TasksListViewModel = koinViewModel()

                        // Обновляем список задач при возврате на экран из деталей
                        val shouldRefresh = backStackEntry.savedStateHandle
                            .getStateFlow("should_refresh", false)

                        LaunchedEffect(shouldRefresh.value) {
                            if (shouldRefresh.value) {
                                viewModel.refresh()
                                backStackEntry.savedStateHandle["should_refresh"] = false
                            }
                        }

                        // Обновляем задачи и показываем системное уведомление при получении WS-уведомлений
                        // Работник получает: TASK_STATE_CHANGED, TASK_REJECTED
                        LaunchedEffect(Unit) {
                            notificationsWsService.notifications.collect { wsNotification ->
                                showLocalNotification(context, wsNotification)
                                viewModel.refresh()
                            }
                        }

                        MainTabScreen(
                            onTaskClick = { taskId ->
                                navController.navigate(Screen.TaskDetails.createRoute(taskId))
                            },
                            onLogout = {
                                scope.launch {
                                    userManager.clear()
                                    tokenStorage.clearTokens()
                                    navController.navigate(AuthRoute.ROOT) {
                                        popUpTo(0) { inclusive = true }
                                    }
                                }
                            },
                            tasksListViewModel = viewModel
                        )
                    }
                    else -> {
                        // Fallback на worker
                        val viewModel: TasksListViewModel = koinViewModel()
                        MainTabScreen(
                            onTaskClick = { taskId ->
                                navController.navigate(Screen.TaskDetails.createRoute(taskId))
                            },
                            onLogout = {
                                scope.launch {
                                    userManager.clear()
                                    tokenStorage.clearTokens()
                                    navController.navigate(AuthRoute.ROOT) {
                                        popUpTo(0) { inclusive = true }
                                    }
                                }
                            },
                            tasksListViewModel = viewModel
                        )
                    }
                }
            }

            composable(
                route = Screen.TaskDetails.route,
                arguments = listOf(
                    androidx.navigation.navArgument("taskId") {
                        type = androidx.navigation.NavType.StringType
                    }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getString("taskId") ?: return@composable
                val viewModel: TaskDetailsViewModel = koinViewModel(
                    parameters = { org.koin.core.parameter.parametersOf(taskId) }
                )

                // При успешном изменении статуса сообщаем предыдущему экрану
                val uiState by viewModel.uiState.collectAsState()
                var previousState by remember { mutableStateOf<TaskDetailsUiState?>(null) }

                LaunchedEffect(uiState) {
                    // Отслеживаем переход из Processing в Success
                    if (previousState is TaskDetailsUiState.Processing &&
                        uiState is TaskDetailsUiState.Success
                    ) {
                        // Сигнализируем предыдущему экрану об обновлении
                        navController.previousBackStackEntry?.savedStateHandle?.set("should_refresh", true)
                    }
                    previousState = uiState
                }

                TaskDetailsScreen(
                    taskId = taskId,
                    viewModel = viewModel,
                    onNavigateBack = {
                        navController.popBackStack()
                    },
                    onNavigateToTask = { activeTaskId ->
                        navController.navigate(Screen.TaskDetails.createRoute(activeTaskId))
                    }
                )
            }
        }
    }
