package com.beyondviolet.wfm.notifications

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.beyondviolet.wfm.MainActivity
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.analytics.AnalyticsEvent
import com.beyondviolet.wfm.core.analytics.AnalyticsService
import com.beyondviolet.wfm.core.notifications.NotificationsApiService
import com.beyondviolet.wfm.core.push.PushConstants
import com.huawei.hms.push.HmsMessageService
import com.huawei.hms.push.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject

/**
 * Сервис для получения HMS push-уведомлений.
 *
 * Ответственности:
 * - onNewToken: регистрировать новый HMS-токен в svc_notifications
 * - onMessageReceived: показывать системное уведомление с deep link на задачу
 */
class WfmHmsMessagingService : HmsMessageService() {

    companion object {
        private const val TAG = "WfmHMSService"
        private const val PREFS_NAME = "wfm_hms"
        private const val KEY_HMS_TOKEN = "hms_token"

        fun getSavedToken(context: Context): String? =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_HMS_TOKEN, null)
    }

    private val notificationsApiService: NotificationsApiService by inject()
    private val analyticsService: AnalyticsService by inject()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * HMS-токен обновлён — сохраняем локально и пробуем зарегистрировать.
     * Если пользователь не авторизован — регистрация упадёт молча, но токен
     * сохранится и будет отправлен при входе в MainTabs.
     */
    override fun onNewToken(token: String) {
        Log.i(TAG, "Новый HMS токен получен")
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_HMS_TOKEN, token).apply()
        serviceScope.launch {
            notificationsApiService.registerDeviceToken(token)
        }
    }

    /**
     * Получено push-уведомление (data message).
     * Показываем системное уведомление с переходом на экран задачи.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.dataOfMap ?: return
        val title = data["title"] ?: return
        val body = data["body"] ?: return
        val taskId = data["task_id"]
        val notificationId = data["notification_id"]

        Log.i(TAG, "Push получен: $title (task_id=$taskId)")
        analyticsService.track(AnalyticsEvent.PushNotificationReceived(
            channel = "hms",
            notificationId = notificationId,
            taskId = taskId
        ))

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            if (taskId != null) putExtra(PushConstants.EXTRA_PUSH_TASK_ID, taskId)
            if (notificationId != null) putExtra(PushConstants.EXTRA_PUSH_NOTIFICATION_ID, notificationId)
            putExtra(PushConstants.EXTRA_PUSH_CHANNEL, "hms")
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, PushConstants.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
