# План: Единый dashboard-экран + native-рендер на JC4827W543N

**Статус:** Завершён
**Создан:** 2026-04-27
**Последнее обновление:** 2026-04-27 (rev 4 — реализовано, прошито, визуально проверено и доведено)

> ⚠️ **Историческая справка о путях:** этот план писался в Semetrics-репозитории. После миграции прошивки в WFM (2026-04-28, см. `plans/firmware_migration_from_semetrics.md`):
> - `firmware/src/...` → `backend/svc_monitoring/firmware/src/...`
> - `backend/svc_watch/app/services/aggregator.py` → `backend/svc_monitoring/app/domain/schemas.py` (CRITICAL_CONTAINERS) и `app/services/state_store.py`
>
> Содержимое плана дальше не модифицируется — это запись о том, что было сделано на тот момент.

---

## Цель

Заменить ротацию из трёх экранов (METRICS / CONTAINERS / ERRORS) одним dashboard-экраном,
на котором всё видно одновременно. Реализация — по референсу из handoff bundle,
сохранённого в `.memory_bank/device/design_handoff/` (компонент `ScreenDashboard`,
секция «Dashboard — всё на одном экране» в `monitor-screens.html`).

Параллельно — отказаться от nearest-neighbor даунскейла 480→272: «выколи глаз»
на текущем устройстве. Перейти к pixel-perfect 1:1 рендерингу на физическом 480×272.

Экраны NO CONNECTION и ALERT остаются как полноэкранные оверлеи (без изменений
по содержанию, только адаптация под новый рендер-конвейер).

---

## Референс дизайна

**Файлы handoff (сохранены в репо):**
- `.memory_bank/device/design_handoff/monitor-screens.html`
- `.memory_bank/device/design_handoff/design-canvas.jsx`
- `.memory_bank/device/design_handoff/README.md`

**Компонент:** `ScreenDashboard` (строки ~618–699 в `monitor-screens.html`).

**Состав dashboard сверху вниз (480×480):**
1. **Header** — `WFM` слева, справа: блок NO WIFI/NO SERVER (если есть), иконка wifi, LiveDot.
2. Тонкий разделитель `#1C2433`.
3. **METRICS** — лейбл `METRICS` + 3 строки `MiniBar` (CPU / MEM / DISK).
4. Разделитель.
5. **CONTAINERS** — лейбл `CONTAINERS` + 4 строки `MiniServiceRow` в порядке прихода с сервера, без выделения primary.
6. Разделитель.
7. **ERRORS / 1H** — лейбл слева, справа цветная пилюля с числом ошибок.

Состояния-варианты (артборды `d1`/`d2`/`d3`): `nominal`, `degraded`, `no wifi`.

**Отличия от референса (зафиксированные решения):**
- Контейнеры — без primary-выделения `postgres`. Все рендерятся одинаковым стилем `MiniServiceRow`, порядок диктует сервер.
- Полноэкранных `screen_no_connection` нет — статус коннективности показывается только в хедере dashboard.

---

## Решение по масштабированию (рекомендация)

| Вариант | Плюсы | Минусы |
|---|---|---|
| **A. Холст 240×240, 2× upscale на JC4827W543N** | Меньше памяти; на временном устройстве чётко | Полная переразметка дизайна; на целевом 480×480 потребуется обратный 2× upscale → теряется смысл «native» |
| **B. Холст 480×480, vertical pan на JC4827W543N** ← **рекомендую** | На целевом 480×480 — 1:1 без переделки. На временном — pixel-perfect. Демонстрирует «движение» вместо «выколи глаз» | Чуть сложнее: цикл pan + dwell. Часть контента в момент времени не видна |
| **C. Отдельная landscape-раскладка 480×272 для temp** | На временном устройстве — статично, без скролла, всё видно | Двойная разметка: temp ≠ target; truba для портирования на Waveshare |

**Выбираю вариант B.** Холст остаётся 480×480 (как требует Waveshare AMOLED).
На JC4827W543N viewport 480×272 циклически смещается по холсту:

```
y=0     ───────  dwell 4 s  (видны header + METRICS)
        easeInOut 1.5 s
y=208   ───────  dwell 4 s  (видны CONTAINERS + ERRORS)
        easeInOut 1.5 s
y=0     (loop)
```

**Почему dwell+pan, а не непрерывный скролл:**
- Постоянное движение раздражает в фоновом мониторе (его краем глаза видно).
- Dwell в крайних точках = два «осмысленных кадра», между которыми — короткий переход.
- Для часов/будней видишь любую критичную метрику за ≤ 5–6 сек.

**MVP-режим (зафиксирован):** жёсткое переключение top↔bottom каждые 5 сек без анимации.
Минимум кода. Если визуально дёрганно — добавим easeInOut отдельной задачей.

---

## Контекст текущего кода

