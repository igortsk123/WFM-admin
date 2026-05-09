# План: Портирование прошивки на JC4827W543N (временное устройство #2)

**Статус:** Завершён
**Создан:** 2026-04-26
**Последнее обновление:** 2026-04-27

> ⚠️ **Историческая справка о путях:** этот план писался в Semetrics-репозитории. После миграции прошивки в WFM (2026-04-28, см. `plans/firmware_migration_from_semetrics.md`):
> - `firmware/...` → `backend/svc_monitoring/firmware/...`
> - `backend/svc_watch/...` → не существует, серверная логика теперь в `backend/svc_monitoring/app/services/state_store.py` и сопутствующих
>
> Содержимое плана дальше не модифицируется — это запись о том, что было сделано на тот момент.

---

## Цель

Перевести прошивку `firmware/` с TFT_eSPI + ST7789 240×240 на Arduino_GFX + NV3041A JC4827W543N 480×272.
Поскольку целевое устройство будет иметь **квадратный экран**, использовать квадратную область
272×272 пикселей (вся высота дисплея, по центру по горизонтали, отступ x=104).
Дизайн-холст остаётся 480×480 px — при выводе делается nearest-neighbor даунскейл 480→272.

---

## Контекст

| Параметр | Старое (ST7789) | Новое (JC4827W543N) |
|---|---|---|
| Разрешение | 240×240 | 480×272 (физ.) / 272×272 (используем) |
| Драйвер | ST7789 | NV3041A (подтверждён в RunSlate) |
| Интерфейс | SPI (стандартный) | QSPI (4-бит) |
| Библиотека | TFT_eSPI + TFT_eSprite | Arduino_GFX + Arduino_Canvas |
| Пины дисплея | MOSI=11, SCLK=12, CS=-1, DC=4, RST=5 | CS=45, SCK=47, D0=21, D1=48, D2=40, D3=39 |
| Подсветка | BL=-1 | GPIO1 |
| Тач | нет | нет (версия N) |
| IPS invert | нет | `invertDisplay(true)` |

**Справка:** паттерн инициализации проверен в `/Users/admin/Desktop/RunSlate/firmware/src/tft_display.cpp`

---

## Ключевые технические решения

### Стратегия квадратного экрана
```
Физический дисплей: 480 × 272
Квадратная область: 272 × 272, x_offset = (480-272)/2 = 104
Дизайн-холст:      480 × 480 (как раньше, все координаты без изменений)
push_frame:        nearest-neighbor 480→272, gfx->draw16bitRGBBitmap(104, y, line, 272, 1)
PSRAM:             480 × 480 × 2 = 450 KB (вписывается в 8 MB OPI PSRAM)
```

### Конвертация углов arc
TFT_eSPI: 0° = верх (12 ч.), по часовой стрелке.
Arduino_GFX: 0° = право (3 ч.), по часовой стрелке.
Конвертация: `agfx = tfte - 90` (при отрицательных значениях +360).

| Угол | TFT_eSPI | Arduino_GFX |
|---|---|---|
| GARC_S (10 ч.) | 300° | 210° |
| GARC_E (8 ч., 300° свип) | 600° (=240°) | 510° (=150°) |
| Error arc start | 290° | 200° |
| Error arc end | 430° (=70°) | 340° |

### Замена drawArc
TFT_eSPI `drawArc(cx, cy, r, r-stW, start, end, fg, bg)`:
- Отдельный fillArc для фонового трека: `fillArc(cx, cy, r, r-stW, start_gfx, end_full_gfx, CLR_SURF2)`
- fillArc для заполнения: `fillArc(cx, cy, r, r-stW, start_gfx, fill_end_gfx, col)`
Потеря: нет AA на краях дуг — приемлемо для тест-устройства.

### Замена setTextDatum + drawString
Вместо `spr.setTextDatum(MC_DATUM); spr.drawString(str, cx, cy)`:
```cpp
int16_t x1, y1; uint16_t w, h;
canvas->getTextBounds(str, 0, 0, &x1, &y1, &w, &h);
canvas->setCursor(cx - x1 - w/2, cy - y1 - h/2);  // MC
canvas->print(str);
```

### Замена drawWideLine
`spr.drawWideLine(x0,y0,x1,y1, 7, col, bg)` → `fillTriangle` или несколько offset-`drawLine`.

### Шрифт
TFT_eSPI Font 2/4 → Adafruit GFX built-in шрифт (6×8 px), масштаб через `setTextSize(n)`.
Визуальный результат будет отличаться от дизайна, но достаточен для тестирования.

---

## Задачи

### 1. Документация

- [x] Обновить `display_design_brief.md` — добавить раздел про JC4827W543N как временное устройство #2
- [x] Обновить `esp32_monitor.md` — добавить пункт "4. Адаптация на JC4827W543N"
- [x] Создать этот план

### 2. platformio.ini

- [x] Заменить `Bodmer/TFT_eSPI` → `moononournation/GFX Library for Arduino @ ^1.6.5`
- [x] Обновить платформу на pioarduino (как в RunSlate, стабильнее для ESP32-S3)
- [x] Добавить `board_build.partitions = huge_app.csv`
- [x] Убрать все TFT_eSPI build_flags (-DUSER_SETUP_LOADED, -DST7789_DRIVER, и др.)
- [x] Добавить `-DGFX_BL=1`

### 3. display.h

- [x] Заменить `#include <TFT_eSPI.h>` на `#include <Arduino_GFX_Library.h>`
- [x] Заменить `TFT_eSPI tft` и `TFT_eSprite spr` на `Arduino_GFX* gfx` и `Arduino_Canvas* canvas`

### 4. display.cpp — инфраструктура

- [x] Инициализация: `Arduino_ESP32QSPI` bus + `Arduino_NV3041A(bus, GFX_NOT_DEFINED, 0, true)`
- [x] Подсветка: `pinMode(GFX_BL, OUTPUT); digitalWrite(GFX_BL, HIGH)`
- [x] Холст: `Arduino_Canvas(480, 480, gfx)`, `canvas->begin()`
- [x] Очистка сторонних полос: `gfx->fillScreen(CLR_BG)` при init
- [x] Переписать `push_frame()`: nearest-neighbor 480→272, push к x=104

### 5. display.cpp — drawing API миграция

- [x] `spr.*` → `canvas->*` для стандартных примитивов (fillRect, fillCircle, drawLine, etc.)
- [x] `drawArc` → `fillArc` с конвертацией углов (−90°)
- [x] `setTextFont(n)` + `setTextDatum(X_DATUM)` + `drawString` → getCursor + getTextBounds + print
- [x] `drawWideLine` → thick line helper
- [x] `drawNumber` → sprintf + centered print
- [x] Needle dot angle в draw_error_arc: sin/cos → переставить оси (GFX: x=cos, y=sin)

### 6. main.cpp

- [x] Убрать `SPI.begin(12, -1, 11, -1)` — SPI больше не нужен для дисплея

### 7. Проверка после сборки

- [x] Успешная компиляция без ошибок
- [x] Проверить подсветку (должна включаться)
- [x] Проверить направление дуг (по часовой? правильная позиция?)
- [x] Проверить шрифт и размеры текста
- [x] Протестировать push_frame: изображение появляется в центре без артефактов
- [x] Проверить WiFi + WS соединение (нетронуты)

---

## Лог выполнения

### 2026-04-26

- Куплен JC4827W543N (480×272, QSPI, NV3041A, без тача)
- Создан план портирования
- Реализованы изменения: platformio.ini, display.h, display.cpp, main.cpp
- Обновлены display_design_brief.md
