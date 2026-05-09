package com.beyondviolet.wfm.core.crashlytics

import android.util.Log

/**
 * Helper для тестирования Firebase Crashlytics
 *
 * Использование:
 * ```kotlin
 * val crashlytics: CrashlyticsService = get()
 * CrashlyticsTestHelper.testCrashlytics(crashlytics)
 * ```
 */
object CrashlyticsTestHelper {

    private const val TAG = "CrashlyticsTest"

    /**
     * Тест нефатальной ошибки
     */
    fun testNonFatalError(crashlytics: CrashlyticsService) {
        Log.d(TAG, "🧪 Testing non-fatal error...")

        val testException = RuntimeException("Test exception from CrashlyticsTestHelper")
        crashlytics.recordException(testException)

        Log.d(TAG, "✅ Non-fatal error logged")
    }

    /**
     * Тест кастомных логов
     */
    fun testCustomLogs(crashlytics: CrashlyticsService) {
        Log.d(TAG, "🧪 Testing custom logs...")

        crashlytics.log("Test log message 1")
        crashlytics.log("Test log message 2")
        crashlytics.log("Test log message 3")

        Log.d(TAG, "✅ Custom logs sent")
    }

    /**
     * Тест установки пользовательских данных
     */
    fun testUserData(crashlytics: CrashlyticsService) {
        Log.d(TAG, "🧪 Testing user data...")

        crashlytics.setUserId("test_user_123")
        crashlytics.setCustomKey("test_key", "test_value")
        crashlytics.setCustomKey("flavor", com.beyondviolet.wfm.BuildConfig.FLAVOR)
        crashlytics.setCustomKey("version", com.beyondviolet.wfm.BuildConfig.VERSION_NAME)

        Log.d(TAG, "✅ User data set")
    }

    /**
     * Запустить все тесты
     */
    fun runAllTests(crashlytics: CrashlyticsService) {
        Log.d(TAG, "🚀 Starting Crashlytics tests...")

        testUserData(crashlytics)
        testCustomLogs(crashlytics)
        testNonFatalError(crashlytics)

        Log.d(TAG, "✅ All tests completed")
        Log.d(TAG, "📊 Check Firebase Console → Crashlytics in 5-10 minutes")
    }

    /**
     * Тест фатального креша (осторожно!)
     *
     * ⚠️ Это завершит приложение! Используй только для тестирования.
     */
    fun testFatalCrash() {
        Log.w(TAG, "⚠️  Triggering fatal crash in 3 seconds...")
        Thread.sleep(3000)
        throw RuntimeException("TEST FATAL CRASH - This is intentional for Crashlytics testing")
    }
}
