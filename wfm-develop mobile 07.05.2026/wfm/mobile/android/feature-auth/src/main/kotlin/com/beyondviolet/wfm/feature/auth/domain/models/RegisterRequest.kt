package com.beyondviolet.wfm.feature.auth.domain.models

import kotlinx.serialization.Serializable

/**
 * Модель запроса на регистрацию нового пользователя
 * POST https://shopping.beyondviolet.com/api/account/register/
 */
@Serializable
data class RegisterRequest(
    val app_id: String,
    val phone: String,
    val code: String,
    val first_name: String,
    val last_name: String,
    val gender: String,         // "male" или "female"
    val city_id: Int = 1,       // Временно всегда 1
    val birth_date: String,     // Формат: "YYYY-MM-DD"
    val device_name: String     // Формат: "{Manufacturer} {Model} SDK:{ApiLevel}"
)
