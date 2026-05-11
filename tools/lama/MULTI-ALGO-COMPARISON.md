# Multi-Algo Backtest — сравнение 13 алгоритмов

_Train: 2026-05-07..2026-05-10 (4 дней)._
_Test: 2026-05-11 (2145 tasks)._

Research-only. Production-алгоритм НЕ менялся.

## 1. Сводная таблица — primary split (4-day train → 1-day test)

| # | Algorithm | Overall % | Median per-shop % | % shops 60+ | % shops 50+ | Time, ms |
|---|---|---|---|---|---|---|
| 02 | `02_stickiness` | 38.8 | 39.6 | 14% | 23% | 7 |
| 03 | `03_stickiness_wt_fallback` | 38.6 | 39.0 | 14% | 23% | 6 |
| 11 | `11_ensemble_stick_wt` | 38.6 | 39.3 | 14% | 23% | 62 |
| 12 | `12_logistic_regression` | 35.1 | 36.6 | 12% | 22% | 1111 |
| 10 | `10_iter5_mirror` | 26.2 | 26.4 | 8% | 16% | 162 |
| 09 | `09_workload_balance` | 24.5 | 23.4 | 2% | 5% | 57 |
| 05 | `05_zone_affinity` | 23.8 | 20.3 | 5% | 14% | 50 |
| 01 | `01_random` | 23.7 | 25.0 | 2% | 6% | 57 |
| 08 | `08_time_cluster` | 18.0 | 15.4 | 0% | 5% | 38 |
| 06 | `06_shop_wtype` | 14.9 | 13.7 | 0% | 6% | 24 |
| 04 | `04_wtype_affinity` | 14.8 | 13.7 | 0% | 6% | 24 |
| 07 | `07_position_rules` | 14.5 | 13.9 | 0% | 6% | 25 |
| 13 | `13_hungarian` | 11.3 | 11.4 | 0% | 0% | 384 |

## 2. Leave-one-out (5 splits — каждый день тест на остальных 4)

| Algorithm | mean % | min | max | std |
|---|---|---|---|---|
| `12_logistic_regression` | 28.2 | 18.5 | 39.2 | 8.7 |
| `05_zone_affinity` | 28.0 | 20.1 | 35.8 | 6.1 |
| `09_workload_balance` | 27.5 | 24.5 | 33.1 | 3.4 |
| `01_random` | 27.4 | 21.9 | 32.3 | 4.1 |
| `11_ensemble_stick_wt` | 25.9 | 12.7 | 41.9 | 13.4 |
| `02_stickiness` | 25.8 | 12.7 | 41.8 | 13.4 |
| `03_stickiness_wt_fallback` | 25.8 | 12.4 | 42.0 | 13.5 |
| `10_iter5_mirror` | 25.8 | 14.3 | 32.0 | 7.0 |
| `08_time_cluster` | 23.6 | 18.1 | 33.1 | 6.2 |
| `07_position_rules` | 16.0 | 7.8 | 20.3 | 5.1 |
| `04_wtype_affinity` | 16.0 | 7.2 | 20.7 | 5.4 |
| `06_shop_wtype` | 15.9 | 7.0 | 20.7 | 5.5 |
| `13_hungarian` | 12.1 | 11.3 | 13.4 | 0.8 |

## 3. Топ-3 лучших — почему они выигрывают

### `02_stickiness` — 38.8%
- Прямой сигнал: если вчера X делал в этом shop+zone+wt → сегодня скорее всего тоже X.
- лучшие категории: **КСО** 52/76 (68%), **Менеджерские операции** 60/102 (59%), **Выкладка** 564/1422 (40%)

### `03_stickiness_wt_fallback` — 38.6%
- Stickiness как primary, wtype-affinity как fallback для новых комбинаций.
- лучшие категории: **КСО** 52/76 (68%), **Менеджерские операции** 59/102 (58%), **Другие работы** 22/51 (43%)

### `11_ensemble_stick_wt` — 38.6%
- Вотинг между stickiness и wtype affinity.
- лучшие категории: **КСО** 53/76 (70%), **Менеджерские операции** 59/102 (58%), **Другие работы** 21/51 (41%)

## 4. Топ-3 худших — почему не работают

### `04_wtype_affinity` — 14.8%
- Global wtype-топ часто = «универсал-чемпион» на shop X, но в shop Y задачу делает совсем другой человек. Без shop-binding signal слабый.

### `07_position_rules` — 14.5%
- Покрывает только Касса/Менеджерские/КСО/Инвентаризация — остальные wtypes без правил.

### `13_hungarian` — 11.3%
- Global optimum распределяет каждому task разного employee → искусственно равномерно. В реальности 1-2 employee per shop-day делают большинство задач — это противоположный паттерн.

## 5. Ablation study — что даёт iter#5 каждый компонент

