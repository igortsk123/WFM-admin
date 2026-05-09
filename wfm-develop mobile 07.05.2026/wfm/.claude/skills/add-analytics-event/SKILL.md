---
name: add-analytics-event
description: Добавить новое аналитическое событие в iOS и Android — с планом, правкой кода и обновлением всей документации
argument-hint: [описание события]
---

Тебе нужно добавить новое аналитическое событие в мобильное приложение WFM.

Задание: $ARGUMENTS

---

## Шаг 1 — Прочитай контекст

Перед любыми действиями прочитай эти файлы:

1. `.memory_bank/analytics/rules.md` — правила добавления событий
2. `.memory_bank/analytics/mobile_events.md` — реестр событий (источник правды)
3. `mobile/ios/WFMApp/Core/Analytics/AnalyticsService.swift` — enum AnalyticsEvent
4. `mobile/ios/WFMApp/Core/Analytics/FirebaseAnalyticsService.swift` — маппинг Firebase (iOS)
5. `mobile/ios/WFMApp/Core/Analytics/SemetricsAnalyticsService.swift` — маппинг Semetrics (iOS)
6. `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/analytics/AnalyticsService.kt` — sealed class AnalyticsEvent
7. `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/analytics/FirebaseAnalyticsService.kt` — маппинг Firebase (Android)
8. `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/analytics/SemetricsAnalyticsService.kt` — маппинг Semetrics (Android)

---

## Шаг 2 — Уточни детали события

Если из задания неясно хотя бы одно из следующего — **задай вопрос пользователю перед созданием плана**:

- Точное `snake_case` имя события (по правилам из `rules.md`: `{объект}_{действие}`)
- Какие параметры нужны (типы и имена)
- Где в коде вызывать `analyticsService.track(...)` (в каком ViewModel / методе)
- Относится ли событие к новой категории, которой ещё нет в `mobile_events.md`

Не придумывай параметры самостоятельно — они определяют что будет в аналитике.

---

## Шаг 3 — Создай план

Создай файл `.memory_bank/plans/{имя-события}.md` по шаблону:

```
# План: Событие {event_name}

**Статус:** В работе
**Создан:** {дата}
**Последнее обновление:** {дата}

## Цель
{Зачем это событие, что оно измеряет}

## Событие
- **Имя:** `{event_name}`
- **Параметры:** {перечисление параметров с типами}
- **Где трекать:** {ViewModel / метод / экран}

## Задачи

### Документация
- [ ] Обновить `mobile_events.md` — добавить событие в реестр

### iOS
- [ ] Добавить кейс в `AnalyticsEvent` (AnalyticsService.swift)
- [ ] Добавить маппинг в `FirebaseAnalyticsService.swift`
- [ ] Добавить маппинг в `SemetricsAnalyticsService.swift`
- [ ] Вызвать `analyticsService.track(...)` в {место}

### Android
- [ ] Добавить кейс в `AnalyticsEvent` (AnalyticsService.kt)
- [ ] Добавить маппинг в `FirebaseAnalyticsService.kt`
- [ ] Добавить маппинг в `SemetricsAnalyticsService.kt`
- [ ] Вызвать `analyticsService.track(...)` в {место}

### Дополнительная документация (если нужно)
- [ ] Обновить `firebase_guide.md` — если событие относится к новой категории
- [ ] Обновить `semetrics_guide.md` — если событие требует особого описания

## Лог выполнения
### {дата}
- Составлен план
```

---

## Шаг 4 — Выполни план в строгом порядке

**Порядок критичен. Не меняй его.**

### 4.1 — Сначала документация (источник правды)

Обнови `.memory_bank/analytics/mobile_events.md`:
- Найди нужную секцию (или создай новую, если событие относится к новой категории)
- Добавь строку в таблицу: `| event_name | Когда происходит | параметры |`
- Если у события есть параметры — добавь или обнови подраздел со значениями параметров

Отметь задачу выполненной в плане: `[x]`

### 4.2 — iOS: AnalyticsEvent

