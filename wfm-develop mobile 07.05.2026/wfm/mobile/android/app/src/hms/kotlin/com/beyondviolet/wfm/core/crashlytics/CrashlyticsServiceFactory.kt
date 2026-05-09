package com.beyondviolet.wfm.core.crashlytics

import android.content.Context
import com.beyondviolet.wfm.core.analytics.AppMetricaManager

/**
 * Фабрика для создания CrashlyticsService для HMS флейвора.
 * Использует AppMetrica (автоматически перехватывает фатальные крешы).
 */
object CrashlyticsServiceFactory {
    fun create(context: Context): CrashlyticsService {
        AppMetricaManager.initialize(context)
        return AppMetricaCrashlyticsService()
    }
}
