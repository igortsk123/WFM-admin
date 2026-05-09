package com.beyondviolet.wfm.di

import com.beyondviolet.wfm.core.push.PushService
import com.beyondviolet.wfm.notifications.HmsPushService
import org.koin.dsl.module

/**
 * Koin DI модуль для HMS флейвора.
 * Предоставляет HMS реализацию PushService.
 */
val pushModule = module {
    single<PushService> { HmsPushService() }
}
