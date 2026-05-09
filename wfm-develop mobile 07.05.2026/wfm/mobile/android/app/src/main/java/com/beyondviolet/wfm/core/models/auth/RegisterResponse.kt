package com.beyondviolet.wfm.core.models.auth

import kotlinx.serialization.Serializable

/**
 * Модель ответа при успешной регистрации
 */
@Serializable
data class RegisterResponse(
    val id: Long,
    val device_secret: String,
    val oauth: TokenData
)
