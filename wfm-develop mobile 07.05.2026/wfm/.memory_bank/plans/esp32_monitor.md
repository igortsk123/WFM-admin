# План: ESP32 Monitor — физический монитор сервера WFM

**Статус:** В работе
**Создан:** 2026-04-24
**Последнее обновление:** 2026-04-28 (rev 3 — миграция в WFM, серверная часть переехала в svc_monitoring)

---

## Цель

Физическое устройство на ESP32-S3, которое в реальном времени отображает состояние сервера WFM: метрики CPU/RAM/диска, состояние критических контейнеров и счётчик 5xx-ошибок за час. Устройство держит постоянное WebSocket-соединение с `svc_monitoring`. При потере связи дольше 30 минут — звуковой сигнал.

**Связанные документы:**
- `.memory_bank/backend/services/svc_monitoring.md` — серверная сторона
- `.memory_bank/backend/apis/api_monitoring.md` — контракты эндпоинтов
- `.memory_bank/device/README.md` — спецификации, протокол, дизайн
- `.memory_bank/plans/svc_monitoring_v2.md` — план эволюции сервиса (зависимость; реализован)
- `.memory_bank/plans/firmware_migration_from_semetrics.md` — план физического переноса прошивки/документации в WFM (реализован)

**Зависимости:**
- Серверная часть (`svc_monitoring v2`) должна быть выкачена на сервер с заданным `DEVICE_TOKEN` — иначе устройство получит `4001` при подключении.

---

## История

### Серверная часть — переехала в svc_monitoring

Изначально планировался отдельный сервис `svc_watch` в репозитории Semetrics, который читал бы события из Postgres и пушил их устройству. **Реализация изменена:** `svc_monitoring` сам владеет источниками данных (psutil + docker.sock + ошибки от WFM-сервисов), держит in-memory snapshot и отдаёт его прямо устройству через `WSS /api/events/ws`. Это убирает круговое путешествие данных через БД и второй сервис.

Подробности: `.memory_bank/plans/svc_monitoring_v2.md` (реализован 2026-04-28).

### Прошивка — итерации устройств

| Этап | Устройство | Статус | Артефакт |
|---|---|---|---|
| Тест-1 | ST7789 240×240 | заменено | — |
| Тест-2 | Guition JC4827W543N (480×272, NV3041A, QSPI) | **активно** | `.memory_bank/completed_plans/esp32_jc4827w543n_port.md` |
| Целевое | Waveshare ESP32-S3-Touch-AMOLED-2.16 (480×480, CO5300) | ожидается | задача 2 ниже |

Прошивка: `backend/svc_monitoring/firmware/` (PlatformIO + Arduino + Arduino_GFX, перенесена из Semetrics 2026-04-28 — см. план `firmware_migration_from_semetrics.md`).

Реализованные части прошивки:
- WiFiMulti с несколькими сетями + сканер открытых сетей (pocket mode)
- WebSocket-клиент, парсинг JSON через ArduinoJson, обработка `state` и `alert`
- Reconnect-логика, alarm task (30 мин без WS → buzzer)
- Единый dashboard-экран по handoff-референсу: header + metrics + containers + errors pill
- Pan-режим для 480×272 (viewport переключается top↔bottom каждые 5 сек, хедер дублируется)

---

## Открытые задачи

### 1. Тестирование с svc_monitoring v2 на DEV

- [ ] На DEV-сервере прописать `MONITORING_DEVICE_TOKEN` в `.env`, перезапустить `svc_monitoring`
- [ ] Прошить устройство с актуальным `secrets.h` (`WS_HOST=dev.wfm.beyondviolet.com`, `WS_PATH=/monitoring/api/events/ws`, `WS_TOKEN` совпадает с `DEVICE_TOKEN`)
- [ ] Убедиться, что дашборд оживает: метрики обновляются, контейнеры зелёные
- [ ] Перезапустить любой WFM-сервис (`docker compose restart svc_tasks`) — должен прийти `alert kind=container_down` в течение ≤5 сек
- [ ] Сгенерировать 5+ HTTP 500 за минуту — должен прийти `alert kind=api_errors`

### 2. Адаптация под целевое устройство (AMOLED 480×480) — после получения

- [ ] Исследовать драйвер CO5300 (QSPI) — найти совместимую Arduino-библиотеку или пример от Waveshare
- [ ] Адаптировать `platformio.ini` под AMOLED
- [ ] Убрать vertical pan в `screen_dashboard()` — на 480×480 всё помещается за один кадр
- [ ] (опц.) Добавить touch-жесты (CST9220 по I2C)

### 3. Опциональные алерты (не реализованы в svc_monitoring v2)

- [ ] `kind: high_cpu` (CPU >90% устойчиво ≥3 минут)
- [ ] `kind: high_mem` (mem >90% устойчиво ≥3 минут)

Решение принять, когда станет понятно, насколько шумные эти пороги в реальной нагрузке.

---

## Лог выполнения

### 2026-04-24
- Создан план (изначальная версия с svc_watch + svc_events)
- Создана структура `.memory_bank/device/`: README.md, hardware_specs.md, ws_protocol.md (в Semetrics)
- `svc_watch` собран в Semetrics-репозитории
- `firmware/`: PlatformIO проект, WiFiMulti, WebSockets, ArduinoJson, TFT UI

### 2026-04-26
- Адаптация на Guition JC4827W543N (планы `esp32_jc4827w543n_port.md`, `esp32_single_dashboard.md` закрыты)

### 2026-04-28
- Серверная часть переписана: вместо `svc_watch` (Semetrics) — расширение `svc_monitoring` (WFM). Подробности в `svc_monitoring_v2.md`
- Прошивка и документация устройства физически перенесены в WFM:
  - `backend/svc_monitoring/firmware/` (platformio.ini, src/, include/secrets.h.example)
  - `.memory_bank/device/` (README, hardware_specs, JC4827W543N_specs, display_design_brief, ws_protocol, design_handoff/)
  - Все упоминания `svc_watch`/`svc_events` в перенесённых файлах заменены на `svc_monitoring`
- Этот план (rev 3) переписан: устаревшие секции про svc_watch/svc_events убраны, оставлены только реальные открытые задачи
