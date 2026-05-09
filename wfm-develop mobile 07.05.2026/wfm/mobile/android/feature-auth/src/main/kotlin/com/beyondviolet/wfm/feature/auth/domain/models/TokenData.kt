package com.beyondviolet.wfm.feature.auth.domain.models

import kotlinx.serialization.Serializable

/**
 * Модель данных токенов от BeyondViolet OAuth API
 */
@Serializable
data class TokenData(
    val access_token: String,
    val token_type: String? = null,
    val expires_in: Long,
    val refresh_token: String
)