В `AnalyticsService.swift` добавь кейс в enum `AnalyticsEvent`:
- Секция `// MARK: {категория}` — добавляй в нужную секцию, не в случайное место
- Формат кейса такой же, как у соседних кейсов в той же секции

Отметь в плане.

### 4.3 — iOS: FirebaseAnalyticsService

В `FirebaseAnalyticsService.swift` добавь кейс в `firebaseRepresentation`:
- Имя события совпадает с `mobile_events.md` (snake_case)
- Параметры: только те, что определены в плане

Отметь в плане.

### 4.4 — iOS: SemetricsAnalyticsService

В `SemetricsAnalyticsService.swift` добавь кейс в `semetricsRepresentation`:
- Имя и параметры — идентичны Firebase
- Параметры типа `Bool` и `Int` передаются как есть (не `.toString()`)

Отметь в плане.

### 4.5 — iOS: Вызов track(...)

Найди нужное место в коде (ViewModel или Service) и добавь вызов `analyticsService.track(.{eventName}(...))`.

Отметь в плане.

### 4.6 — Android: AnalyticsEvent

В `AnalyticsService.kt` добавь data class / data object в sealed class `AnalyticsEvent`:
- Секция `// ── {категория} ──` — в нужную секцию
- `data object` — если нет параметров, `data class` — если есть

Отметь в плане.

### 4.7 — Android: FirebaseAnalyticsService

В `FirebaseAnalyticsService.kt` добавь:
- Кейс в `private fun AnalyticsEvent.name()` → строка имени
- Кейс в `private fun AnalyticsEvent.params()` → `mapOf(...)` с параметрами (все значения через `.toString()`)
- Если нет параметров — не нужно добавлять в `params()` (уже покрыт `else -> emptyMap()`)

Отметь в плане.

### 4.8 — Android: SemetricsAnalyticsService

В `SemetricsAnalyticsService.kt` добавь кейс в `private fun AnalyticsEvent.toSemetrics()`:
- Формат: `is AnalyticsEvent.{Name} -> "event_name" to mapOf(...)`
- Параметры `Boolean` и `Int` — как есть, без `.toString()`

Отметь в плане.

### 4.9 — Android: Вызов track(...)

Найди нужное место (ViewModel) и добавь `analyticsService.track(AnalyticsEvent.{Name}(...))`.

Отметь в плане.

### 4.10 — Дополнительная документация (только при необходимости)

**`firebase_guide.md`** — обновляй, если:
- Событие относится к новой категории (например, «Телеметрия сети»)
- Для аналитика полезно знать как с ним работать в Firebase Console

**`semetrics_guide.md`** — обновляй, если:
- Событие требует пояснения специфики для Semetrics
- Это нестандартный тип события (автоматический трекинг, нетипичные параметры)

**Не обновляй эти файлы** просто потому что добавил событие — большинство событий достаточно описаны в `mobile_events.md`.

Отмечай выполненные задачи в плане.

---

## Шаг 5 — Завершение плана

1. Обнови статус плана: `**Статус:** Выполнено`
2. Добавь дату завершения в лог
3. Перемести файл: `mv .memory_bank/plans/{name}.md .memory_bank/completed_plans/{name}.md`

---

## Чеклист перед завершением

Прежде чем ответить пользователю — пройдись по списку:

- [ ] `mobile_events.md` обновлён (событие есть в реестре)
- [ ] iOS `AnalyticsEvent` — новый кейс добавлен
- [ ] iOS `FirebaseAnalyticsService` — маппинг добавлен
- [ ] iOS `SemetricsAnalyticsService` — маппинг добавлен
- [ ] Android `AnalyticsEvent` — новый кейс добавлен
- [ ] Android `FirebaseAnalyticsService` — маппинг добавлен (name + params)
- [ ] Android `SemetricsAnalyticsService` — маппинг добавлен
- [ ] `track(...)` вызывается в нужном месте (iOS + Android)
- [ ] План завершён и перемещён в `completed_plans/`

Если что-то не отмечено — сделай это сейчас.
