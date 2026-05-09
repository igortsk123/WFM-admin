package com.beyondviolet.wfm.core.analytics

/**
 * Заглушка аналитики — используется до подключения Firebase SDK.
 * Не отправляет никаких данных.
 */
class NoOpAnalyticsService : AnalyticsService {
    override fun track(event: AnalyticsEvent) = Unit
    override fun setUser(userId: Int, role: String) = Unit
    override fun resetUser() = Unit
}
