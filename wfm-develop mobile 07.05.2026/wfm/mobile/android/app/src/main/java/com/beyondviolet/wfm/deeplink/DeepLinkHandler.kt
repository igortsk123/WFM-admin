package com.beyondviolet.wfm.deeplink

import android.net.Uri

/**
 * Обработчик deep link для авторизации
 */
object DeepLinkHandler {

    /**
     * Извлечь код авторизации из deep link
     * Формат: wfm://auth/code_reciver/{code}/
     *
     * @param uri Deep link URI
     * @return 4-значный код или null если формат неверный
     */
    fun extractAuthCode(uri: Uri?): String? {
        if (uri == null) return null

        // Проверяем scheme и host
        if (uri.scheme != "wfm" || uri.host != "auth") return null

        // Получаем path segments: ["code_reciver", "1234"]
        val pathSegments = uri.pathSegments
        if (pathSegments.size < 2 || pathSegments[0] != "code_reciver") return null

        val code = pathSegments[1]

        // Валидация: только 4 цифры
        if (code.length != 4 || !code.all { it.isDigit() }) return null

        return code
    }
}
