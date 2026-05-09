package com.beyondviolet.wfm.feature.auth.data.remote

import kotlinx.serialization.Serializable

/**
 * Стандартный формат ответа Beyond Violet API
 */
@Serializable
data class BVResponse<T>(
    val status: BVStatus? = null,
    val data: T? = null
)

@Serializable
data class BVStatus(
    val code: String? = null,
    val message: String? = null
)

/**
 * Обертка для обработки ответов API
 */
sealed class ApiResponse<out T> {
    data class Success<T>(val data: T) : ApiResponse<T>()
    data class Error(val code: String, val message: String) : ApiResponse<Nothing>()
}
