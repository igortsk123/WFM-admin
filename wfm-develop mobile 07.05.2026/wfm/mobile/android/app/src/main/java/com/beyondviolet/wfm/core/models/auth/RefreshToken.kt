package com.beyondviolet.wfm.core.models.auth

import kotlinx.serialization.Serializable

/**
 * Модель запроса на обновление токена
 */
@Serializable
data class RefreshToken(
    val refresh_token: String
)
