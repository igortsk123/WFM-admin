package com.beyondviolet.wfm.feature.auth.domain.models

import kotlinx.serialization.Serializable

/**
 * Модель ответа сервера при отправке SMS кода
 * channel: "telegram" | "sms" | "call"
 */
@Serializable
data class CodeSentResponse(
    val channel: String?,
    val expires_at: Double?,
    val bot_username: String? = null,      // Для telegram: имя бота (например "wellchoice_bot")
    val bot_start_payload: String? = null  // Для telegram: payload для deep-link
)