| Файл | Что есть | Что меняется |
|---|---|---|
| `firmware/src/display.h` | `screen_metrics/containers/errors/no_connection/alert` | Заменить три первых на единый `screen_dashboard()` |
| `firmware/src/display.cpp` | 480×480 canvas, `push_frame()` 480→272 nearest-neighbor + 3 экрана | `push_frame_native(y_offset)` 1:1; новый `screen_dashboard()` по `ScreenDashboard` jsx |
| `firmware/src/main.cpp` | Ротация `s_screen_idx % 3` каждые 5 с | Один `screen_dashboard()` каждый кадр; pan-state хранится в display.cpp |

Палитра RGB565 (`CLR_OK/WARN/CRIT/UNKN/BG/FG/FG2/SURF/SURF2`) уже соответствует
дизайн-токенам — переиспользуем без изменений.

---

## Задачи

### 1. Сервер — детерминированный порядок контейнеров

Сейчас в `backend/svc_watch/app/services/aggregator.py`:
```python
CRITICAL_CONTAINERS = {"svc_tasks", "svc_users", "svc_notifications", "postgres"}  # set!
containers: dict[str, str] = {name: "unknown" for name in CRITICAL_CONTAINERS}
```
Итерация `set` в Python — недетерминирована (hash order, может меняться между запусками
с `PYTHONHASHSEED=random`). Чтобы устройство показывало контейнеры в стабильном порядке,
нужно поменять `set` на `tuple`.

- [x] В `aggregator.py` (и `alert_detector.py` — там та же `set`): `CRITICAL_CONTAINERS = ("postgres", "svc_tasks", "svc_users", "svc_notifications")`
- [x] Comprehension `{name: ... for name in tuple}` сохраняет порядок вставки → JSON-сериализация детерминирована
- [x] `if name in tuple` — работает идентично, O(n) для n=4 несущественно
- [x] `ws_protocol.md` обновлён

### 2. Прошивка — `state.h`: контейнеры массивом

Сейчас `ServerState` хранит контейнеры именованными полями — порядок жёстко прибит к коду.
Переходим на массив `{name, status}` в порядке как пришло.

- [x] `state.h`: удалены именованные поля, добавлены `ContainerEntry containers[MAX_CONTAINERS]` + `containers_count` + extern-ы для `g_ws_connected`/`g_conn_lost_at`
- [x] `main.cpp` `parse_message`: итерация по `JsonPair kv : doc["containers"]`, заполнение `containers[]` в порядке прихода

### 3. `display.cpp` — рендер-конвейер

- [x] `push_frame()` удалён, добавлен `push_frame_native(y_offset)` с clamp
- [x] Константы `OUT_SZ`/`OUT_X` удалены
- [x] `gfx->fillScreen(CLR_BG)` в init сохранён

### 4. `display.cpp` — примитивы для dashboard

Перенос компонентов из `design-canvas.jsx`/`monitor-screens.html` в C++:

- [x] `draw_mini_bar` — лейбл слева, track + fill в центре, значение справа (без glow для производительности)
- [x] `draw_mini_service_row` — card + accent + dot+halo + short_name + status label, без primary-варианта
- [x] `draw_wifi_small` — три fillArc + крест если `!ok`
- [x] `draw_errors_pill` — rounded rect фон/border + крупное число

### 5. `display.cpp` — `screen_dashboard()`

- [x] Header: WFM большой кегль, справа wifi + LiveDot, бейдж NO WIFI/NO SERVER + Xm Ys при потере связи
- [x] METRICS / CONTAINERS / ERRORS секции реализованы
- [x] Хедер дублируется на y=0 и y=208 для видимости в обоих pan-positions
- [x] CONTAINERS — цикл по `g_state.containers[i]` в порядке сервера, ERRORS pill справа от списка
- [x] `push_frame_native(pan_y)` с pan_y из `(millis() / 5000) % 2 ? 208 : 0`

### 6. `display.h`

- [x] Удалены `screen_metrics/containers/errors/no_connection`
- [x] Добавлен `screen_dashboard()`
- [x] `screen_alert` сохранён

### 7. `display.cpp` — `screen_alert`

- [x] Контент перенесён в y=0..272 (top bar y=0, badge y=12, icon cy=130, message y=220, bottom bar y=266); push через `push_frame_native(PAN_TOP)`

### 8. `main.cpp`

- [x] Удалены `s_screen_idx/s_screen_changed/SCREEN_ROTATE_MS`
- [x] Ветка no-connection удалена
- [x] `s_ws_connected/s_ws_lost_at` → globals `g_ws_connected/g_conn_lost_at` (в `state.h`)
- [x] `loop()`: alert → `screen_alert`, иначе → `screen_dashboard`
- [x] `setup()`: стартовый рендер `screen_dashboard()` (показывает `--` + NO WIFI до коннекта)
- [x] `g_conn_lost_at` теперь взводится также при потере wifi (не только WS) — чтобы таймер тикал с момента потери любой связи

### 9. Проверка после сборки

