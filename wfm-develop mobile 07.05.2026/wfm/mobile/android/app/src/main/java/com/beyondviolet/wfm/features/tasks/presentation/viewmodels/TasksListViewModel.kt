package com.beyondviolet.wfm.features.tasks.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.core.models.CreateTaskRequest
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.models.TaskType
import com.beyondviolet.wfm.core.models.isActive
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * ViewModel для списка задач
 */
class TasksListViewModel(
    private val tasksService: TasksService,
    val userManager: UserManager,
    private val toastManager: ToastManager,
    private val analyticsService: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow<TasksListUiState>(TasksListUiState.Loading)
    val uiState: StateFlow<TasksListUiState> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _allTasks = MutableStateFlow<List<Task>>(emptyList())

    private var loadTasksJob: Job? = null

    /**
     * Активная задача пользователя (в состоянии IN_PROGRESS)
     * Согласно бизнес-правилу: только 1 активная задача одновременно
     */
    val activeTask: StateFlow<Task?> = _allTasks.map { tasks ->
        tasks.firstOrNull { it.state == TaskState.IN_PROGRESS }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    /**
     * Проверка наличия открытой смены
     * Используется UI для различения:
     * - Нет открытой смены → EmptyState "Список задач будет доступен после открытия смены"
     * - Смена открыта, но задач нет → EmptyState "У вас нет задач"
     */
    val hasOpenShift: StateFlow<Boolean> = userManager.currentShift.map { shift ->
        shift?.status?.isActive() == true
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    /**
     * Загружает задачи с учетом текущего фильтра
     * Использует GET /my для получения задач текущей смены
     */
    fun loadTasks() {
        viewModelScope.launch {
            _uiState.value = TasksListUiState.Loading
            loadTasksInternal()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            try {
                _isRefreshing.value = true
                loadTasksInternal()
            } finally {
                // Небольшая задержка чтобы UI успел обработать состояние refresh
                kotlinx.coroutines.delay(200)
                _isRefreshing.value = false
            }
        }
    }

    /**
     * Внутренний метод загрузки задач (используется в loadTasks и refresh)
     */
    private suspend fun loadTasksInternal() {
        // Отменяем предыдущую загрузку если она еще активна
        loadTasksJob?.cancel()

        // Сначала проверяем - может данные уже есть?
        if (userManager.currentUser.value != null &&
            userManager.currentShift.value != null &&
            userManager.currentShift.value?.status?.isActive() == true) {
            // Все данные есть - сразу загружаем задачи!
            android.util.Log.i("TasksListVM", "✅ All data already available, loading tasks for assignment ${userManager.currentShift.value!!.assignmentId}")
            val assignmentId = userManager.currentShift.value!!.assignmentId
            val success = loadTasksWithAssignment(assignmentId)

            if (success) {
                // Задачи загружены успешно
                return
            }

            // Была ошибка при загрузке задач - переходим к шагу 2 (перезапрос UserManager)
            android.util.Log.w("TasksListVM", "⚠️ Error loading tasks, will reload UserManager...")
        }

        // Данных нет или была ошибка - проверяем состояние UserManager
        android.util.Log.w("TasksListVM", "⚠️ Required data missing or error occurred, checking UserManager state...")

        if (userManager.isLoading.value) {
            // UserManager загружается - ждём его завершения
            android.util.Log.i("TasksListVM", "⏳ UserManager is loading, waiting...")
            while (userManager.isLoading.value) {
                kotlinx.coroutines.delay(100) // 100ms
            }
            android.util.Log.i("TasksListVM", "✅ UserManager finished loading")
        } else {
            // UserManager не загружается - сами перезапрашиваем
            android.util.Log.i("TasksListVM", "🔄 UserManager not loading, reloading...")
            userManager.loadCurrentRole()
        }

        // После ожидания/перезапроса проверяем данные снова
        if (userManager.currentUser.value == null) {
            android.util.Log.e("TasksListVM", "❌ User still not loaded after reload, cannot load tasks")
            _allTasks.value = emptyList()
            _uiState.value = TasksListUiState.Success(emptyList())
            return
        }

        val currentShift = userManager.currentShift.value
        if (currentShift == null) {
            // Нет смены — UI покажет EmptyState "Список задач будет доступен после открытия смены"
            android.util.Log.e("TasksListVM", "❌ No shift found after reload, clearing tasks")
            _allTasks.value = emptyList()
            _uiState.value = TasksListUiState.Success(emptyList())
            return
        }

        if (!currentShift.status.isActive()) {
            // Смена не открыта — UI покажет EmptyState "Список задач будет доступен после открытия смены"
            android.util.Log.e("TasksListVM", "❌ Shift not active, clearing tasks")
            _allTasks.value = emptyList()
            _uiState.value = TasksListUiState.Success(emptyList())
            return
        }

        android.util.Log.i("TasksListVM", "✅ Data now available after reload, loading tasks for assignment ${currentShift.assignmentId}")
        loadTasksWithAssignment(currentShift.assignmentId)
    }

    /**
     * Загрузка задач с указанным assignment_id
     * Возвращает true если загрузка успешна, false если была критичная ошибка
     */
    private suspend fun loadTasksWithAssignment(assignmentId: Int): Boolean {
        var hadCriticalError = false

        // Запускаем загрузку задач с кэшированием (stale-while-revalidate)
        loadTasksJob = viewModelScope.launch {
            tasksService.getMyTasks(assignmentId).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        val allTasks = response.data
                        _allTasks.value = allTasks

                        if (response.isCached) {
                            android.util.Log.i("TasksListVM", "📦 Cached tasks loaded: ${allTasks.size} tasks")
                        } else {
                            android.util.Log.i("TasksListVM", "🔄 Fresh tasks loaded: ${allTasks.size} tasks")
                            analyticsService.track(AnalyticsEvent.TasksListViewed(tasksCount = allTasks.size))
                        }

                        _uiState.value = TasksListUiState.Success(allTasks)
                    }

                    is ApiResponse.Error -> {
                        // При ошибке от сервера - критичная ошибка, требуется перезапрос UserManager
                        android.util.Log.e("TasksListVM", "❌ Error loading tasks: ${response.message}")
                        hadCriticalError = true

                        // Показываем toast только если кэша не было
                        if (_allTasks.value.isEmpty()) {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                        } else {
                            // Кэш был показан, но свежие данные не загрузились
                            if (response.shouldShowToUser()) {
                                toastManager.show(response.message, state = WfmToastState.ERROR)
                            }
                        }
                    }
                }
            }
        }

        // Ждем завершения загрузки и возвращаем результат
        loadTasksJob?.join()
        return !hadCriticalError
    }

    fun onTaskCardTapped(task: Task) {
        analyticsService.track(
            AnalyticsEvent.TaskCardTapped(
                taskState = task.state?.name ?: "UNKNOWN",
                taskType = task.type?.name ?: "UNKNOWN"
            )
        )
    }

    fun createTask(title: String, description: String, plannedMinutes: Int) {
        viewModelScope.launch {
            try {
                val request = CreateTaskRequest(
                    title = title,
                    description = description,
                    type = TaskType.PLANNED,
                    plannedMinutes = plannedMinutes,
                    assigneeId = null,
                    shiftId = null
                )
                when (val response = tasksService.createTask(request)) {
                    is ApiResponse.Success -> loadTasks()
                    is ApiResponse.Error -> {
                        toastManager.show(response.message, state = WfmToastState.ERROR)
                    }
                }
            } catch (e: Exception) {
                toastManager.show(e.message ?: "Ошибка при создании задачи", state = WfmToastState.ERROR)
            }
        }
    }
}

sealed class TasksListUiState {
    data object Loading : TasksListUiState()
    data class Success(val tasks: List<Task>) : TasksListUiState()
    data class Error(val message: String) : TasksListUiState()
}
