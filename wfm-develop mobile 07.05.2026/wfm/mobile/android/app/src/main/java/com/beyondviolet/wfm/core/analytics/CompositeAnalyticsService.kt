package com.beyondviolet.wfm.core.analytics

/**
 * Fan-out аналитика: делегирует события всем подключённым сервисам.
 */
class CompositeAnalyticsService(private val services: List<AnalyticsService>) : AnalyticsService {

    override fun track(event: AnalyticsEvent) = services.forEach { it.track(event) }

    override fun setUser(userId: Int, role: String) = services.forEach { it.setUser(userId, role) }

    override fun resetUser() = services.forEach { it.resetUser() }
}
