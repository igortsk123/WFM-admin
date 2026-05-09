package com.beyondviolet.wfm.feature.auth.util

import android.content.Context

/**
 * Утилиты для работы с Telegram
 */
object TelegramUtils {
    // Список возможных пакетов Telegram
    private val TELEGRAM_PACKAGES = listOf(
        "org.telegram.messenger",      // Telegram
        "org.telegram.messenger.web",  // Telegram X
        "org.thunderdog.challegram"    // Challegram (неофициальный клиент)
    )

    /**
     * Получить package name первого установленного Telegram клиента
     * @return package name или null если ни один клиент не установлен
     */
    fun getInstalledTelegramPackage(context: Context): String? {
        val packageManager = context.packageManager
        for (packageName in TELEGRAM_PACKAGES) {
            try {
                packageManager.getPackageInfo(packageName, 0)
                return packageName
            } catch (e: Exception) {
                // Пакет не установлен, проверяем следующий
            }
        }
        return null
    }

    /**
     * Создает deep link для Telegram бота
     * Формат: t.me/{bot_username}[?start={bot_start_payload}]
     */
    fun createTelegramDeepLink(botUsername: String, botStartPayload: String? = null): String {
        var link = "https://t.me/$botUsername"
        if (!botStartPayload.isNullOrEmpty()) {
            link += "?start=$botStartPayload"
        }
        return link
    }

    /**
     * Открывает Telegram бота если пользователь не авторизован в боте.
     * Если botStartPayload пустой — пользователь уже авторизован, код придет через пуш.
     */
    fun openIfNeeded(context: Context, botUsername: String?, botStartPayload: String?) {
        if (botUsername.isNullOrEmpty() || botStartPayload.isNullOrEmpty()) return
        MessengerUtils.openUrl(context, createTelegramDeepLink(botUsername, botStartPayload))
    }
}
