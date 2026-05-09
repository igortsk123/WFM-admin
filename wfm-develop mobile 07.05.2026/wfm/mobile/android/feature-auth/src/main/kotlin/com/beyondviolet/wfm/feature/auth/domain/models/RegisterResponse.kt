package com.beyondviolet.wfm.feature.auth.domain.models

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
