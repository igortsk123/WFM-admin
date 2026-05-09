package com.beyondviolet.wfm.feature.auth.domain.models

import kotlinx.serialization.Serializable

/**
 * Модель запроса на отправку SMS кода
 */
@Serializable
data class AuthPhone(
    val phone: String
)
