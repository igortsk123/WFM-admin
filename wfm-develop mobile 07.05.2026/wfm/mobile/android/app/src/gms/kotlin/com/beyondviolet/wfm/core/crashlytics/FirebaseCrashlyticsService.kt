package com.beyondviolet.wfm.core.crashlytics

import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Реализация для GMS флейвора (с Firebase Crashlytics)
 */
class FirebaseCrashlyticsService : CrashlyticsService {
    private val crashlytics by lazy {
        try {
            FirebaseCrashlytics.getInstance()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Firebase Crashlytics", e)
            null
        }
    }

    override fun recordException(exception: Throwable) {
        crashlytics?.recordException(exception)
        Log.e(TAG, "Exception recorded", exception)
    }

    override fun log(message: String) {
        crashlytics?.log(message)
        Log.d(TAG, message)
    }

    override fun setUserId(userId: String) {
        crashlytics?.setUserId(userId)
        Log.d(TAG, "User ID set: $userId")
    }

    override fun setCustomKey(key: String, value: String) {
        crashlytics?.setCustomKey(key, value)
        Log.d(TAG, "Custom key set: $key = $value")
    }

    companion object {
        private const val TAG = "FirebaseCrashlytics"
    }
}
