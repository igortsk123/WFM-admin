package com.beyondviolet.wfm.core.utils

import android.content.Context
import android.content.pm.PackageManager

object AppUtils {
    /**
     * Проверяет, установлено ли приложение
     */
    fun isAppInstalled(context: Context, packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }
}
