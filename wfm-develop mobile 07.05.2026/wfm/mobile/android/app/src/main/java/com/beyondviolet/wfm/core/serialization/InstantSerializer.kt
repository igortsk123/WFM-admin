package com.beyondviolet.wfm.core.serialization

import kotlinx.datetime.Instant
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/**
 * Custom serializer for Instant that handles backend datetime format without timezone
 */
object InstantSerializer : KSerializer<Instant> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("Instant", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): Instant {
        val dateString = decoder.decodeString()
        // If the string doesn't end with Z, add it to make it valid ISO format
        val isoString = if (dateString.endsWith("Z") || dateString.contains("+")) {
            dateString
        } else {
            "${dateString}Z"
        }
        return Instant.parse(isoString)
    }

    override fun serialize(encoder: Encoder, value: Instant) {
        encoder.encodeString(value.toString())
    }
}
