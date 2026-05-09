package com.beyondviolet.wfm.feature.auth.domain.models

import kotlinx.serialization.Serializable

/**
 * Модель подтверждения SMS кода
 */
@Serializable
data class AuthCode(
    val phone: String,
    val code: String
)
