package com.beyondviolet.wfm.di

import com.beyondviolet.wfm.core.push.PushService
import com.beyondviolet.wfm.notifications.FirebasePushService
import org.koin.dsl.module

/**
 * Koin DI модуль для GMS флейвора.
 * Предоставляет Firebase реализацию PushService.
 */
val pushModule = module {
    single<PushService> { FirebasePushService() }
}
