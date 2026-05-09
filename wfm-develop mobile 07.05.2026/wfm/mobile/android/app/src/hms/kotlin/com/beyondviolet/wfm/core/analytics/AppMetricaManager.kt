package com.beyondviolet.wfm.core.analytics

import android.content.Context
import com.beyondviolet.wfm.BuildConfig
import io.appmetrica.analytics.AppMetrica
import io.appmetrica.analytics.AppMetricaConfig

object AppMetricaManager {
    fun initialize(context: Context) {
        val config = AppMetricaConfig.newConfigBuilder(BuildConfig.APPMETRICA_KEY)
            .withCrashReporting(true)
            .build()
        AppMetrica.activate(context.applicationContext, config)
    }
}
