package com.beyondviolet.wfm.core.crashlytics

import io.appmetrica.analytics.AppMetrica
import io.appmetrica.analytics.profile.Attribute
import io.appmetrica.analytics.profile.UserProfile

/**
 * Реализация крешлитики через Yandex AppMetrica для HMS флейвора.
 * Фатальные крешы перехватываются автоматически (withCrashReporting = true).
 */
class AppMetricaCrashlyticsService : CrashlyticsService {

    override fun recordException(exception: Throwable) {
        AppMetrica.reportError(exception.javaClass.simpleName, exception.message, exception)
    }

    override fun log(message: String) {
        // AppMetrica автоматически собирает контекст; явные breadcrumbs не поддерживаются
    }

    override fun setUserId(userId: String) {
        AppMetrica.setUserProfileID(userId)
    }

    override fun setCustomKey(key: String, value: String) {
        val profile = UserProfile.newBuilder()
            .apply(Attribute.customString(key).withValue(value))
            .build()
        AppMetrica.reportUserProfile(profile)
    }
}
