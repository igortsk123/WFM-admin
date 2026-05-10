# AI-цели roadmap (4 волны пилотов)

Источник: `.memory_bank/business/deep-research-report.md`.
Сетевая выручка 25 млрд ₽/год → 480,8 млн ₽/нед.

## Wave A — OOS + Phantom (foundation)

- Срок: 4 нед baseline + 8 нед test.
- Scope: 600 high-velocity SKU, 30 treatment + 30 control магазинов.
- Success: OOS −0,7 п.п. vs control; phantom alert precision ≥60%; SLA close <24 ч.
- Цели в admin: `goal-oos-active`, `goal-phantom-oos` (`tier: "priority"`, `pilot_wave: "A"`).
- Денежный эффект: 0,81 млн ₽/нед (OOS) + 0,28 млн ₽/нед (phantom).

## Wave B — Fresh write-offs

- Срок: 4 нед baseline + 12 нед test.
- Scope: 250-300 perishables (хлеб, молочка, готовая еда, овощи-фрукты).
- Success: Write-off rate −0,25 п.п. vs control; OOS не ухудшается >0,1 п.п.
- Цели в admin: `goal-writeoffs-1` (`tier: "priority"`, `pilot_wave: "B"`).
- Денежный эффект: 0,35 млн ₽/нед.

## Wave C — Promo allocation optimizer

- Срок: 8-10 нед, 3 промо-цикла.
- Scope: 100-150 promo SKU.
- Success: D+7 residual stock −3 п.п.; promo WAPE −15%.
- Цели в admin: `goal-promo-1` («Остатки после акции», `tier: "priority"`, `pilot_wave: "C"`).
- Денежный эффект: 2,00 млн ₽/мес (~0,46 млн ₽/нед).

## Wave D — Slow stock cleanup

- Срок: 12-16 нед.
- Scope: 300-500 tail SKU без сезонного оправдания.
- Success: ≥8 млн ₽ released stock; service-level не падает >0,1 п.п.
- Цели в admin: `goal-slowmoving-1` («Залежавшийся товар», `tier: "priority"`, `pilot_wave: "D"`).
- Денежный эффект: 0,11 млн ₽/нед постоянной экономии + 12 млн ₽ единоразового высвобождения капитала.

## Итог

- Total recurring: **85-95 млн ₽/год** (de-duplicated, с учётом перекрытий OOS↔phantom и OOS↔promo).
- One-off: **10-15 млн ₽** разового высвобождения оборотного капитала.

## Топология в admin

- 5 priority-целей идут наверх каталога (`CATALOG_GOALS.fmcg`) и `MOCK_GOALS`.
- Остальные ≥11 целей размечены `tier: "secondary"` — они остаются как catalog,
  но в roadmap не входят и пилотируются позже либо в формате additional-волн.
- В UI `priority` цели получают чип «Волна A/B/C/D» рядом с `CategoryBadge`
  (компонент `PilotWaveBadge`).

## Дополнительные artefacts

- Стек, KPI dictionary, alerting logic — см. полный отчёт
  `.memory_bank/business/deep-research-report.md`.
- Backend sync: `lib/api/_backend-types.ts` (`BackendGoalTier`,
  `BackendPilotWave`, поля `BackendGoal.tier`/`pilot_wave`),
  `MIGRATION-NOTES.md` секция «Goal extension — priority tier и pilot wave».
- Тип в admin: `lib/types/index.ts` (`GoalTier`, `PilotWave`, поля
  `Goal.tier`/`Goal.pilot_wave`).
- UI: `components/features/goals/goals-screen/pilot-wave-badge.tsx`
  + wiring в `active-goal-banner.tsx` и `ai-proposals-section.tsx`.