- [x] Компиляция без ошибок (RAM 15%, Flash 40%)
- [x] Page-switch каждые 5 сек (METRICS ↔ CONTAINERS+ERRORS) работает
- [x] Цвета mini-bar / контейнеров / errors-pill корректные
- [x] Хедер с LIVE/STALE и wifi-иконкой отображается стабильно
- [x] Pixel-perfect 1:1 рендер подтверждён
- [x] Контейнеры в порядке payload-а сервера (после фикса set→tuple)

### 10. Документация

- [x] `display_design_brief.md`: добавлен `Screen 0 — DASHBOARD`, screens 1–3 помечены как исторический референс, screen 4 как не используется, обновлена стратегия вывода
- [x] `ws_protocol.md`: добавлена заметка про детерминированный порядок ключей; в таблице WS disconnect — заменён full-screen на хедер
- [x] `esp32_monitor.md`: пункт 4 закрыт со ссылкой на `completed_plans/`, добавлен пункт 6, секция UI помечена как заменённая
- [x] `MEMORY.md`: «Стратегия квадратного экрана» переписана; добавлена ссылка на handoff и активный план

---

## Архитектурные решения (зафиксированы)

1. **Холст остаётся 480×480.** Меняется только способ его попадания на физический пиксель.
2. **Никаких разных раскладок для temp vs target.** Тот же `screen_dashboard()` поедет на Waveshare 480×480 без правок (там pan не нужен — всё помещается).
3. **MVP без анимации pan.** Жёсткое переключение top↔bottom каждые 5 с. Плавность — отдельной задачей если останется неприятно резко.
4. **`screen_no_connection` удаляется.** Весь статус коннективности (NO WIFI / NO SERVER + длительность) показывается в хедере dashboard. Если связи нет с самого старта — dashboard рендерится с `--` метрик и пустым списком контейнеров, что само по себе говорит о ситуации.
5. **Контейнеры — без primary.** Все строки одинаковым стилем `MiniServiceRow`. Порядок отображения = порядок в JSON-payload (детерминируется сервером).

---

## Лог выполнения

### 2026-04-27

- Получен handoff bundle с дизайном single-screen dashboard
- Сохранён в `.memory_bank/device/design_handoff/`
- Создан план
- План `esp32_jc4827w543n_port.md` помечен завершённым и перенесён в `completed_plans/`
- Зафиксированы решения по 3 открытым вопросам: MVP жёсткое переключение, no-connection переезжает в хедер, порядок контейнеров с сервера (требует мелкого фикса в `svc_watch`)
- **Реализация:**
  - `svc_watch`: `CRITICAL_CONTAINERS` set→tuple в `aggregator.py` и `alert_detector.py`
  - `state.h`: контейнеры массивом + globals `g_ws_connected`/`g_conn_lost_at`
  - `display.cpp`: полностью переписан — `push_frame_native`, новые примитивы (`draw_mini_bar`, `draw_mini_service_row`, `draw_wifi_small`, `draw_errors_pill`, `draw_dashboard_header`), `screen_dashboard()`, адаптированный `screen_alert`. Удалены три старых экрана и no-connection
  - `main.cpp`: парсинг контейнеров через `JsonPair`, удалена ротация и no-connection-ветка, `g_conn_lost_at` тикает и при потере wifi
  - Документация: `display_design_brief.md`, `ws_protocol.md`, `esp32_monitor.md`, `MEMORY.md`
  - Сборка: ✅ успешно (RAM 15%, Flash 40%)
- **Осталось:** прошить и визуально проверить (раздел 9, пункты 2–7)

### 2026-04-27 (вечер) — доводка по фото с устройства

После прошивки выявлены и исправлены визуальные косяки:

- **Двойной WFM/LIVE в нижней части метрик-страницы** — был артефакт от vertical-pan (overlap зон 208..272 захватывал второй хедер). Переписано на **page-switch model**: одна страница рендерится в верхние 272 px холста, push всегда с y=0. Никаких overlap'ов, хедер один, дублировать не нужно.
- **«0» не влезал в errors-pill** — пилюля была hardcoded на 24+pad px. Заменено на расчёт из реального `getTextBounds`.
- **Полоска при 0% выглядела «пусто/криво»** — добавлен минимальный fill длиной `bar_h` для value≥0, чтобы 0% визуально отличалось от «нет данных» (value<0, fill пропускается совсем).
- **Wifi-иконка с раггедными краями и неравномерными зазорами** — переписана через **wedge-mask подход**: сплошной сектор → вырезы BG-цветом. Каждый край совпадает с одной окружностью одного fillArc — никаких артефактов от наложения. 3 кольца по 3 px, зазоры 3 px, симметрично.
- **Divider перед errors-pill наезжал на верх пилюли** — divider убран, разделение визуальное (whitespace + сама пилюля как чанк).
- **Карточки контейнеров с цветным статусом-текстом «чихорда»** — заменено на компактные **status-бейджи** (rounded rect + полупрозрачный фон + цветной текст внутри). Карточная заливка убрана, осталась только акцентная полоска и dot.

Финал: всё работает как задумано, визуально аккуратно. План закрыт.
