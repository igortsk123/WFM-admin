package com.beyondviolet.wfm

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.push.PushConstants
import com.beyondviolet.wfm.deeplink.DeepLinkHandler
import com.beyondviolet.wfm.deeplink.PushDeepLink
import com.beyondviolet.wfm.feature.auth.deeplink.DeepLinkEvent
import com.beyondviolet.wfm.navigation.AppNavigation
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.components.WfmToastHost
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject
import org.koin.compose.KoinContext
import org.koin.compose.koinInject

/**
 * MainActivity наследуется от FragmentActivity для поддержки hCaptcha SDK
 * FragmentActivity совместим с Jetpack Compose через androidx.activity:activity-compose
 */
class MainActivity : FragmentActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private val analyticsService: AnalyticsService by inject()

    override fun onCreate(savedInstanceState: Bundle?) {
        // Переключаемся с темы Splash на основную тему перед созданием активити
        setTheme(R.style.Theme_WFMApp)

        super.onCreate(savedInstanceState)

        // НЕ вызываем setupSystemBars() здесь - это сделает AppNavigation после splash

        // Запрашиваем разрешение на уведомления (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    0
                )
            }
        }

        // Обработка deep link при cold start
        handleDeepLink(intent)
        handlePushDeepLink(intent)

        setContent {
            KoinContext {
                WFMAppTheme {
                    val toastManager: ToastManager = koinInject()
                    Box(modifier = Modifier.fillMaxSize()) {
                        AppNavigation(
                            onSplashFinished = ::setupSystemBars
                        )
                        WfmToastHost(
                            toastManager = toastManager,
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .navigationBarsPadding() // над системным nav bar
                                .padding(bottom = 80.dp) // над таб-баром (M3 NavigationBar = 80dp)
                        )
                    }
                }
            }
        }
    }

    /**
     * Настройка цветов системных баров (status bar и navigation bar)
     * в зависимости от текущей темы приложения
     */
    private fun setupSystemBars() {
        val isDarkTheme = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES

        // Status bar: прозрачный — каждый экран сам задаёт background + statusBarsPadding().
        // Navigation bar: белый для TabBar экранов (по умолчанию).
        // Полноэкранные модальные экраны (AssignmentsListScreen)
        // меняют цвет через DisposableEffect на surfaceBase (#F5F5FC).
        val lightNavScrim = android.graphics.Color.WHITE                 // tabBarBg light = white
        val darkNavScrim = android.graphics.Color.parseColor("#373742")  // tabBarBg dark = Neutral900

        enableEdgeToEdge(
            statusBarStyle = if (isDarkTheme) {
                SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
            } else {
                SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
            },
            navigationBarStyle = if (isDarkTheme) {
                SystemBarStyle.dark(darkNavScrim)
            } else {
                SystemBarStyle.light(lightNavScrim, lightNavScrim)
            }
        )
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Обработка deep link при warm start (приложение уже запущено)
        handleDeepLink(intent)
        handlePushDeepLink(intent)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // Переприменяем цвета системных баров при изменении конфигурации (поворот экрана, смена темы)
        setupSystemBars()
    }

    /**
     * Обработать push deep link — передать task_id в навигацию
     */
    private fun handlePushDeepLink(intent: Intent?) {
        val taskId = intent?.getStringExtra(PushConstants.EXTRA_PUSH_TASK_ID) ?: return
        val notificationId = intent.getStringExtra(PushConstants.EXTRA_PUSH_NOTIFICATION_ID)
        val channel = intent.getStringExtra(PushConstants.EXTRA_PUSH_CHANNEL) ?: "fcm"
        analyticsService.track(AnalyticsEvent.PushNotificationTapped(
            channel = channel,
            notificationId = notificationId,
            taskId = taskId
        ))
        lifecycleScope.launch {
            PushDeepLink.emitTaskId(taskId)
        }
    }

    /**
     * Обработать deep link и передать код авторизации
     */
    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        Log.d(TAG, "Received deep link: $uri")

        val code = DeepLinkHandler.extractAuthCode(uri)
        if (code != null) {
            Log.d(TAG, "Extracted auth code from deep link: $code")
            lifecycleScope.launch {
                DeepLinkEvent.emitAuthCode(code)
            }
        }
    }
}
