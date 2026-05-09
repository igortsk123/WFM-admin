package com.beyondviolet.wfm.features.managertasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.core.models.*
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel для экрана "Контроль задач" менеджера
 */
class ManagerTasksListViewModel(
    private val userManager: UserManager,
    private val tasksService: TasksService,
    private val toastManager: ToastManager,
    private val analyticsService: AnalyticsService
) : ViewModel() {

    // Флаг для Pull-to-Refresh
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // Индекс выбранного сегмента (0 = "Проверить", 1 = "Принятые")
    private val _selectedSegmentIndex = MutableStateFlow(0)
    val selectedSegmentIndex: StateFlow<Int> = _selectedSegmentIndex.asStateFlow()

    // Список задач
    private val _tasks = MutableStateFlow<List<Task>>(emptyList())
    val tasks: StateFlow<List<Task>> = _tasks.asStateFlow()

    // Сообщение об ошибке (если произошла ошибка загрузки)
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Группы фильтров (тип работ, сотрудники, зоны)
    private val _filterGroups = MutableStateFlow<List<TaskFilterGroup>>(emptyList())
    val filterGroups: StateFlow<List<TaskFilterGroup>> = _filterGroups.asStateFlow()

    // Показывать BottomSheet фильтров
    private val _showFilters = MutableStateFlow(false)
    val showFilters: StateFlow<Boolean> = _showFilters.asStateFlow()

    // Jobs для отмены конкурирующих запросов
    private var loadFiltersJob: Job? = null
    private var loadTasksJob: Job? = null

    // Маска фильтров всех доступных задач (только v2): для каждой задачи — тройка индексов [work_type_idx, assignee_idx, zone_idx]
    private val _taskFilterIndices = MutableStateFlow<List<List<Int>>>(emptyList())
    val taskFilterIndices: StateFlow<List<List<Int>>> = _taskFilterIndices.asStateFlow()

    // Все доступные фильтры с сервера
    private var availableFilters: List<FilterGroup> = emptyList()

    fun onAppear() {
        analyticsService.track(AnalyticsEvent.ManagerTasksViewed)
        viewModelScope.launch {
            loadTasksSuspend()
        }
    }

    init {
        loadFilters()
        loadTasks()
    }

    /**
     * Открыть BottomSheet фильтров
     */
    fun openFilters() {
        _showFilters.value = true
    }

    /**
     * Закрыть BottomSheet фильтров
     */
    fun closeFilters() {
        _showFilters.value = false
    }

    /**
     * Есть ли активные фильтры (хотя бы один фильтр выбран)
     */
    fun hasActiveFilters(): Boolean {
        return _filterGroups.value.any { group ->
            group.items.any { it.isSelected }
        }
    }

    /**
     * Изменить выбранный сегмент
     */
    fun onSegmentChanged(index: Int) {
        _selectedSegmentIndex.value = index
        loadTasks()
    }

    /**
     * Применить фильтры (тип работ, сотрудники, зоны)
     */
    fun applyFilters(updatedFilterGroups: List<TaskFilterGroup>) {
        _filterGroups.value = updatedFilterGroups
        recomputeEnabledState()
        loadTasks()
    }

    /**
     * Загрузить фильтры (тип работ, сотрудники, зоны) для текущего магазина
     */
    private fun loadFilters() {
        viewModelScope.launch {
            loadFiltersSuspend()
        }
    }

    /**
     * Загрузить задачи в зависимости от выбранного таба
     */
    private fun loadTasks() {
        viewModelScope.launch {
            loadTasksSuspend()
        }
    }

    /**
     * Обновить данные (pull-to-refresh)
     */
    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                loadFiltersSuspend()
                loadTasksSuspend()
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    /**
     * Suspend-версия loadFilters для последовательного выполнения
     */
    suspend fun loadFiltersSuspend() {
        loadFiltersJob?.cancel()

        val assignmentId = userManager.getCurrentAssignment()?.id ?: return

        // Сохраняем текущие выбранные элементы перед обновлением
        val currentSelections: Map<String, Set<String>> = _filterGroups.value.associate { group ->
            group.id to group.items.filter { it.isSelected }.map { it.id }.toSet()
        }

        loadFiltersJob = viewModelScope.launch {
            tasksService.getTaskListFiltersV2(assignmentId = assignmentId).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        availableFilters = response.data.filters
                        _taskFilterIndices.value = response.data.taskFilterIndices

                        // Создаём список для UI с восстановлением выбранных элементов
                        val filterGroups = availableFilters.map { group ->
                            TaskFilterGroup(
                                id = group.id,
                                title = group.title,
                                items = group.array.map { item ->
                                    val itemId = item.id.toString()
                                    val wasSelected = currentSelections[group.id]?.contains(itemId) ?: false
                                    TaskFilterItem(
                                        id = itemId,
                                        title = item.title,
                                        isSelected = wasSelected
                                    )
                                }
                            )
                        }

                        _filterGroups.value = filterGroups
                        recomputeEnabledState()
                    }
                    is ApiResponse.Error -> {
                        if (_filterGroups.value.isEmpty()) {
                            _filterGroups.value = emptyList()
                        } else if (response.shouldShowToUser()) {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                        }
                    }
                }
            }
        }

        loadFiltersJob?.join()
    }

    private fun recomputeEnabledState() {
        _filterGroups.value = recomputeFilterEnabledState(_filterGroups.value, _taskFilterIndices.value)
    }

    /**
     * Suspend-версия loadTasks для последовательного выполнения
     */
    suspend fun loadTasksSuspend() {
        loadTasksJob?.cancel()

        val assignmentId = userManager.getCurrentAssignment()?.id ?: return

        // Формируем динамические фильтры из всех групп (включая assignee_ids для сотрудников)
        val filters = mutableMapOf<String, List<Int>>()
        _filterGroups.value.forEach { group ->
            val selectedItems = group.items.filter { it.isSelected }
            if (selectedItems.isNotEmpty()) {
                val itemIds = selectedItems.mapNotNull { it.id.toIntOrNull() }
                if (itemIds.isNotEmpty()) {
                    filters[group.id] = itemIds
                }
            }
        }

        val flow = if (_selectedSegmentIndex.value == 0) {
            // Таб "Проверить": reviewState = ON_REVIEW
            tasksService.getTasksListV2(
                assignmentId = assignmentId,
                reviewState = TaskReviewState.ON_REVIEW,
                filters = if (filters.isEmpty()) null else filters
            )
        } else {
            // Таб "Принятые": reviewState = ACCEPTED + state = COMPLETED
            tasksService.getTasksListV2(
                assignmentId = assignmentId,
                state = TaskState.COMPLETED,
                reviewState = TaskReviewState.ACCEPTED,
                filters = if (filters.isEmpty()) null else filters
            )
        }

        loadTasksJob = viewModelScope.launch {
            flow.collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        _tasks.value = response.data
                        _errorMessage.value = null
                    }
                    is ApiResponse.Error -> {
                        if (_tasks.value.isEmpty()) {
                            _tasks.value = emptyList()
                            _errorMessage.value = response.message
                        } else {
                            if (response.shouldShowToUser()) {
                                toastManager.show(response.message, state = WfmToastState.ERROR)
                            }
                        }
                    }
                }
            }
        }

        loadTasksJob?.join()
    }
}
