package com.beyondviolet.wfm

import android.app.ActivityManager
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Process
import com.beyondviolet.wfm.core.di.analyticsModule
import com.beyondviolet.wfm.core.di.appModule
import com.beyondviolet.wfm.core.push.PushConstants
import com.beyondviolet.wfm.core.push.PushService
import com.beyondviolet.wfm.di.pushModule
import com.beyondviolet.wfm.feature.auth.di.authModule
import org.koin.android.ext.android.inject
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import ru.semetrics.sdk.Semetrics

/**
 * Application класс для инициализации Koin DI и системных каналов уведомлений
 */
class WFMApplication : Application() {

    // Inject PushService после инициализации Koin
    private val pushService: PushService by inject()

    override fun onCreate() {
        super.onCreate()

        // AppMetrica и другие SDK запускают дочерние процессы с тем же Application классом.
        // Полная инициализация нужна только в основном процессе.
        if (!isMainProcess()) return

        Semetrics.configure(
            context = this,
            apiKey = "sm_live_0925497d1bf44a9c8dd6b84288772648",
            endpoint = "https://semetrics.ru/events"
        )

        startKoin {
            androidLogger()
            androidContext(this@WFMApplication)
            modules(
                authModule,      // Модуль авторизации из feature-auth (загружается первым!)
                pushModule,      // Flavor-specific: GMS или HMS
                analyticsModule, // Flavor-specific: Firebase или HMS Analytics
                appModule
            )
        }

        // Инициализируем push-сервис (GMS или HMS в зависимости от флейвора)
        pushService.initialize(this)

        createNotificationChannel()
    }

    private fun isMainProcess(): Boolean {
        val pid = Process.myPid()
        val manager = getSystemService(ActivityManager::class.java)
        return manager?.runningAppProcesses
            ?.firstOrNull { it.pid == pid }
            ?.processName == packageName
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                PushConstants.CHANNEL_ID,
                PushConstants.CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Уведомления о задачах WFM"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
