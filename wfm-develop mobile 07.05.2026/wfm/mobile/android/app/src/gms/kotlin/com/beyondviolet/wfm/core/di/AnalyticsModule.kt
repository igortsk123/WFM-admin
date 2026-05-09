package com.beyondviolet.wfm.core.di

import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.analytics.CompositeAnalyticsService
import com.beyondviolet.wfm.core.analytics.FirebaseAnalyticsService
import com.beyondviolet.wfm.core.analytics.SemetricsAnalyticsService
import org.koin.android.ext.koin.androidContext
import org.koin.dsl.module

/**
 * Koin DI модуль для GMS флейвора.
 * Предоставляет Firebase Analytics + Semetrics.
 */
val analyticsModule = module {
    single<AnalyticsService> {
        CompositeAnalyticsService(
            listOf(
                FirebaseAnalyticsService(),
                SemetricsAnalyticsService(androidContext())
            )
        )
    }
}
