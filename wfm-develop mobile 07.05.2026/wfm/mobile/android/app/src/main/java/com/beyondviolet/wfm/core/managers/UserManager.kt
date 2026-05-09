package com.beyondviolet.wfm.core.managers

import com.beyondviolet.wfm.core.models.Assignment
import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.UserMe
import com.beyondviolet.wfm.core.network.ApiResponse
import com.beyondviolet.wfm.core.network.ShiftsService
import com.beyondviolet.wfm.core.network.UserService
import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Менеджер для управления данными текущего пользователя
 *
 * Хранит состояние пользователя (роль, магазин, привилегии, профиль) и предоставляет методы для загрузки.
 * Используется для условной навигации и отображения UI в зависимости от роли.
 * Управляет выбранным assignment для работы с несколькими назначениями.
 */
class UserManager(
    private val userService: UserService,
    private val shiftsService: ShiftsService,
    private val tokenStorage: TokenStorage
) {
    private val _currentUser = MutableStateFlow<UserMe?>(null)
    val currentUser: StateFlow<UserMe?> = _currentUser.asStateFlow()

    private val _currentAssignment = MutableStateFlow<Assignment?>(null)
    val currentAssignment: StateFlow<Assignment?> = _currentAssignment.asStateFlow()

    private val _currentShift = MutableStateFlow<CurrentShift?>(null)
    val currentShift: StateFlow<CurrentShift?> = _currentShift.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    /**
     * Получить текущий выбранный assignment
     *
     * Логика выбора:
     * 1. Если есть сохраненный selectedAssignmentId - ищем его в списке
     * 2. Если не найден или не сохранен - берем первый assignment
     * 3. Если assignments пустой - возвращаем null
     */
    private suspend fun selectCurrentAssignment(user: UserMe): Assignment? {
        if (user.assignments.isEmpty()) {
            return null
        }

        // Проверяем сохраненный assignment ID
        val savedAssignmentId = tokenStorage.getSelectedAssignmentId()

        // Ищем сохраненный assignment в списке
        val selectedAssignment = if (savedAssignmentId != null) {
            user.assignments.find { it.id == savedAssignmentId }
        } else {
            null
        }

        // Если не найден - берем первый
        val assignment = selectedAssignment ?: user.assignments.first()

        // Сохраняем выбранный assignment ID
        tokenStorage.saveSelectedAssignmentId(assignment.id)

        return assignment
    }

    /**
     * Загрузить данные текущего пользователя и текущую смену
     *
     * Вызывается при старте приложения после авторизации.
     * Возвращает полную информацию: роль, магазин, привилегии + ФИО, email, телефон, фото
     * Также загружает текущую смену (если есть)
     *
     * Логика выбора assignment:
     * 1. Если есть сохраненный selectedAssignmentId - используем его
     * 2. Если не найден или не сохранен - берем первый assignment
     * 3. Если assignments пустой - возвращаем ошибку "Нет назначений"
     */
    suspend fun loadCurrentRole() {
        _isLoading.value = true
        _error.value = null

        try {
            // Загружаем данные пользователя
            when (val response = userService.getMe()) {
                is ApiResponse.Success -> {
                    val user = response.data

                    // Проверяем наличие assignments
                    if (user.assignments.isEmpty()) {
                        _error.value = "У вас нет назначений. Обратитесь к управляющему."
                        _currentUser.value = user
                        _isLoading.value = false
                        return
                    }

                    // Выбираем текущий assignment
                    val currentAssignment = selectCurrentAssignment(user)

                    if (currentAssignment == null) {
                        _error.value = "Не удалось определить текущее назначение"
                        _currentUser.value = user
                        _isLoading.value = false
                        return
                    }

                    _currentUser.value = user
                    _currentAssignment.value = currentAssignment
                    _error.value = null

                    val roleName = currentAssignment.position?.role?.name ?: "Роль не назначена"
                    android.util.Log.i("UserManager", "User data loaded: $roleName from assignment #${currentAssignment.id}")

                    // Загружаем текущую смену (не критично если не удалось)
                    try {
                        when (val shiftResponse = shiftsService.getCurrentShift(currentAssignment.id)) {
                            is ApiResponse.Success -> {
                                _currentShift.value = shiftResponse.data
                            }
                            is ApiResponse.Error -> {
                                android.util.Log.e("UserManager", "Shift load error: ${shiftResponse.code} — ${shiftResponse.message}")
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("UserManager", "Shift load exception", e)
                    }
                }
                is ApiResponse.Error -> {
                    _error.value = response.message
                }
            }
        } catch (e: Exception) {
            _error.value = e.message ?: "Неизвестная ошибка"
        } finally {
            _isLoading.value = false
        }
    }

    /**
     * Проверить, является ли текущий пользователь управляющим
     */
    fun isManager(): Boolean {
        return _currentAssignment.value?.position?.role?.code == "manager"
    }

    /**
     * Проверить, является ли текущий пользователь работником
     */
    fun isWorker(): Boolean {
        return _currentAssignment.value?.position?.role?.code == "worker"
    }

    /**
     * Очистить состояние пользователя (при logout)
     */
    suspend fun clear() {
        _currentUser.value = null
        _currentAssignment.value = null
        _currentShift.value = null
        _error.value = null
        _isLoading.value = false
        tokenStorage.clearSelectedAssignmentId()
    }

    /**
     * Обновить данные после изменений
     */
    suspend fun refresh() {
        loadCurrentRole()
    }

    /**
     * Переключить текущий assignment
     *
     * Сохраняет выбранный assignment ID и перезагружает данные пользователя и смену
     */
    suspend fun switchAssignment(assignmentId: Int) {
        tokenStorage.saveSelectedAssignmentId(assignmentId)
        loadCurrentRole()
    }

    /**
     * Получить текущий выбранный assignment
     */
    suspend fun getCurrentAssignment(): Assignment? {
        val user = _currentUser.value ?: return null
        val savedAssignmentId = tokenStorage.getSelectedAssignmentId() ?: return user.assignments.firstOrNull()
        return user.assignments.find { it.id == savedAssignmentId } ?: user.assignments.firstOrNull()
    }

    /**
     * Проверить и обновить текущую смену
     *
     * Загружает текущую смену через shiftsService и сохраняет в currentShift.
     * Не критично если смена не загружается — ошибка логируется, но не показывается пользователю.
     */
    suspend fun checkShiftStatus() {
        try {
            val assignmentId = getCurrentAssignment()?.id
            when (val response = shiftsService.getCurrentShift(assignmentId)) {
                is ApiResponse.Success -> {
                    _currentShift.value = response.data
                }
                is ApiResponse.Error -> {
                    android.util.Log.e("UserManager", "Shift check error: ${response.code} — ${response.message}")
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("UserManager", "Shift check exception", e)
        }
    }

    /**
     * Открыть смену
     *
     * При успехе обновляет currentShift и возвращает null.
     * При ошибке возвращает сообщение — обработка на стороне вызывающего кода.
     */
    suspend fun openShift(planId: Int): String? {
        return when (val response = shiftsService.openShift(planId = planId)) {
            is ApiResponse.Success -> { _currentShift.value = response.data; null }
            is ApiResponse.Error -> response.message
        }
    }

    /**
     * Результат закрытия смены
     */
    data class CloseShiftResult(
        val success: Boolean,
        val errorCode: String? = null,
        val errorMessage: String? = null
    )

    /**
     * Закрыть смену (установить closed_at)
     * @param force принудительное закрытие при наличии незавершённых задач
     * @return CloseShiftResult с кодом ошибки если есть
     */
    suspend fun closeShift(planId: Int, force: Boolean = false): CloseShiftResult {
        return when (val response = shiftsService.closeShift(planId = planId, force = force)) {
            is ApiResponse.Success -> {
                _currentShift.value = response.data
                CloseShiftResult(success = true)
            }
            is ApiResponse.Error -> CloseShiftResult(
                success = false,
                errorCode = response.code,
                errorMessage = response.message
            )
        }
    }
}
