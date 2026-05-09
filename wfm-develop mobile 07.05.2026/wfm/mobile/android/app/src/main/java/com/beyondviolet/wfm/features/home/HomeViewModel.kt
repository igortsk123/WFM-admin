package com.beyondviolet.wfm.features.home

import androidx.compose.material3.Text
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.ShiftStatus
import com.beyondviolet.wfm.core.models.ShiftTimeCalculator
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskReviewState
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.features.home.components.ShiftCardState
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastState
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.toJavaInstant
import com.beyondviolet.wfm.core.models.formatCurrentDate

/**
 * Роль пользователя для Home экрана
 */
enum class HomeUserRole {
    WORKER,
    MANAGER
}

/**
 * ViewModel для экрана "Главная" (универсальный для worker и manager)
 */
class HomeViewModel(
    val role: HomeUserRole,
    private val userManager: UserManager,
    private val tasksService: TasksService?,
    private val toastManager: ToastManager,
    private val analyticsService: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    // Отдельный флаг для Pull-to-Refresh (не путать с первоначальной загрузкой)
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // Поля для менеджера
    private val _tasksForReview = MutableStateFlow<List<Task>>(emptyList())
    val tasksForReview: StateFlow<List<Task>> = _tasksForReview.asStateFlow()

    // Поля для работника
    private val _planTasks = MutableStateFlow<List<Task>>(emptyList())
    val planTasks: StateFlow<List<Task>> = _planTasks.asStateFlow()

    private val _isPlanTasksLoading = MutableStateFlow(false)
    val isPlanTasksLoading: StateFlow<Boolean> = _isPlanTasksLoading.asStateFlow()

    // Job для отмены конкурирующих запросов
    private var loadTasksForReviewJob: Job? = null
    private var loadPlanTasksJob: Job? = null

    // Флаг загрузки при открытии/закрытии смены
    private val _isShiftLoading = MutableStateFlow(false)
    val isShiftLoading: StateFlow<Boolean> = _isShiftLoading.asStateFlow()

    // Сообщение для CloseShiftBottomSheet при незавершённых задачах
    private val _closeShiftMessage = MutableStateFlow<String?>(null)
    val closeShiftMessage: StateFlow<String?> = _closeShiftMessage.asStateFlow()

    // Титул для CloseShiftBottomSheet
    private val _closeShiftTitle = MutableStateFlow<String?>(null)
    val closeShiftTitle: StateFlow<String?> = _closeShiftTitle.asStateFlow()

    // Флаг force для закрытия смены
    private val _closeShiftForce = MutableStateFlow(false)
    val closeShiftForce: StateFlow<Boolean> = _closeShiftForce.asStateFlow()

    // Флаг успешного закрытия смены (для автоматического закрытия BottomSheet)
    private val _shiftClosedSuccessfully = MutableStateFlow(false)
    val shiftClosedSuccessfully: StateFlow<Boolean> = _shiftClosedSuccessfully.asStateFlow()

    // Флаг успешного открытия смены (для переключения на таб Задачи)
    private val _shiftOpenedSuccessfully = MutableStateFlow(false)
    val shiftOpenedSuccessfully: StateFlow<Boolean> = _shiftOpenedSuccessfully.asStateFlow()

    // Прокидываем currentShift из UserManager, чтобы Compose реагировал на изменения
    val currentShift: StateFlow<CurrentShift?> = userManager.currentShift

    // Должность пользователя для бейджа на карточке смены
    val positionName: StateFlow<String?> = userManager.currentAssignment
        .map { it?.position?.name }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    // Название магазина из текущего назначения
    val storeName: StateFlow<String?> = userManager.currentAssignment
        .map { it?.storeName() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    // Тикер для живого пересчёта времени до начала смены / опоздания (раз в минуту)
    private val _now = MutableStateFlow(System.currentTimeMillis())

    // Реактивное состояние карточки смены — пересчитывается при изменении uiState, currentShift, времени и задач
    val shiftCardState: StateFlow<ShiftCardState> = combine(
        uiState,
        currentShift,
        _now,
        _planTasks,
        _isPlanTasksLoading
    ) { state, shift, now, tasks, loading ->
        computeShiftCardState(state, shift, now, tasks, loading)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ShiftCardState.Empty
    )

    // Текст статуса смены ("Начнется через X мин" / "Опаздываете на X мин")
    val shiftStatusText: StateFlow<String> = combine(
        uiState,
        currentShift,
        _now,
        _planTasks,
        _isPlanTasksLoading
    ) { state, shift, now, tasks, loading ->
        val cardState = computeShiftCardState(state, shift, now, tasks, loading)
        computeStatusText(cardState, shift, now)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ""
    )

    sealed class UiState {
        data object Loading : UiState()
        data object Success : UiState()
        data class Error(val message: String) : UiState()
    }

    fun onAppear() {
        // Аналитика в зависимости от роли
        when (role) {
            HomeUserRole.WORKER -> analyticsService.track(AnalyticsEvent.HomeViewed)
            HomeUserRole.MANAGER -> analyticsService.track(
                AnalyticsEvent.ManagerHomeViewed(tasksOnReviewCount = _tasksForReview.value.size)
            )
        }

        // Обновляем данные при каждом появлении экрана
        viewModelScope.launch {
            userManager.refresh()
            val error = userManager.error.value
            if (error != null && _uiState.value !is UiState.Success) {
                toastManager.show(error, state = WfmToastState.ERROR)
            } else if (error == null) {
                _uiState.value = UiState.Success

                // Загружаем задачи для карточки смены
                val assignmentId = userManager.currentShift.value?.assignmentId
                    ?: userManager.currentAssignment.value?.id
                if (assignmentId != null) {
                    loadPlanTasks(assignmentId)
                }
            }
        }
    }

    init {
        // Проверяем, есть ли уже данные в UserManager
        if (userManager.currentUser.value != null) {
            _uiState.value = UiState.Success

            // Загружаем задачи для карточки смены сразу
            val assignmentId = userManager.currentShift.value?.assignmentId
                ?: userManager.currentAssignment.value?.id
            if (assignmentId != null) {
                loadPlanTasks(assignmentId)
            }

            // Обновляем данные в фоне (смену и пользователя)
            viewModelScope.launch {
                userManager.refresh()
                val error = userManager.error.value
                if (error != null) {
                    toastManager.show(error, state = WfmToastState.ERROR)
                }
            }
        } else {
            loadInitial()
        }
        // Тикер: обновляем текущее время раз в минуту для динамического статуса смены
        viewModelScope.launch {
            while (true) {
                delay(60_000)
                _now.value = System.currentTimeMillis()
            }
        }
    }

    /**
     * Первоначальная загрузка при отсутствии данных в кеше.
     * Показывает UiState.Loading (полноэкранный индикатор).
     */
    private fun loadInitial() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            userManager.refresh()
            val error = userManager.error.value
            if (error != null) {
                toastManager.show(error, state = WfmToastState.ERROR)
                _uiState.value = UiState.Error(error)
            } else {
                _uiState.value = UiState.Success

                // Загружаем задачи для карточки смены
                val assignmentId = userManager.currentShift.value?.assignmentId
                    ?: userManager.currentAssignment.value?.id

                if (assignmentId != null) {
                    loadPlanTasks(assignmentId)
                }
            }
        }
    }

    /**
     * Принудительный refresh с сервера (Pull-to-Refresh).
     * Управляет isRefreshing — индикатором поверх контента.
     */
    fun loadUser() {
        viewModelScope.launch {
            _isRefreshing.value = true
            userManager.refresh()
            val error = userManager.error.value
            if (error != null) {
                // Есть данные — показываем тост, не меняем state
                toastManager.show(error, state = WfmToastState.ERROR)
            } else {
                _uiState.value = UiState.Success

                // Загружаем задачи для карточки смены
                val assignmentId = userManager.currentShift.value?.assignmentId
                    ?: userManager.currentAssignment.value?.id

                if (assignmentId != null) {
                    loadPlanTasks(assignmentId)
                }
            }
            _isRefreshing.value = false
        }
    }

    /**
     * Получить имя пользователя для приветствия
     */
    fun getGreetingName(): String {
        return userManager.currentUser.value?.firstName ?: "Пользователь"
    }

    /**
     * Получить отформатированную дату
     */
    fun getFormattedDate(): String {
        return formatCurrentDate()
    }

    /**
     * Получить URL фото пользователя
     */
    fun getPhotoUrl(): String? {
        return userManager.currentUser.value?.photoUrl
    }

    // MARK: - Shift Card

    private fun computeShiftCardState(
        state: UiState,
        shift: CurrentShift?,
        now: Long,
        tasks: List<Task>,
        loading: Boolean
    ): ShiftCardState {
        if (state is UiState.Error) return ShiftCardState.NoData
        if (shift == null) return ShiftCardState.NoData

        // Если смена NEW или OPENED, задачи загружены и список пустой → Empty
        if ((shift.status == ShiftStatus.CLOSED || shift.status == ShiftStatus.OPENED)
            && !loading
            && tasks.isEmpty()) {
            return ShiftCardState.Empty
        }

        return when (shift.status) {
            ShiftStatus.NEW -> if (ShiftTimeCalculator.isShiftLate(shift, now)) ShiftCardState.Delay else ShiftCardState.New
            ShiftStatus.OPENED -> ShiftCardState.InProgress
            ShiftStatus.CLOSED -> ShiftCardState.Done
        }
    }

    private fun computeStatusText(state: ShiftCardState, shift: CurrentShift?, now: Long): String {
        return when (state) {
            is ShiftCardState.New -> {
                val startMs = shift?.let { ShiftTimeCalculator.shiftStartMillis(it) } ?: return "Скоро начнется"
                val diffMin = ((startMs - now) / 60_000L).toInt().coerceAtLeast(0)
                ShiftTimeCalculator.formatMinutesUntil(diffMin)
            }
            is ShiftCardState.Delay -> {
                val startMs = shift?.let { ShiftTimeCalculator.shiftStartMillis(it) } ?: return "Вы опаздываете"
                val diffMin = ((now - startMs) / 60_000L).toInt().coerceAtLeast(0)
                ShiftTimeCalculator.formatMinutesLate(diffMin)
            }
            is ShiftCardState.InProgress -> {
                val endMs = shift?.let { ShiftTimeCalculator.shiftEndMillis(it) } ?: return ""
                val diffMin = ((endMs - now) / 60_000L).toInt().coerceAtLeast(0)
                ShiftTimeCalculator.formatMinutesLeft(diffMin)
            }
            is ShiftCardState.Done -> "Смена закрыта"
            else -> ""
        }
    }

    /**
     * Открыть или закрыть смену в зависимости от текущего статуса
     */
    fun openShift(force: Boolean = false) {
        val shift = currentShift.value ?: return
        viewModelScope.launch {
            _isShiftLoading.value = true
            when (shift.status) {
                ShiftStatus.NEW, ShiftStatus.CLOSED -> {
                    // Для NEW используем shift.id (это id плана), для CLOSED — shift.planId
                    val planId = if (shift.status == ShiftStatus.NEW) shift.id else (shift.planId ?: shift.id)
                    val error = userManager.openShift(planId = planId)
                    if (error != null) {
                        toastManager.show(error, state = WfmToastState.ERROR)
                    } else {
                        toastManager.show("Смена открыта")
                        _shiftOpenedSuccessfully.value = true
                        val openedShiftId = userManager.currentShift.value?.id ?: planId
                        val roleStr = if (role == HomeUserRole.WORKER) "worker" else "manager"
                        analyticsService.track(AnalyticsEvent.ShiftOpenCompleted(shiftId = openedShiftId, role = roleStr))
                    }
                }
                ShiftStatus.OPENED -> {
                    val planId = shift.planId ?: shift.id
                    val closedShiftId = shift.id
                    val result = userManager.closeShift(planId = planId, force = force)

                    if (!result.success) {
                        // Проверяем код ошибки - fallback если локальные данные не совпадают с серверными
                        when (result.errorCode) {
                            "TASKS_PAUSED" -> {
                                // На сервере есть задачи на паузе (локальные данные устарели)
                                _closeShiftTitle.value = "Закрыть смену?"
                                _closeShiftMessage.value = "У вас есть незавершённые задачи"
                                _closeShiftForce.value = true
                                // БШ остаётся открытым
                            }
                            "TASKS_IN_PROGRESS" -> {
                                // На сервере есть задача в работе (локальные данные устарели)
                                _closeShiftTitle.value = "Приостановить задачу и закрыть смену?"
                                _closeShiftMessage.value = null
                                _closeShiftForce.value = true
                                // БШ остаётся открытым
                            }
                            else -> {
                                // Другая ошибка - закрываем БШ и показываем Toast
                                _shiftClosedSuccessfully.value = true
                                toastManager.show(result.errorMessage ?: "Ошибка при закрытии смены", state = WfmToastState.ERROR)
                            }
                        }
                    } else {
                        _closeShiftMessage.value = null
                        _closeShiftTitle.value = null
                        _shiftClosedSuccessfully.value = true
                        toastManager.show("Смена закрыта")
                        val roleStr = if (role == HomeUserRole.WORKER) "worker" else "manager"
                        analyticsService.track(AnalyticsEvent.ShiftCloseCompleted(shiftId = closedShiftId, role = roleStr))
                        // Обновляем список задач после закрытия смены
                        loadPlanTasks(shift.assignmentId)
                    }
                }
            }
            _isShiftLoading.value = false
        }
    }

    /**
     * Подготовить данные для CloseShiftBottomSheet на основе локального списка задач
     */
    fun prepareCloseShiftBottomSheet() {
        // Проверяем есть ли задачи в работе
        val hasInProgress = _planTasks.value.any { it.state == com.beyondviolet.wfm.core.models.TaskState.IN_PROGRESS }
        // Проверяем есть ли задачи на паузе
        val hasPaused = _planTasks.value.any { it.state == com.beyondviolet.wfm.core.models.TaskState.PAUSED }

        when {
            hasInProgress -> {
                // Есть задача в работе → показываем БШ с предложением приостановить
                _closeShiftTitle.value = "Приостановить задачу и закрыть смену?"
                _closeShiftMessage.value = null
                _closeShiftForce.value = true
            }
            hasPaused -> {
                // Есть задачи на паузе → показываем БШ с предупреждением
                _closeShiftTitle.value = "Закрыть смену?"
                _closeShiftMessage.value = "У вас есть незавершённые задачи"
                _closeShiftForce.value = true
            }
            else -> {
                // Все задачи завершены или новые → обычный БШ
                _closeShiftTitle.value = "Закрыть смену?"
                _closeShiftMessage.value = null
                _closeShiftForce.value = false
            }
        }
    }

    /**
     * Очистить сообщение при закрытии смены (для dismiss BottomSheet)
     */
    fun clearCloseShiftMessage() {
        _closeShiftMessage.value = null
        _closeShiftTitle.value = null
        _closeShiftForce.value = false
    }

    /**
     * Сбросить флаг успешного закрытия смены
     */
    fun resetShiftClosedFlag() {
        _shiftClosedSuccessfully.value = false
    }

    /**
     * Сбросить флаг успешного открытия смены
     */
    fun resetShiftOpenedFlag() {
        _shiftOpenedSuccessfully.value = false
    }

    /**
     * Взять новую задачу
     */
    fun takeNewTask() {
        // TODO: Перейти к экрану списка задач
        println("Взять новую задачу...")
    }

    /**
     * Обновить данные
     */
    fun refreshData() {
        loadUser()
        // Обновляем задачи на проверку для менеджера
        if (role == HomeUserRole.MANAGER) {
            //loadTasksForReview() //ВРЕМЕННО
        }
    }

    // MARK: - Manager-specific Methods

    /**
     * Загрузить задачи на проверку (review_state = ON_REVIEW)
     * Только для менеджера
     */
    private fun loadTasksForReview() {
        if (role != HomeUserRole.MANAGER || tasksService == null) return

        // Отменяем предыдущую загрузку если она еще активна
        loadTasksForReviewJob?.cancel()

        loadTasksForReviewJob = viewModelScope.launch {
            val assignmentId = userManager.getCurrentAssignment()?.id ?: return@launch
            tasksService.getTasksList(assignmentId = assignmentId, reviewState = TaskReviewState.ON_REVIEW).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        // Берем последние 4 задачи для отображения
                        _tasksForReview.value = response.data.takeLast(4)
                    }
                    is ApiResponse.Error -> {
                        // Оставляем пустой список только если кэша не было
                        if (_tasksForReview.value.isEmpty()) {
                            _tasksForReview.value = emptyList()
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

    // MARK: - Worker-specific Methods

    /**
     * Загрузить задачи для карточки смены (первые 6)
     */
    private fun loadPlanTasks(assignmentId: Int) {
        if (tasksService == null) return

        // Отменяем предыдущую загрузку если она еще активна
        loadPlanTasksJob?.cancel()

        _isPlanTasksLoading.value = true

        loadPlanTasksJob = viewModelScope.launch {
            tasksService.getMyTasks(assignmentId = assignmentId).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        // Берем первые 6 задач для отображения
                        _planTasks.value = response.data.take(6)
                        _isPlanTasksLoading.value = false
                    }
                    is ApiResponse.Error -> {
                        _isPlanTasksLoading.value = false

                        // Оставляем пустой список только если кэша не было
                        if (_planTasks.value.isEmpty()) {
                            _planTasks.value = emptyList()
                            //toastManager.show(response.message, state = WfmToastState.ERROR)
                        } else {
                            // Кэш был показан, но свежие данные не загрузились
                            if (response.shouldShowToUser()) {
                                //toastManager.show(response.message, state = WfmToastState.ERROR)
                            }
                        }
                    }
                }
            }
        }
    }
}
