package com.beyondviolet.wfm.feature.auth.domain.models

import kotlinx.serialization.Serializable

/**
 * Модель запроса на обновление токена
 */
@Serializable
data class RefreshToken(
    val refresh_token: String
)
