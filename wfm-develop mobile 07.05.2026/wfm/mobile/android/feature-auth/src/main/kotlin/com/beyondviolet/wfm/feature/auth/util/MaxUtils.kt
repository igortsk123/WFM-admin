package com.beyondviolet.wfm.feature.auth.util

import android.content.Context

/**
 * Утилиты для работы с MAX мессенджером
 */
object MaxUtils {
    private const val MAX_PACKAGE = "ru.oneme.app"

    /**
     * Получить package name MAX мессенджера, если он установлен
     * @return package name или null если MAX не установлен
     */
    fun getInstalledMaxPackage(context: Context): String? {
        return try {
            context.packageManager.getPackageInfo(MAX_PACKAGE, 0)
            MAX_PACKAGE
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Создает deep link для MAX бота
     * Формат: max.ru/{bot_username}[?start={bot_start_payload}]
     */
    fun createMaxDeepLink(botUsername: String, botStartPayload: String? = null): String {
        var link = "https://max.ru/$botUsername"
        if (!botStartPayload.isNullOrEmpty()) {
            link += "?start=$botStartPayload"
        }
        return link
    }

    /**
     * Открывает MAX бота если пользователь не авторизован в боте.
     * Если botStartPayload пустой — пользователь уже авторизован, код придет через пуш.
     */
    fun openIfNeeded(context: Context, botUsername: String?, botStartPayload: String?) {
        if (botUsername.isNullOrEmpty() || botStartPayload.isNullOrEmpty()) return
        MessengerUtils.openUrl(context, createMaxDeepLink(botUsername, botStartPayload))
    }
}
