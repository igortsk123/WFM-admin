package com.beyondviolet.wfm.feature.auth.util

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Утилиты для работы с телефонными звонками
 */
object PhoneUtils {
    /**
     * Открывает стандартный экран звонка с заданным номером
     */
    fun call(context: Context, phoneNumber: String) {
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneNumber"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}
