package com.beyondviolet.wfm.core.crashlytics

/**
 * Сервис для логирования ошибок в Firebase Crashlytics
 *
 * Автоматически определяет доступность Crashlytics по build flavor.
 * Для GMS флейвора логирует в Firebase Crashlytics.
 * Для HMS флейвора логирует только в Logcat.
 */
interface CrashlyticsService {
    /**
     * Залогировать нефатальную ошибку
     */
    fun recordException(exception: Throwable)

    /**
     * Залогировать кастомное сообщение
     */
    fun log(message: String)

    /**
     * Установить user ID для отслеживания
     */
    fun setUserId(userId: String)

    /**
     * Установить кастомный ключ
     */
    fun setCustomKey(key: String, value: String)
}
