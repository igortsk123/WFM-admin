# План: Исправление обработки часовых поясов

**Статус:** В работе
**Создан:** 2026-04-09
**Последнее обновление:** 2026-04-09

## Цель

Корректная обработка timezone при работе пользователей из разных часовых поясов.
Сейчас всё работает только если timezone устройства совпадает с timezone магазина.

## Контекст и анализ

### Backend (FastAPI + PostgreSQL)

- `opened_at`, `closed_at`, `created_at` — хранятся в UTC через `datetime.utcnow()`
- `shift_date` (DATE) и `start_time` (TIME) — хранятся **без timezone**, подразумевается "локальное время магазина", но нигде явно не задано
- Запрос "смены на сегодня" делает `shift_date == today`, где `today` — дата на сервере (UTC).
  При магазине в UTC+3 с 00:00 до 03:00 мск сервер уже ищет "завтрашние" смены (на практике некритично, но принципиально — дыра)
- Сознательный комментарий в `shift_repository.py`: используется `shift_date` вместо `func.date(opened_at)` именно чтобы избежать timezone-проблем — но это решает лишь часть

### iOS — баг в ShiftTimeCalculator

`ShiftTimeCalculator.shiftStartDate()` создаёт `Date` из `shift_date + start_time` без timezone:

```swift
formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
// .timeZone не выставлен → берёт TZ устройства
```

Если смена на 09:00 московского, а устройство в UTC → время посчитается неправильно.
Затронуто: `isShiftLate()` — индикатор опоздания на смену будет врать.

### Android — аналогичный баг в ShiftTimeCalculator

```kotlin
SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
// .timeZone не задан → локальный TZ устройства
```

`Instant` / `opened_at` обрабатывается правильно (InstantSerializer добавляет Z), но `start_time` / `shift_date` — нет.

### API контракты

- `opened_at`/`closed_at` возвращаются без Z: `"2026-03-02T09:15:00"` (предполагается UTC, но не явно)
- iOS в `APIClient` явно выставляет `TimeZone(abbreviation: "UTC")` при парсинге → ОК
- Android `InstantSerializer` добавляет Z если его нет → ОК
- Проблема только в `shift_date` + `start_time` комбинации

## Что сейчас работает нормально

- Устройство настроено на московское время → всё корректно
- Список смен и задач → без проблем (фильтрация по `shift_date` как строке)
- Фактические временные метки (`opened_at`) → обрабатываются правильно

## Задачи

- [ ] **Backend:** Добавить поле `timezone` (string, IANA, например `"Europe/Moscow"`) в таблицу `stores`
- [ ] **Backend:** Передавать `timezone` магазина в ответе `/shifts/current` и других эндпоинтах где есть `shift_date` + `start_time`
- [ ] **Backend:** Рассмотреть явное добавление Z в datetime ответах API (`"2026-03-02T09:15:00Z"`)
- [ ] **iOS:** В `ShiftTimeCalculator.shiftStartDate()` — создавать `Date` с явным timezone магазина (полученным из API), а не с timezone устройства
- [ ] **Android:** В `ShiftTimeCalculator.shiftStartMillis()` — заменить `SimpleDateFormat` с `Locale.getDefault()` на вариант с явным timezone магазина
- [ ] **Memory Bank:** Добавить раздел о timezone в `.memory_bank/domain/shift_model.md`

## Затронутые файлы

- `backend/svc_tasks/app/domain/models.py`
- `backend/svc_tasks/app/repositories/shift_repository.py`
- `backend/svc_tasks/app/schemas.py` (или аналог)
- `mobile/ios/WFMApp/` — `ShiftTimeCalculator.swift`
- `mobile/android/app/` — `ShiftTimeCalculator.kt`, `ShiftModels.kt`
- `.memory_bank/domain/shift_model.md`
