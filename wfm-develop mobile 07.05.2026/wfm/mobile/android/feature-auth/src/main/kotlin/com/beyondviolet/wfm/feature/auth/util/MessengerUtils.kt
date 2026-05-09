package com.beyondviolet.wfm.feature.auth.util

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Утилиты для открытия мессенджеров по URL
 */
object MessengerUtils {
    /**
     * Открывает мессенджер (Telegram или MAX) через deep link.
     * Определяет тип мессенджера по URL — если приложение установлено, открывает напрямую,
     * иначе открывает веб-версию.
     */
    fun openUrl(context: Context, url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))

        when {
            url.contains("t.me") || url.contains("telegram") -> {
                TelegramUtils.getInstalledTelegramPackage(context)?.let { intent.setPackage(it) }
            }
            url.contains("max.ru") -> {
                MaxUtils.getInstalledMaxPackage(context)?.let { intent.setPackage(it) }
            }
        }

        context.startActivity(intent)
    }
}
