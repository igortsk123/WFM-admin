# WebSocket Protocol — svc_monitoring → устройство

Устройство подключается к `svc_monitoring` как WebSocket-клиент. Сервер инициирует все значимые сообщения.

**Связанные документы:**
- `.memory_bank/backend/services/svc_monitoring.md` — описание сервиса
- `.memory_bank/backend/apis/api_monitoring.md` — полный контракт всех эндпоинтов

---

## Подключение

```
wss://wfm.beyondviolet.com/monitoring/api/events/ws?token=DEVICE_TOKEN     # prod
wss://dev.wfm.beyondviolet.com/monitoring/api/events/ws?token=DEVICE_TOKEN # dev
ws://localhost:8004/api/events/ws?token=DEVICE_TOKEN                       # local
```

- `token` — статичный токен, прошит в `secrets.h` (поле `WS_TOKEN`); должен совпадать с `DEVICE_TOKEN` в `.env` сервиса
- При неверном или пустом токене сервер закрывает соединение с кодом `4001`

После успешного подключения сервер **немедленно** шлёт `state` с текущим состоянием.

---

## Сообщения сервер → устройство

### `state` — полный снимок состояния

Отправляется:
- сразу при подключении устройства
- каждые `WS_BROADCAST_INTERVAL=30` секунд (регулярный цикл)

```json
{
  "type": "state",
  "ts": 1714000000,
  "server": "prod",
  "cpu": 23.5,
  "mem": 37.8,
  "disk": 22.2,
  "containers": {
    "postgres":          "healthy",
    "svc_tasks":         "healthy",
    "svc_users":         "healthy",
    "svc_notifications": "healthy"
  },
  "errors_1h": 3
}
```

**Порядок ключей в `containers` детерминированный** — задаётся кортежем `CRITICAL_CONTAINERS` в `backend/svc_monitoring/app/domain/schemas.py`. Устройство сохраняет порядок и рендерит контейнеры в нём же. Изменение порядка в кортеже автоматически меняет порядок отображения.

Возможные значения `containers[name]`:
- `"healthy"` — контейнер запущен и здоров
- `"starting"` — только что стартовал, healthcheck ещё не прошёл
- `"unhealthy"` — healthcheck падает
- `"stopped"` — контейнер остановлен / умер
- `"unknown"` — данных ещё не поступало

### `alert` — критическое событие

Отправляется немедленно при:
- остановке или смерти контейнера (`action: stop / die`)
- контейнер стал `unhealthy`
- спайке 5xx ошибок (порог: `ERROR_SPIKE_COUNT=5` за `ERROR_SPIKE_WINDOW_SEC=300`, cooldown `ERROR_ALERT_COOLDOWN_SEC=300`)

```json
{
  "type": "alert",
  "ts": 1714000000,
  "level": "critical",
  "kind": "container_down",
  "container": "svc_tasks",
  "message": "svc_tasks stop"
}
```

```json
{
  "type": "alert",
  "ts": 1714000000,
  "level": "warning",
  "kind": "api_errors",
  "count": 7,
  "message": "7 errors / 5 min"
}
```

Поле `level`: `"critical"` / `"warning"`
Поле `kind`: `"container_down"` / `"container_unhealthy"` / `"api_errors"`. Зарезервированы (не реализованы): `"high_cpu"`, `"high_mem"`.

### Keep-alive

Сервер закрывает соединение, если от устройства нет сообщений дольше `WS_PING_TIMEOUT=30` секунд — устройство переподключится. Сейчас прошивка не отправляет pong'и явно, но WebSockets-библиотека держит низкоуровневые ping/pong кадры — этого достаточно.

---

## Поведение устройства при потере соединения

| Ситуация | Действие |
|---|---|
| WS disconnect | Индикатор `STALE` и бейдж `NO SERVER Xm Ys` в хедере dashboard |
| WiFi недоступен | Попытка reconnect каждые 30 сек по списку сетей |
| Нет WS > 30 минут | Звуковой сигнал (pocket mode) |
| Reconnect успешен | Автоматически получает свежий `state` |
