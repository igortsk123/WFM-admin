# План: Миграция прошивки ESP32 и документации устройства из Semetrics в WFM

**Статус:** В работе
**Создан:** 2026-04-28
**Последнее обновление:** 2026-04-28 (rev 2 — миграция выполнена)

---

## Цель

Физически перенести из репозитория `Semetrics` в репозиторий `WFM` всё, что относится к ESP32-монитору: прошивку (PlatformIO + Arduino), документацию устройства и связанные планы. Привести URL-ы и упоминания в соответствие новой архитектуре, где устройство общается напрямую с `svc_monitoring` (см. `svc_monitoring_v2.md`), а сервиса `svc_watch` больше нет.

**Связанные документы:**
- `.memory_bank/plans/svc_monitoring_v2.md` — Plan 1: эволюция сервиса (отдаёт точные пути и параметры подключения)
- `.memory_bank/backend/services/svc_monitoring.md` — описание целевого сервиса

**Не делаем:**
- Не удаляем файлы из Semetrics — это сделает агент в репозитории Semetrics после успешной миграции (отдельным PR'ом)
- Не пишем код прошивки — переносим как есть, меняем только конфиги и упоминания
- Не объединяем с Plan 1 — там эволюция backend, тут физический перенос файлов

---

## Решение по структуре папок в WFM

**Выбор: прошивка → `backend/svc_monitoring/firmware/`, документация устройства → `.memory_bank/device/`.**

| Вариант | Плюсы | Минусы |
|---|---|---|
| `firmware/` в корне WFM (как в Semetrics) | Стандартное расположение для embedded-проектов; видно сверху что есть железка | На верхнем уровне репо появляется большая C++ папка, не имеющая отношения к backend/web/mobile стекам |
| `device/` в корне WFM (firmware + docs) | Всё про железо в одном месте | Та же проблема видимости + дублирование с `.memory_bank/device/` |
| **`backend/svc_monitoring/firmware/`** ✅ | Прошивка — клиент сервиса, физически принадлежит ему; «не отсвечивает» сверху проекта; проще понять кому она нужна | Нестандартно — внутри `backend/` оказывается C++/Arduino код. Решается через `.dockerignore` чтобы не попадал в образ сервиса |

**Документация устройства остаётся отдельной категорией знаний `.memory_bank/device/`** — по аналогии с `.memory_bank/analytics/`. Она не специфична для бэкенда: там железо, дизайн дисплея, протокол обмена. Ссылку на сервис добавим в `.memory_bank/backend/services/svc_monitoring.md`.

Итоговая структура в WFM после миграции:
```
backend/svc_monitoring/
├── app/                    # Python код сервиса (Plan 1)
├── firmware/               # ← НОВОЕ: PlatformIO проект
│   ├── platformio.ini
│   ├── src/
│   │   ├── main.cpp
│   │   ├── display.cpp
│   │   ├── display.h
│   │   └── state.h
│   ├── include/
│   │   ├── secrets.h.example
│   │   └── secrets.h        # gitignore — создаётся локально, не копируется
│   └── .gitignore           # secrets.h, .pio/, .vscode/
├── .dockerignore           # ← добавить: firmware/
└── Dockerfile

.memory_bank/device/
├── README.md
├── hardware_specs.md
├── JC4827W543N_specs.md
├── display_design_brief.md
├── ws_protocol.md
└── design_handoff/
    ├── README.md
    ├── design-canvas.jsx
    └── monitor-screens.html

.memory_bank/plans/
└── esp32_monitor.md          # перенести как активный (требует чистки от svc_watch/svc_events)

.memory_bank/completed_plans/
├── esp32_jc4827w543n_port.md
└── esp32_single_dashboard.md
```

---

## Задачи

### 1. Подготовка целевых директорий в WFM

- [x] Создать `backend/svc_monitoring/firmware/`
- [x] Создать `backend/svc_monitoring/firmware/src/`
- [x] Создать `backend/svc_monitoring/firmware/include/`
- [x] Создать `.memory_bank/device/`
- [x] Создать `.memory_bank/device/design_handoff/`

### 2. Перенос файлов прошивки

Все исходники — относительно `/Users/admin/Desktop/Semetrics/semetrics/`. Цели — относительно `/Users/admin/Desktop/WFM/wfm/`.

| # | Источник (Semetrics) | Цель (WFM) | Изменения при переносе |
|---|---|---|---|
| 2.1 | `firmware/platformio.ini` | `backend/svc_monitoring/firmware/platformio.ini` | Без изменений (build flags зависят от железа, не от сервера) |
| 2.2 | `firmware/src/main.cpp` | `backend/svc_monitoring/firmware/src/main.cpp` | Без изменений: `WS_HOST/WS_PATH/WS_TOKEN` приходят из `secrets.h`, код работает с любыми значениями |
| 2.3 | `firmware/src/display.cpp` | `backend/svc_monitoring/firmware/src/display.cpp` | Без изменений |
| 2.4 | `firmware/src/display.h` | `backend/svc_monitoring/firmware/src/display.h` | Без изменений |
| 2.5 | `firmware/src/state.h` | `backend/svc_monitoring/firmware/src/state.h` | Поправить комментарий на строке 21: `svc_watch гарантирует канонический порядок (см. aggregator.py CRITICAL_CONTAINERS tuple)` → `svc_monitoring гарантирует канонический порядок (см. services/state_store.py CRITICAL_CONTAINERS)` |
| 2.6 | `firmware/include/secrets.h.example` | `backend/svc_monitoring/firmware/include/secrets.h.example` | **WS_PATH меняется** — см. задачу 4 |
| 2.7 | `firmware/include/secrets.h` | **НЕ копировать** | Создаётся локально из `secrets.h.example`, не индексируется git |

- [x] Создать `backend/svc_monitoring/firmware/.gitignore`:
  ```
  .pio/
  .vscode/
  include/secrets.h
  ```
- [x] Создать `backend/svc_monitoring/.dockerignore`:
  ```
  firmware/
  ```
  (или дополнить, если уже есть; `Dockerfile` сейчас копирует только `svc_monitoring/app/` и `requirements.txt`, так что firmware и так не попадёт — но для надёжности и явности оставить)

### 3. Перенос документации устройства

Все исходники — `/Users/admin/Desktop/Semetrics/semetrics/.memory_bank/device/...`

| # | Источник | Цель в WFM | Изменения при переносе |
|---|---|---|---|
| 3.1 | `device/README.md` | `.memory_bank/device/README.md` | См. задачу 5 (правки текста) |
| 3.2 | `device/hardware_specs.md` | `.memory_bank/device/hardware_specs.md` | Без изменений (это про железо) |
| 3.3 | `device/JC4827W543N_specs.md` | `.memory_bank/device/JC4827W543N_specs.md` | Без изменений |
| 3.4 | `device/display_design_brief.md` | `.memory_bank/device/display_design_brief.md` | Поправить ссылку на `firmware/src/display.cpp` → `backend/svc_monitoring/firmware/src/display.cpp` (строки 33, 64) |
| 3.5 | `device/ws_protocol.md` | `.memory_bank/device/ws_protocol.md` | См. задачу 5 — правки текста (svc_watch → svc_monitoring) |
| 3.6 | `device/design_handoff/README.md` | `.memory_bank/device/design_handoff/README.md` | Без изменений (это handoff bundle, нейтрален) |
| 3.7 | `device/design_handoff/design-canvas.jsx` | `.memory_bank/device/design_handoff/design-canvas.jsx` | Без изменений |
| 3.8 | `device/design_handoff/monitor-screens.html` | `.memory_bank/device/design_handoff/monitor-screens.html` | Без изменений |

### 4. Изменения в коде/конфигах прошивки

**Контракт state/alert не меняется** — прошивка по-прежнему ожидает те же сообщения (см. ws_protocol.md). Меняются только URL-ы.

- [x] `secrets.h.example` после переноса:
  ```cpp
  #define WIFI_NETWORKS \
      { "HomeSSID", "homepass" }, \
      { "OfficeSSID", "officepass" }

  // WebSocket сервер svc_monitoring (WFM)
  #define WS_HOST  "dev.wfm.beyondviolet.com"   // или wfm.beyondviolet.com для prod
  #define WS_PORT  443
  #define WS_PATH  "/monitoring/api/events/ws"  // ← изменилось со /watch/ws
  #define WS_TOKEN "your-device-token"          // = DEVICE_TOKEN в svc_monitoring

  #define BUZZER_PIN -1
  ```
- [x] **В коде прошивки (`main.cpp`) ничего не менять** — `s_ws.beginSSL(WS_HOST, WS_PORT, String(WS_PATH) + "?token=" + WS_TOKEN)` собирает URL из defines, перепрошивать на каждое окружение не нужно
- [x] Проверить, что `platformio.ini` собирается на чистой машине (только PlatformIO + переносимые исходники):
  - `lib_deps`: GFX Library 1.6.5+, WebSockets 2.4.1+, ArduinoJson 7.2.0+
  - `platform = https://github.com/pioarduino/platform-espressif32/releases/download/55.03.38-1/...`
  - `board_build.arduino.memory_type = qio_opi`
  - `board_build.partitions = huge_app.csv`
  - `build_flags`: `-DARDUINO_USB_MODE=1 -DARDUINO_USB_CDC_ON_BOOT=1 -DBOARD_HAS_PSRAM -DCONFIG_ARDUINO_LOOP_STACK_SIZE=65536 -DGFX_BL=1`

### 5. Текстовые правки в перенесённых документах

Сводка упоминаний, которые нужно поправить **после** копирования файлов в WFM:

| Файл | Что поменять | На что |
|---|---|---|
| `.memory_bank/device/README.md` | «`svc_watch` — отдельный сервис, читает события из Postgres, агрегирует состояние, держит WebSocket-сессии» | «`svc_monitoring` сам владеет источниками данных (psutil + docker.sock), агрегирует состояние in-memory и держит WebSocket-сессии устройств. Полная архитектура: `.memory_bank/backend/services/svc_monitoring.md`» |
| `.memory_bank/device/README.md` | Архитектурная схема `Postgres → svc_watch → ESP32` | `psutil + docker.sock + WFM-сервисы → svc_monitoring (in-memory) → ESP32` |
| `.memory_bank/device/README.md` | Ссылка `/wfm/.memory_bank/analytics/server_events.md` | `.memory_bank/analytics/server_events.md` (теперь WFM — это «свой» репо, путь относительный) |
| `.memory_bank/device/ws_protocol.md` | «WebSocket Protocol — svc_watch → устройство» | «WebSocket Protocol — svc_monitoring → устройство» |
| `.memory_bank/device/ws_protocol.md` | «Устройство подключается к `svc_watch` как WebSocket-клиент» | «Устройство подключается к `svc_monitoring` как WebSocket-клиент» |
| `.memory_bank/device/ws_protocol.md` | URL `ws://host:PORT/ws?token=DEVICE_TOKEN` | `wss://wfm.beyondviolet.com/monitoring/api/events/ws?token=DEVICE_TOKEN` (с пометкой dev/prod URL'ов) |
| `.memory_bank/device/ws_protocol.md` | Ссылка на `svc_watch/app/services/aggregator.py` (строка ~46) | `backend/svc_monitoring/app/services/state_store.py` |
| `.memory_bank/device/display_design_brief.md` | `firmware/src/display.cpp` (строки 33, 64) | `backend/svc_monitoring/firmware/src/display.cpp` |
| `firmware/src/state.h` | Комментарий с упоминанием `svc_watch / aggregator.py` (строка 21) | `svc_monitoring / state_store.py` |

**Что оставляем без изменений:**
- Слово «Semetrics» в `.memory_bank/device/README.md` в контексте «событийная система через Semetrics» — это правда: исторические события всё ещё уходят в Semetrics параллельно
- Ссылки на event-реестр `.memory_bank/analytics/server_events.md` — этот файл тоже в WFM, путь правильный
- Все упоминания железа, экранов, цветов, layout'ов — никак не связаны с сервером

### 6. Перенос планов

| # | Источник (Semetrics) | Цель (WFM) | Что поменять |
|---|---|---|---|
| 6.1 | `.memory_bank/plans/esp32_monitor.md` | `.memory_bank/plans/esp32_monitor.md` | См. подробности ниже |
| 6.2 | `.memory_bank/completed_plans/esp32_jc4827w543n_port.md` | `.memory_bank/completed_plans/esp32_jc4827w543n_port.md` | Заменить упоминания `firmware/...` → `backend/svc_monitoring/firmware/...` |
| 6.3 | `.memory_bank/completed_plans/esp32_single_dashboard.md` | `.memory_bank/completed_plans/esp32_single_dashboard.md` | То же |

**Чистка `esp32_monitor.md` после переноса:**
- [x] Раздел «1. svc_events — расширение internal API (Semetrics)» — **удалить целиком**: больше не нужно, svc_monitoring сам владеет данными
- [x] Раздел «2. svc_watch — серверная часть (WFM)» — **удалить целиком**: вся работа теперь покрыта планом `svc_monitoring_v2.md`
- [x] В разделе «3. Прошивка» — оставить только то, что не сделано (точки `[ ]`); реализованные `[x]` помечаются датой и оставляются для истории
- [x] Заменить «Postgres (events таблица Semetrics) → polling каждые 5 сек → svc_watch» на «psutil + docker.sock + WFM-сервисы → in-memory state svc_monitoring»
- [x] В шапке плана добавить ссылку на `svc_monitoring_v2.md` как **зависимость**: прошивка не сможет подключиться, пока сервис не выкачен
- [x] Обновить дату в `Последнее обновление`

### 7. Документация WFM (после миграции)

- [x] `.memory_bank/README.md` — добавить новый раздел `device/` с описанием файлов (как сейчас сделано для `analytics/`, `backend/`, `mobile/`)
- [x] `.memory_bank/backend/services/svc_monitoring.md` — добавить раздел «Устройство-клиент», ссылка на `.memory_bank/device/README.md` и `backend/svc_monitoring/firmware/`
- [x] `CLAUDE.md` — добавить упоминание директории `backend/svc_monitoring/firmware/` в обзоре проекта; добавить URL `/monitoring/` в раздел Nginx Reverse Proxy (это происходит и в Plan 1, не дублировать); упомянуть `.memory_bank/device/` в разделе Memory Bank структуры

### 8. Чек-лист после миграции

- [x] `backend/svc_monitoring/firmware/` существует, в нём `platformio.ini` + `src/` + `include/secrets.h.example`
- [x] `secrets.h` отсутствует в `git status` (есть в `.gitignore`)
- [x] `cd backend/svc_monitoring/firmware && cp include/secrets.h.example include/secrets.h && pio run` — компилируется без ошибок (с дефолтными значениями WS_HOST=dev.wfm.beyondviolet.com)
- [ ] `docker compose build svc_monitoring` — образ собирается, размер контейнера НЕ вырос (firmware/ исключён через `.dockerignore`) — проверится при следующем CI build
- [x] `.memory_bank/device/` содержит 5 .md файлов + `design_handoff/` с 3 файлами
- [x] Поиск по WFM `grep -r "svc_watch" .memory_bank/ backend/svc_monitoring/firmware/` ничего не находит (или находит только в `completed_plans/` где это историческая правда)
- [x] Поиск по WFM `grep -r "svc_events" .memory_bank/ backend/svc_monitoring/firmware/` — то же самое
- [x] `.memory_bank/README.md` индексирует device/ раздел
- [ ] План `svc_monitoring_v2.md` (Plan 1) реализован и сервис уже принимает соединения — устройство, прошитое новым `secrets.h`, успешно получает первое сообщение `state` после WS-handshake (проверка пользователем после прописывания `MONITORING_DEVICE_TOKEN` в `.env` на DEV-сервере)
- [ ] После всего этого — открыть PR в Semetrics-репо с удалением `firmware/`, `.memory_bank/device/`, `backend/svc_watch/`, `.memory_bank/plans/esp32_monitor.md` и связанных completed_plans (отдельная работа в чужом репо)

---

## Что НЕ переносим (оставляем в Semetrics или удаляем как часть Semetrics-PR)

- `backend/svc_watch/` — этой логики больше нет; новая реализация в `backend/svc_monitoring/app/`
- Записи в `docker-compose.yml` Semetrics о `svc_watch` — не имеет отношения к WFM
- Изменения в `svc_events` (`event_name` параметр в `/internal/events/recent`) — это локальное расширение Semetrics, оно не нужно WFM
- nginx-конфиг `/watch/ws` — Semetrics-проблема

---

## Риски и trade-offs

| Риск | Mitigation |
|---|---|
| Прошивка в `backend/` — необычно, новички могут запутаться | В `CLAUDE.md` явный пункт: «прошивка устройства живёт в `backend/svc_monitoring/firmware/`, это клиент сервиса». Плюс ссылка из `services/svc_monitoring.md` |
| `pio run` в `backend/svc_monitoring/firmware/` тянет PlatformIO кеш в backend-папку | Добавить в .gitignore + `.dockerignore` (`.pio/`, `firmware/`) |
| Промежуточное состояние: WS_PATH уже новый, но svc_monitoring v2 ещё не выкачен → прошивка стучится в 404 | Plan 2 выполняем **только** после деплоя Plan 1 на dev. Чек-лист задачи 8 это закрепляет |
| `secrets.h` с реальными кредами случайно копируется из Semetrics | Явная задача 2.7: НЕ копируем `secrets.h`, только `secrets.h.example`. Чек-лист проверяет git status |
| Старые ссылки на `svc_watch` / `aggregator.py` остаются в перенесённой документации | Задача 5 + проверка через grep в чек-листе |
| Удаление в Semetrics происходит до миграции в WFM → потеря исходников | Перенос — это **копирование**, не перемещение. Удаление в Semetrics делается отдельным PR в чужом репо после успешной приёмки. Описано в задаче 8 |
| Прошивка хранится в нестандартном месте — IDE и embedded-tooling может не распознавать корень проекта | `pio` запускается из `backend/svc_monitoring/firmware/` — корень PlatformIO там, не в корне репо. Документировать этот путь в `.memory_bank/device/README.md` |

---

## Лог выполнения

### 2026-04-28
- План создан после ревизии содержимого `Semetrics/.memory_bank/device/`, `firmware/`, `backend/svc_watch/`
- Принято решение по структуре: прошивка — в `backend/svc_monitoring/firmware/`, документация — в `.memory_bank/device/` (как отдельная категория знаний)
- Зафиксирован новый WS_PATH `/monitoring/api/events/ws` (вместо `/watch/ws`); контракт сообщений `state`/`alert` не меняется
- **Реализация (rev 2):**
  - Перенесены 6 файлов прошивки: `platformio.ini`, `src/{main,display,state}.{cpp,h}`, `include/secrets.h.example`. `secrets.h` создан локально и в `.gitignore`
  - Перенесены 5 файлов документации устройства + 3 файла `design_handoff/`
  - Текстовые правки: `device/README.md` переписан под svc_monitoring, `ws_protocol.md` обновлён (новый URL, ссылка на `domain/schemas.py`), `display_design_brief.md` поправлены пути на `backend/svc_monitoring/firmware/src/...`, `state.h` комментарий обновлён
  - `secrets.h.example`: `WS_HOST=dev.wfm.beyondviolet.com`, `WS_PATH=/monitoring/api/events/ws`
  - Перенесены планы: `esp32_monitor.md` (активный, rev 3 — почищен от svc_watch/svc_events), `esp32_jc4827w543n_port.md` и `esp32_single_dashboard.md` (completed, добавлены вступления-маркеры о новых путях)
  - `backend/svc_monitoring/firmware/.gitignore` (`.pio/`, `secrets.h`)
  - `backend/svc_monitoring/.dockerignore` (исключает `firmware/` из образа сервиса)
  - `.memory_bank/README.md`: новый раздел `device/`; `services/svc_monitoring.md` обновлён (структура с `firmware/` + ссылки на устройство-клиент); `CLAUDE.md`: добавлены ссылки на `device/` и `api_monitoring.md`
  - **Чек-лист:** `pio run` из `backend/svc_monitoring/firmware/` собирается, прошивка успешно залита на `/dev/cu.usbmodem1201` (1.27 MB, hash verified). Поиск `svc_watch`/`svc_events` в перенесённых файлах не находит ничего, кроме исторических упоминаний в логе плана `esp32_monitor.md` и в маркерах completed-планов
