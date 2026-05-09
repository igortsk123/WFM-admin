package com.beyondviolet.wfm.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Hint(
    val id: Int,
    val text: String,
    @SerialName("work_type_id") val workTypeId: Int? = null,
    @SerialName("zone_id") val zoneId: Int? = null
)

/** Обёртка ответа GET /tasks/hints → { "hints": [...] } */
@Serializable
data class HintsResponse(val hints: List<Hint>)

