package com.beyondviolet.wfm.core.notifications

/**
 * Входящее уведомление, полученное по WebSocket от svc_notifications
 */
data class WsNotification(
    val notificationId: String,
    val category: String,       // TASK_REVIEW | TASK_REJECTED | TASK_STATE_CHANGED
    val title: String,
    val body: String,
    val data: Map<String, String>,  // task_id, worker_id, new_state и т.д.
    val visibility: String          // USER | SYSTEM
)
