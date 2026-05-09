# Push-уведомления (FCM)

FCM-уведомления используются как fallback при недоступности WebSocket (приложение в фоне или закрыто). Настройка Firebase выполняется один раз для iOS и Android.

**Связанные документы:**
- `.memory_bank/mobile/feature_notifications/notifications_websocket.md` — основной канал
- `.memory_bank/backend/services/svc_notifications.md` — стратегии доставки

---

## Firebase setup (разовая настройка)

**iOS:**
- Добавить `GoogleService-Info.plist` в Xcode-проект (Target → Build Phases)
- Подключить Firebase SDK через SPM: `FirebaseMessaging`
- В `AppDelegate`: вызвать `FirebaseApp.configure()` при запуске
- Запросить разрешение на уведомления через `UNUserNotificationCenter`
- Зарегистрировать `AppDelegate` как `UNUserNotificationCenterDelegate` и `MessagingDelegate`

**Android:**
- Добавить `google-services.json` в `app/`
- В `build.gradle.kts` (project): `classpath("com.google.gms:google-services:...")`
- В `build.gradle.kts` (app): `apply(plugin = "com.google.gms.google-services")` + `implementation("com.google.firebase:firebase-messaging")`
- Создать `WfmFirebaseMessagingService` : `FirebaseMessagingService`

## Управление FCM-токеном

При каждом запуске приложения (и при обновлении токена Firebase) — вызвать:
`POST /notifications/devices/tokens` с `{"platform": "IOS"/"ANDROID", "token": "..."}`

При логауте — вызвать:
`DELETE /notifications/devices/tokens/{token}`

**Файлы:**
- iOS: регистрация в `AppDelegate.messaging(_:didReceiveRegistrationToken:)`
- Android: регистрация в `WfmFirebaseMessagingService.onNewToken()`

## Обработка нажатия на пуш

При нажатии пользователем на push-уведомление — открыть нужный экран по полю `data.screen` или `data.task_id`.

**Deep link data из FCM:**
```json
{"task_id": "uuid", "screen": "task_detail"}
```

| category | Экран |
|----------|-------|
| `TASK_REVIEW` | TaskDetailScreen (для менеджера, с возможностью approve/reject) |
| `TASK_REJECTED` | TaskDetailScreen (для работника) |

**iOS:** обработать в `userNotificationCenter(_:didReceive:withCompletionHandler:)` → `AppRouter.navigateToTaskDetail(taskId:)`

**Android:** создать `PendingIntent` в `WfmFirebaseMessagingService.onMessageReceived()` → `Intent` с task_id для `MainActivity`, обработать в `onCreate` / `onNewIntent`

## Обработка входящего push (приложение открыто)

Если приложение активно — FCM push отображается как системное уведомление. WS должен быть активен и доставит сообщение раньше. Push в этом случае — дополнительная страховка.

**Android:** в `onMessageReceived` показать `NotificationManager.notify()` с RemoteViews или стандартным NotificationCompat.

**iOS:** в `userNotificationCenter(_:willPresent:withCompletionHandler:)` вернуть `.banner` — показывать баннер даже при открытом приложении.
