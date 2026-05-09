package com.beyondviolet.wfm.core.crashlytics

/**
 * Фабрика для создания CrashlyticsService для GMS флейвора
 */
object CrashlyticsServiceFactory {
    fun create(context: android.content.Context): CrashlyticsService = FirebaseCrashlyticsService()
}
