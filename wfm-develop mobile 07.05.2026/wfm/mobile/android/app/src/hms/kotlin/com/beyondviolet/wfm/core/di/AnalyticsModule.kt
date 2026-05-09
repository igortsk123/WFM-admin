package com.beyondviolet.wfm.core.di

import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.analytics.AppMetricaAnalyticsService
import com.beyondviolet.wfm.core.analytics.AppMetricaManager
import com.beyondviolet.wfm.core.analytics.CompositeAnalyticsService
import com.beyondviolet.wfm.core.analytics.SemetricsAnalyticsService
import org.koin.android.ext.koin.androidContext
import org.koin.dsl.module

/**
 * Koin DI модуль для HMS флейвора.
 * AppMetrica (аналитика + крешлитика) + Semetrics.
 */
val analyticsModule = module {
    single<AnalyticsService> {
        AppMetricaManager.initialize(androidContext())
        CompositeAnalyticsService(
            listOf(
                AppMetricaAnalyticsService(),
                SemetricsAnalyticsService(androidContext())
            )
        )
    }
}
