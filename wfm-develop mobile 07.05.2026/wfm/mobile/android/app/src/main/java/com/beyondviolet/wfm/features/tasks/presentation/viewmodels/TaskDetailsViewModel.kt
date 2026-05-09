package com.beyondviolet.wfm.features.tasks.presentation.viewmodels

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.models.Hint
import com.beyondviolet.wfm.core.models.Operation
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.core.utils.ImageCompression
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel для детального экрана задачи
 * Согласно YAML: .memory_bank/mobile/feature_tasks/screens/task_details.yaml
 */
class TaskDetailsViewModel(
    private val context: Context,
    private val tasksService: TasksService,
    private val taskId: String,
    private val toastManager: ToastManager,
    private val analyticsService: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow<TaskDetailsUiState>(TaskDetailsUiState.Loading)
    val uiState: StateFlow<TaskDetailsUiState> = _uiState.asStateFlow()

    private val _showCompleteConfirmation = MutableStateFlow(false)
    val showCompleteConfirmation: StateFlow<Boolean> = _showCompleteConfirmation.asStateFlow()

    private val _showActiveTaskConflict = MutableStateFlow(false)
    val showActiveTaskConflict: StateFlow<Boolean> = _showActiveTaskConflict.asStateFlow()

    private val _activeTaskId = MutableStateFlow<String?>(null)
    val activeTaskId: StateFlow<String?> = _activeTaskId.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // Операции — приходят вместе с задачей из GET /{id}
    private val _selectedOperationIds = MutableStateFlow<Set<Int>>(emptySet())
    val selectedOperationIds: StateFlow<Set<Int>> = _selectedOperationIds.asStateFlow()

    private val _newOperations = MutableStateFlow<List<String>>(emptyList())
    val newOperations: StateFlow<List<String>> = _newOperations.asStateFlow()

    private var isSelectionInitialized = false

    // Подсказки — загружаются отдельным запросом
    private val _hints = MutableStateFlow<List<Hint>>(emptyList())
    val hints: StateFlow<List<Hint>> = _hints.asStateFlow()

    private val _isLoadingHints = MutableStateFlow(false)
    val isLoadingHints: StateFlow<Boolean> = _isLoadingHints.asStateFlow()

    private var loadTaskJob: Job? = null

    init {
        // Восстанавливаем выбор операций из SharedPreferences
        val prefs = context.getSharedPreferences("wfm_operations", Context.MODE_PRIVATE)
        val savedIds = prefs.getStringSet(selectionKey(), emptySet()) ?: emptySet()
        if (savedIds.isNotEmpty()) {
            _selectedOperationIds.value = savedIds.mapNotNull { it.toIntOrNull() }.toSet()
            isSelectionInitialized = true
        }
        val savedNew = prefs.getStringSet(newOperationsKey(), emptySet()) ?: emptySet()
        _newOperations.value = savedNew.toList()

        loadTask()
        // Загружаем подсказки сразу при входе — ждём первого результата задачи
        // (кэш приходит мгновенно, поэтому к моменту переключения таба данные уже есть)
        viewModelScope.launch {
            uiState.first { it is TaskDetailsUiState.Success }
            loadHints()
        }
    }

    /**
     * Вычислить прогресс выполнения задачи (0.0f - 1.0f)
     */
    fun calculateProgress(task: Task): Float {
        val historyBrief = task.historyBrief ?: return 0f
        val duration = historyBrief.duration ?: return 0f
        val plannedMinutes = task.plannedMinutes ?: return 0f

        val plannedSeconds = plannedMinutes * 60f
        var totalSeconds = duration.toFloat()

        // Только для IN_PROGRESS добавляем время с последнего обновления
        if (task.safeState() == TaskState.IN_PROGRESS) {
            historyBrief.timeStateUpdated?.let { timeStateUpdated ->
                val elapsedSinceUpdate = (System.currentTimeMillis() - timeStateUpdated.toEpochMilliseconds()) / 1000f
                totalSeconds += elapsedSinceUpdate
            }
        }

        val progress = totalSeconds / plannedSeconds
        return progress.coerceAtMost(1f)
    }

    /**
     * Вычислить оставшееся время в минутах
     */
    fun calculateRemainingMinutes(task: Task): Int {
        val plannedMinutes = task.plannedMinutes ?: return 0
        val historyBrief = task.historyBrief ?: return plannedMinutes
        val duration = historyBrief.duration ?: return plannedMinutes

        var totalSeconds = duration.toFloat()

        // Только для IN_PROGRESS добавляем время с последнего обновления
        if (task.safeState() == TaskState.IN_PROGRESS) {
            historyBrief.timeStateUpdated?.let { timeStateUpdated ->
                val elapsedSinceUpdate = (System.currentTimeMillis() - timeStateUpdated.toEpochMilliseconds()) / 1000f
                totalSeconds += elapsedSinceUpdate
            }
        }

        val elapsedMinutes = (totalSeconds / 60).toInt()
        return (plannedMinutes - elapsedMinutes).coerceAtLeast(0)
    }

    /**
     * Показать bottom sheet для подтверждения завершения
     */
    fun requestCompleteConfirmation() {
        val task = (uiState.value as? TaskDetailsUiState.Success)?.task
        analyticsService.track(
            AnalyticsEvent.TaskCompleteSheetOpened(
                requiresPhoto = task?.requiresPhoto == true
            )
        )
        _showCompleteConfirmation.value = true
    }

    /**
     * Отменить завершение задачи
     */
    fun cancelComplete() {
        _showCompleteConfirmation.value = false
    }

    /**
     * Закрыть bottom sheet с ошибкой активной задачи
     */
    fun dismissActiveTaskConflict() {
        _showActiveTaskConflict.value = false
    }

    /**
     * Получить ToastManager для использования в UI компонентах
     */
    fun getToastManager(): ToastManager = toastManager

    /**
     * Получить CoroutineScope для использования в UI компонентах
     */
    fun getViewModelScope(): kotlinx.coroutines.CoroutineScope = viewModelScope

    private fun loadTask() {
        // Отменяем предыдущую загрузку если она еще активна
        loadTaskJob?.cancel()

        loadTaskJob = viewModelScope.launch {
            _uiState.value = TaskDetailsUiState.Loading
            _isRefreshing.value = true

            // Используем кэшированный запрос (stale-while-revalidate)
            tasksService.getTask(taskId).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        _uiState.value = TaskDetailsUiState.Success(response.data)

                        // Скрываем индикатор только для свежих данных (не из кэша)
                        if (!response.isCached) {
                            _isRefreshing.value = false
                        }

                        // Инициализируем выбор операций из completedOperationIds если SharedPreferences пуст
                        if (!response.isCached) {
                            initializeSelectionFromServerIfNeeded(response.data)
                        }

                        val task = response.data
                        analyticsService.track(
                            AnalyticsEvent.TaskDetailViewed(
                                taskState = task.state?.name ?: "UNKNOWN",
                                taskReviewState = task.reviewState?.name ?: "NONE",
                                taskType = task.type?.name ?: "UNKNOWN"
                            )
                        )
                    }

                    is ApiResponse.Error -> {
                        _isRefreshing.value = false

                        // Ошибка обновления (кэш уже показан если был)
                        // Только если задачи нет (кэша не было) - показываем ошибку
                        if (_uiState.value is TaskDetailsUiState.Loading) {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                            _uiState.value = TaskDetailsUiState.Error(response.message)
                        } else {
                            // Кэш был показан, но свежие данные не загрузились
                            // Показываем Toast только если это критичная ошибка (не сетевая)
                            if (response.shouldShowToUser()) {
                                toastManager.show(response.message, state = WfmToastState.ERROR)
                            }
                        }
                    }
                }
            }
        }
    }

    fun refresh() {
        loadTask()
        loadHints()
    }

    /**
     * Переключить выбор операции и сохранить в SharedPreferences
     */
    fun toggleOperation(id: Int) {
        val current = _selectedOperationIds.value.toMutableSet()
        if (current.contains(id)) current.remove(id) else current.add(id)
        _selectedOperationIds.value = current
        saveSelectionToPrefs()
    }

    /**
     * Установить выбранные операции (из SelectOperationsBottomSheet) и сохранить в SharedPreferences
     */
    fun setSelectedOperationIds(ids: Set<Int>) {
        _selectedOperationIds.value = ids
        saveSelectionToPrefs()
    }

    /**
     * Добавить новую операцию и сохранить в SharedPreferences
     */
    fun addNewOperation(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        _newOperations.value = _newOperations.value + trimmed
        saveNewOperationsToPrefs()
    }

    /**
     * Удалить новую операцию по индексу
     */
    fun removeNewOperation(index: Int) {
        val list = _newOperations.value.toMutableList()
        if (!list.indices.contains(index)) return
        list.removeAt(index)
        _newOperations.value = list
        saveNewOperationsToPrefs()
    }

    // MARK: - Analytics (подзадачи и подсказки)

    /**
     * @param trigger "manual" — кнопка «Добавить подзадачу», "auto" — при нажатии «Завершить» без выбора
     */
    fun trackSubtaskSelectSheetOpened(trigger: String) {
        val task = (uiState.value as? TaskDetailsUiState.Success)?.task ?: return
        analyticsService.track(AnalyticsEvent.SubtaskSelectSheetOpened(
            trigger = trigger,
            workType = task.workType?.name,
            operationsCount = task.operations?.size ?: 0
        ))
    }

    fun trackSubtaskSearchUsed() {
        analyticsService.track(AnalyticsEvent.SubtaskSearchUsed)
    }

    fun trackSubtaskCreateSheetOpened() {
        analyticsService.track(AnalyticsEvent.SubtaskCreateSheetOpened)
    }

    fun trackSubtaskCreated() {
        analyticsService.track(AnalyticsEvent.SubtaskCreated)
    }

    fun trackHintsTabViewed() {
        val task = (uiState.value as? TaskDetailsUiState.Success)?.task ?: return
        analyticsService.track(AnalyticsEvent.HintsTabViewed(
            workType = task.workType?.name,
            zone = task.zone?.name,
            hintsCount = hints.value.size
        ))
    }

    // MARK: - Operation Selection Persistence

    private fun selectionKey() = "wfm_op_sel_$taskId"
    private fun newOperationsKey() = "wfm_op_new_$taskId"

    private fun saveSelectionToPrefs() {
        val prefs = context.getSharedPreferences("wfm_operations", Context.MODE_PRIVATE)
        prefs.edit().putStringSet(selectionKey(), _selectedOperationIds.value.map { it.toString() }.toSet()).apply()
    }

    private fun saveNewOperationsToPrefs() {
        val prefs = context.getSharedPreferences("wfm_operations", Context.MODE_PRIVATE)
        prefs.edit().putStringSet(newOperationsKey(), _newOperations.value.toSet()).apply()
    }

    private fun clearSelectionPrefs() {
        val prefs = context.getSharedPreferences("wfm_operations", Context.MODE_PRIVATE)
        prefs.edit().remove(selectionKey()).remove(newOperationsKey()).apply()
    }

    private fun initializeSelectionFromServerIfNeeded(task: Task) {
        if (isSelectionInitialized) return
        val ops = task.operations ?: return
        val completedIds = task.completedOperationIds
        if (!completedIds.isNullOrEmpty()) {
            val validIds = ops.map { it.id }.toSet()
            _selectedOperationIds.value = completedIds.toSet().intersect(validIds)
        }
        isSelectionInitialized = true
    }

    /**
     * Загрузить подсказки по work_type_id и zone_id задачи (stale-while-revalidate)
     */
    fun loadHints() {
        if (_isLoadingHints.value) return
        val task = (uiState.value as? TaskDetailsUiState.Success)?.task
        viewModelScope.launch {
            _isLoadingHints.value = true
            tasksService.getHints(
                workTypeId = task?.workTypeId,
                zoneId = task?.zoneId
            ).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        _hints.value = response.data
                        _isLoadingHints.value = false
                    }
                    is ApiResponse.Error -> {
                        _isLoadingHints.value = false
                    }
                }
            }
        }
    }

    /**
     * Начать задачу (NEW → IN_PROGRESS)
     */
    fun startTask() {
        val currentTask = (uiState.value as? TaskDetailsUiState.Success)?.task
        analyticsService.track(AnalyticsEvent.TaskStartTapped(
            taskId = taskId,
            taskType = currentTask?.type?.name ?: "UNKNOWN",
            workType = currentTask?.workType?.name,
            timeStart = currentTask?.timeStart,
            timeEnd = currentTask?.timeEnd
        ))
        viewModelScope.launch {
            try {
                _uiState.value = TaskDetailsUiState.Processing

                when (val response = tasksService.startTask(taskId)) {
                    is ApiResponse.Success -> {
                        _uiState.value = TaskDetailsUiState.Success(response.data)
                    }
                    is ApiResponse.Error -> {
                        // Проверяем, если ошибка CONFLICT - показываем bottom sheet вместо toast
                        if (response.code == "CONFLICT") {
                            _activeTaskId.value = response.activeTaskId
                            _showActiveTaskConflict.value = true
                            // Восстанавливаем текущее состояние задачи (убираем loader)
                            val currentTask = (uiState.value as? TaskDetailsUiState.Success)?.task
                            if (currentTask != null) {
                                _uiState.value = TaskDetailsUiState.Success(currentTask)
                            } else {
                                // Если текущей задачи нет (не должно быть), перезагружаем
                                loadTask()
                            }
                        } else {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                            // Перезагружаем задачу только для других ошибок (вернётся кэш если есть)
                            loadTask()
                        }
                    }
                }
            } catch (e: Exception) {
                toastManager.show(e.message ?: "Ошибка при запуске задачи", state = WfmToastState.ERROR)
                loadTask()
            }
        }
    }

    /**
     * Остановить задачу (IN_PROGRESS → PAUSED)
     */
    fun pauseTask() {
        analyticsService.track(AnalyticsEvent.TaskPauseTapped)
        viewModelScope.launch {
            try {
                _uiState.value = TaskDetailsUiState.Processing

                when (val response = tasksService.pauseTask(taskId)) {
                    is ApiResponse.Success -> {
                        _uiState.value = TaskDetailsUiState.Success(response.data)
                        toastManager.show("Вы приостановили задачу", state = WfmToastState.DEFAULT)
                    }
                    is ApiResponse.Error -> {
                        toastManager.show(response.message, state = WfmToastState.ERROR)
                        loadTask()
                    }
                }
            } catch (e: Exception) {
                toastManager.show(e.message ?: "Ошибка при паузе задачи", state = WfmToastState.ERROR)
                loadTask()
            }
        }
    }

    /**
     * Возобновить задачу (PAUSED → IN_PROGRESS)
     */
    fun resumeTask() {
        analyticsService.track(AnalyticsEvent.TaskResumeTapped)
        viewModelScope.launch {
            try {
                _uiState.value = TaskDetailsUiState.Processing

                when (val response = tasksService.resumeTask(taskId)) {
                    is ApiResponse.Success -> {
                        _uiState.value = TaskDetailsUiState.Success(response.data)
                    }
                    is ApiResponse.Error -> {
                        // Проверяем, если ошибка CONFLICT - показываем bottom sheet вместо toast
                        if (response.code == "CONFLICT") {
                            _activeTaskId.value = response.activeTaskId
                            _showActiveTaskConflict.value = true
                            // Восстанавливаем текущее состояние задачи (убираем loader)
                            val currentTask = (uiState.value as? TaskDetailsUiState.Success)?.task
                            if (currentTask != null) {
                                _uiState.value = TaskDetailsUiState.Success(currentTask)
                            } else {
                                // Если текущей задачи нет (не должно быть), перезагружаем
                                loadTask()
                            }
                        } else {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                            // Перезагружаем задачу только для других ошибок (вернётся кэш если есть)
                            loadTask()
                        }
                    }
                }
            } catch (e: Exception) {
                toastManager.show(e.message ?: "Ошибка при возобновлении задачи", state = WfmToastState.ERROR)
                loadTask()
            }
        }
    }

    /**
     * Завершить задачу (IN_PROGRESS → COMPLETED)
     * @return true если задача успешно завершена, false если произошла ошибка
     */
    suspend fun completeTask(reportText: String? = null, hasPhoto: Boolean = false): Boolean {
        val currentTask = (uiState.value as? TaskDetailsUiState.Success)?.task
        analyticsService.track(
            AnalyticsEvent.TaskCompleteSubmitted(
                hasPhoto = hasPhoto,
                hasText = !reportText.isNullOrBlank(),
                taskId = taskId,
                taskType = currentTask?.type?.name ?: "UNKNOWN",
                workType = currentTask?.workType?.name,
                timeStart = currentTask?.timeStart,
                timeEnd = currentTask?.timeEnd
            )
        )
        val opIds = _selectedOperationIds.value.toList()
        val newOps = _newOperations.value.toList()

        try {
            _uiState.value = TaskDetailsUiState.Processing

            when (val response = tasksService.completeTask(taskId, operationIds = opIds, newOperations = newOps)) {
                is ApiResponse.Success -> {
                    clearSelectionPrefs()
                    _uiState.value = TaskDetailsUiState.Success(response.data)
                    _showCompleteConfirmation.value = false
                    return true
                }
                is ApiResponse.Error -> {
                    toastManager.show(response.message, state = WfmToastState.ERROR)
                    _showCompleteConfirmation.value = false  // Закрываем BottomSheet при ошибке, чтобы Toast был виден
                    loadTask()
                    return false
                }
            }
        } catch (e: Exception) {
            toastManager.show(e.message ?: "Ошибка при завершении задачи", state = WfmToastState.ERROR)
            _showCompleteConfirmation.value = false  // Закрываем BottomSheet при ошибке, чтобы Toast был виден
            loadTask()
            return false
        }
    }

    /**
     * Завершить задачу с фото (IN_PROGRESS → COMPLETED with photo)
     * @return true если задача успешно завершена, false если произошла ошибка
     */
    suspend fun completeTaskWithPhoto(imageUri: Uri, reportText: String? = null): Boolean {
        val currentTask = (uiState.value as? TaskDetailsUiState.Success)?.task
        analyticsService.track(
            AnalyticsEvent.TaskCompleteSubmitted(
                hasPhoto = true,
                hasText = !reportText.isNullOrBlank(),
                taskId = taskId,
                taskType = currentTask?.type?.name ?: "UNKNOWN",
                workType = currentTask?.workType?.name,
                timeStart = currentTask?.timeStart,
                timeEnd = currentTask?.timeEnd
            )
        )
        try {
            _uiState.value = TaskDetailsUiState.Processing

            // Сжимаем изображение для отправки
            val imageData = ImageCompression.compressImage(context, imageUri)

            if (imageData == null) {
                toastManager.show("Не удалось обработать изображение", state = WfmToastState.ERROR)
                _showCompleteConfirmation.value = false  // Закрываем BottomSheet при ошибке, чтобы Toast был виден
                loadTask()
                return false
            }

            val opIds = _selectedOperationIds.value.toList()
            val newOps = _newOperations.value.toList()

            when (val response = tasksService.completeTaskWithPhoto(taskId, imageData, reportText, opIds, newOps)) {
                is ApiResponse.Success -> {
                    clearSelectionPrefs()
                    _uiState.value = TaskDetailsUiState.Success(response.data)
                    _showCompleteConfirmation.value = false
                    return true
                }
                is ApiResponse.Error -> {
                    toastManager.show(response.message, state = WfmToastState.ERROR)
                    _showCompleteConfirmation.value = false  // Закрываем BottomSheet при ошибке, чтобы Toast был виден
                    loadTask()
                    return false
                }
            }
        } catch (e: Exception) {
            toastManager.show(e.message ?: "Ошибка при завершении задачи с фото", state = WfmToastState.ERROR)
            _showCompleteConfirmation.value = false  // Закрываем BottomSheet при ошибке, чтобы Toast был виден
            loadTask()
            return false
        }
    }
}

sealed class TaskDetailsUiState {
    data object Loading : TaskDetailsUiState()
    data object Processing : TaskDetailsUiState()
    data class Success(val task: Task) : TaskDetailsUiState()
    data class Error(val message: String) : TaskDetailsUiState()
}
