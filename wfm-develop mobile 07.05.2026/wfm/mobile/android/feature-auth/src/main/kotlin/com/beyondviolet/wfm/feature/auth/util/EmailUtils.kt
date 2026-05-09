package com.beyondviolet.wfm.feature.auth.util

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Утилиты для работы с почтой
 */
object EmailUtils {
    /**
     * Открывает почтовый клиент с заполненным адресатом
     */
    fun compose(context: Context, address: String) {
        val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$address"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}
