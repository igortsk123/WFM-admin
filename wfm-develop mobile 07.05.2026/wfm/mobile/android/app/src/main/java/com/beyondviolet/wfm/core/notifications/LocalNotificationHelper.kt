package com.beyondviolet.wfm.core.notifications

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.beyondviolet.wfm.MainActivity
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.push.PushConstants

/**
 * Показать локальное системное уведомление на основе WS-уведомления.
 *
 * Используется когда приложение получило уведомление через WebSocket
 * и нужно показать его в системном трее (аналог FCM push, но через WS-канал).
 */
fun showLocalNotification(context: Context, notification: WsNotification) {
    val taskId = notification.data["task_id"]

    val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        if (taskId != null) putExtra(PushConstants.EXTRA_PUSH_TASK_ID, taskId)
        putExtra(PushConstants.EXTRA_PUSH_NOTIFICATION_ID, notification.notificationId)
        putExtra(PushConstants.EXTRA_PUSH_CHANNEL, "websocket")
    }
    val pendingIntent = PendingIntent.getActivity(
        context,
        notification.notificationId.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val built = NotificationCompat.Builder(context, PushConstants.CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(notification.title)
        .setContentText(notification.body)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setAutoCancel(true)
        .setContentIntent(pendingIntent)
        .build()

    NotificationManagerCompat.from(context).notify(notification.notificationId.hashCode(), built)
}
