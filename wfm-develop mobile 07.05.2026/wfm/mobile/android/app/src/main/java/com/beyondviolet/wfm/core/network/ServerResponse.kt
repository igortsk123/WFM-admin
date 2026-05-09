package com.beyondviolet.wfm.core.network

import kotlinx.serialization.Serializable

/**
 * Стандартный формат ответа сервера
 */
@Serializable
data class ServerResponse<T>(
    val status: Status? = null,
    val data: T? = null
)

@Serializable
data class Status(
    val code: String? = null,
    val message: String? = null
)

/**
 * Обертка для обработки ответов API
 */
sealed class ApiResponse<out T> {
    /**
     * Успешный ответ
     * @param data данные ответа
     * @param isCached true если данные из кэша, false если свежие с сервера
     */
    data class Success<T>(val data: T, val isCached: Boolean = false) : ApiResponse<T>()

    data class Error(val code: String, val message: String) : ApiResponse<Nothing>() {
        /**
         * Извлечь UUID активной задачи из сообщения CONFLICT
         *
         * Парсит сообщение вида "У сотрудника уже есть активная задача: 2715499b-d174-43ab-a8c4-ffc078f02f3d"
         * и возвращает UUID активной задачи
         */
        val activeTaskId: String?
            get() {
                if (code != "CONFLICT") return null

                // Ищем UUID в формате "активная задача: {uuid}"
                val regex = """[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}""".toRegex()
                return regex.find(message)?.value
            }

        /**
         * Проверить является ли ошибка сетевой (не показываем пользователю при наличии кэша)
         * Сетевые ошибки: timeout, UnknownHost, connection errors
         */
        fun isNetworkError(): Boolean {
            return when {
                // Таймауты
                message.contains("timeout", ignoreCase = true) -> true
                message.contains("timed out", ignoreCase = true) -> true

                // DNS и connectivity
                message.contains("UnknownHost", ignoreCase = true) -> true
                message.contains("No address associated with hostname", ignoreCase = true) -> true
                message.contains("Unable to resolve host", ignoreCase = true) -> true

                // Connection errors
                message.contains("Connection refused", ignoreCase = true) -> true
                message.contains("Connection reset", ignoreCase = true) -> true
                message.contains("Network is unreachable", ignoreCase = true) -> true
                message.contains("No route to host", ignoreCase = true) -> true

                // SSL/TLS errors (возможно сетевые проблемы)
                message.contains("SSL", ignoreCase = true) && message.contains("handshake", ignoreCase = true) -> true

                else -> false
            }
        }

        /**
         * Проверить нужно ли показывать эту ошибку пользователю
         * Возвращает true если это критичная ошибка (не сетевая)
         */
        fun shouldShowToUser(): Boolean = !isNetworkError()
    }
}

/**
 * Вспомогательная структура для парсинга только status без data
 */
@Serializable
data class StatusOnly(val status: Status? = null)

/**
 * Исключение для случаев неавторизованного доступа
 */
class UnauthorizedException(message: String = "User is not authorized") : Exception(message)
