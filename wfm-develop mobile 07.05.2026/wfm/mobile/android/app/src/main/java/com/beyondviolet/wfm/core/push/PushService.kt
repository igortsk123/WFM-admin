package com.beyondviolet.wfm.core.push

import android.content.Context

/**
 * Интерфейс для работы с push-уведомлениями.
 *
 * Абстракция над конкретным провайдером (Firebase, HMS).
 * Позволяет сменить провайдер без изменений в бизнес-логике.
 *
 * Реализации:
 * - FirebasePushService (GMS) — Firebase Cloud Messaging
 * - HmsPushService (HMS) — Huawei Push Kit
 */
interface PushService {
    /**
     * Получить текущий токен устройства.
     * Возвращает null если токен ещё не получен или произошла ошибка.
     */
    suspend fun getToken(): String?

    /**
     * Инициализация push-сервиса.
     * Вызывается в Application.onCreate().
     */
    fun initialize(context: Context)

    /**
     * Получить сохранённый токен из локального хранилища.
     * Используется для быстрой регистрации при входе без ожидания обновления токена.
     */
    fun getSavedToken(context: Context): String?
}