Берём iter#5 (zone40/wtype35/shopWt5/stick10/rank5/load5), убираем компонент, нормируем веса.

| Drop | Overall % | Δ vs full | Median shop % | Δ shops 60+ |
|---|---|---|---|---|
| (full) | 26.2 | — | 26.4 | 8% |
| drop **zone** | 25.4 | -0.8 | 25.7 | -2% |
| drop **wtype** | 29.6 | +3.4 | 30.4 | +2% |
| drop **shop_wt** | 25.9 | -0.2 | 26.4 | -2% |
| drop **stickiness** | 23.8 | -2.4 | 21.7 | -5% |
| drop **rank** | 26.1 | -0.1 | 25.7 | +0% |
| drop **load** | 25.9 | -0.2 | 26.4 | +0% |

**Интерпретация Δ:** отрицательная = компонент даёт прирост (без него хуже); ≈0 = бесполезен; положительная = шум.

## 6. Per-task analysis

- Всего задач: 2145 · алгоритмов: 13
- **Лёгких** (≥70% алгоритмов угадали): 269 (13%)
- **Непредсказуемых** (≤10% алгоритмов угадали): 1096 (51%)

### Лёгкие — топ work_type
- **Выкладка**: 163 задач
- **Менеджерские операции**: 42 задач
- **КСО**: 22 задач
- **Касса**: 14 задач
- **Переоценка**: 11 задач

### Непредсказуемые — топ work_type
- **Выкладка**: 718 задач
- **Переоценка**: 149 задач
- **Касса**: 97 задач
- **Инвентаризация**: 53 задач
- **Менеджерские операции**: 37 задач

## 7. Per-employee analysis

См. DATA-INSIGHTS.md секция «Employee specialization» для полного разреза.

## 8. Рекомендация для iter#6

**Best single algo: `02_stickiness` @ 38.8% match.**

### Ablation выводы
- **Оставить** (drop → match падает ≥0.5pp): **zone, stickiness**
- **Выкинуть** (drop ≈ 0 или improvement): **wtype, shop_wt, rank, load**

  ⚠️ **drop wtype даёт +3.4pp** — это означает что global wtype-affinity ACTIVE HURTS iter#5. Не «бесполезен», а активно мешает. Скорее всего — глобальный wtype-топ выбирается за counts, но реальный исполнитель — рядовой emp в этом shop. Нужно либо убрать wtype, либо заменить на shop-binding версию.

### Реалистичный potential ceiling

**На текущих данных: ~39%** — лучший single algo (`02_stickiness`).

Несколько уровней потолков:

- **Lower bound (random):** 23.7% — пол любого фильтра zone/wtype + случайный выбор.
- **Single best (stickiness):** 38.8% — кто делал вчера → сегодня.
- **Ensemble plateau:** ~40-41% — стек лучших signal-ов добавит максимум 1-2pp.
- **Theoretical max (без новых данных):** ~50% — если бы делали perfect feature engineering (shop binding, position rules, hourly clusters) и фокус на 24% «узких» специалистов где предсказание тривиально.
- **>50% потолок:** требует новых data sources — фактический shift_id с emp_id, timestamps подтверждений в мобильном, реальные зональные закрепления из HR.

### Quick wins (≤1 час работы для iter#6)

1. **Stickiness-as-filter, не как 10% score:** на текущих данных stickiness single-day → +12pp над random. Использовать как hard candidate filter (если есть history N-1 → только sticky emp + его коллеги по shop), затем выбирать по zone/wtype affinity.
2. **Убрать global wtype-affinity из iter#5:** ablation показал что drop wtype = +3.4pp. Заменить на shop-bound: «кто в **этом shop** чаще всего делал этот wt».
3. **Жёсткие position rules:** КСО → Кассир касс самообслуживания (80% доминанта), Касса → Продавец-универсал (78%), Менеджерские → Заместитель управляющего (64%). Применить как pre-filter pool до scoring (см. DATA-INSIGHTS p.3).

### Длинные ставки (2-3 недели данных или новые интеграции)

1. **Окно training = 14+ дней** вместо 4. На 4 днях статистика по emp нестабильна (mean # tasks per emp = ~3). С 14 днями stickiness-set покроет больше комбинаций.
2. **Shift_id binding:** в backend есть `_shift_id` поле, но в snapshots оно redundant. Если получим **реальный график смен** (кто на смене в данный day-hour), это снимет половину false candidates.
3. **Position × work_type как hard constraint:** обнаружено 6 «жёстких» правил >70% доминанты (см. DATA-INSIGHTS p.3). В prod hardcode матрицу и применять как filter, не score.
4. **Per-shop модель** (вместо global): для каждого shop отдельная logistic regression. На 1 shop ~25 tasks/day × 14 days = 350 samples — достаточно для маленькой модели.
