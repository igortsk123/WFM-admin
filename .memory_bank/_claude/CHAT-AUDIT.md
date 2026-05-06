# Аудит оставшихся 42 V0-чатов — pattern, foundation, reuse

> Обновлено: 2026-05-02. После завершения чата пометить ✅ в колонке `done`.
>
> **Колонки:**
> - `pattern` — какой паттерн из PATTERNS.md
> - `foundation` — нужен ли отдельный Claude-PR с types/mocks/API/i18n: `Y` / `N` / `partial` (что-то уже есть, добавить недостающее)
> - `reuse_from` — какой существующий компонент скопировать как scaffold (Level 2 reuse)
> - `notes` — особенности чата
> - `done` — отмечать после успешного мерджа V0 PR

---

## M0 — Раздел 06 (chats 22-41)

| chat | screen | pattern | foundation | reuse_from | notes | done |
|---|---|---|---|---|---|---|
| 22 | employees-list | list-with-filters | partial | tasks-list.tsx | User type есть, ListParams + i18n keys + page-wrapper | foundation ✅ (PR #44), V0 ✅ ($1.3, PR #45) |
| 22a | employees-list-patch | (patch) | N | — | прямо к V0 | V0 ✅ ($4 — дорого, V0 re-discoverил 1551-строчный монолит) + Claude fix #49 (missing icons) |

> **Правило (после 22a/23a):** patch-чат с новыми API-полями / i18n namespace / новыми табами / новыми Dialog-flows — это **extension**, не patch. Foundation от Claude всё равно нужен (extend types/API + новые i18n keys), иначе V0 делает foundation сам и платит +$1.5-2.
| 23 | employee-detail | detail-screen | partial | task-detail.tsx | UserDetail type, getUserById есть; добавить i18n + page-wrapper | ⚠ V0 параллельно с моим foundation сделал свой (PR #50). Мой #48 закрыт без мерджа. **Lesson:** не запускать V0-чат пока foundation-PR не мерджен в main |
| 23a | employee-detail-patch | extension (был помечен patch) | Y (надо было) | — | UserDetail.agent_name+payment_mode, freelance_hero/services/payouts/rating i18n, Block/Activate API | V0 ✅ ($3 — мог быть $1.5 если бы я сделал foundation; сделал foundation сам) |
| 24 | employee-create | crud-form | Y | task-form.tsx | UserCreateData type, createUser API, page-wrappers new+edit | foundation ✅ (PR #52, в main) |
| 24a | employee-create-patch | extension | Y | — | UserCreateData.agent_id+oferta_channel, OfertaChannel type, i18n freelance_alert/oferta/agent | foundation ✅ (PR #55) + V0 ✅ (PR #56, в main) + bonus zod-v4 fix |
| 25 | permissions-matrix | custom | partial | — | специфичный UI (матрица); добавить bulkAssignPermission API + i18n | foundation ✅ (PR #58, в main) |
| 26 | stores-list | list-with-filters | partial | tasks-list.tsx | Store type есть, ListParams + i18n + page-wrapper | foundation ✅ #60 + V0 ✅ #62 |
| 27 | store-detail | detail-screen | Y | task-detail.tsx | StoreDetail type, get/update/archive/restore/syncLamaForStore/getStoreHistory, i18n, page-wrapper | foundation ✅ #61 + V0 ✅ #63 |
| 28 | schedule | custom (calendar) | Y | — | ScheduleView/ScheduleParams/ScheduleSlot/ScheduleResponse + getSchedule + reopenShift + forceCloseShift | foundation ✅ #64 + V0 ✅ #65 |
| 29 | shift-detail | detail-screen | partial | task-detail.tsx | ShiftDetail extended (user_avatar, position_name, zone_breakdown, breaks, late/overtime_reason, tasks с planned/actual minutes) + ShiftHistoryEvent + getShiftHistory + markShiftLate/Overtime + cancelShift | foundation ✅ #66 (+ bonus stores-list type fix) |
| 30 | taxonomy-work-types | list-with-filters | partial | tasks-list.tsx | WorkType type есть; WorkTypeListParams + WorkTypeWithCount.usage_count за 30 дней + getWorkTypes с фильтрами | foundation ✅ #67 |
| 31 | taxonomy-zones | list-with-filters | partial | tasks-list.tsx | ZoneListParams + ZoneWithCounts.store_name + getZones с фильтрами | foundation ✅ #70 |
| 32 | taxonomy-positions | list-with-filters | partial | tasks-list.tsx | PositionListParams + PositionWithCounts.role_label + getPositions с реальным employees_count | foundation ✅ #71 |
| 33 | hints | list-with-filters + drag-drop | partial | tasks-list.tsx | HintWithLabels + HintsListParams + HintsCoverage + getAllHints + getHintsCoverage + reorderHints | foundation ✅ #72 |
| 33b | regulations | list+crud-form | Y | task-form.tsx | RegulationListParams (multi tags + untagged_only) + RegulationsStats + getRegulationsStats | foundation ✅ #73 |
| 34 | notifications | list-with-filters | partial | tasks-list.tsx | Notification type есть; markRead/archive есть; i18n + page-wrapper | |
| 34a | notifications-patch | (patch) | N | — | прямо к V0 | |
| 35 | profile | settings-screen | partial | — | getCurrentUser, updateUserLocale; добавить i18n + page-wrapper | |
| 35a | profile-patch | (patch) | N | — | прямо к V0 | |
| 36 | settings-organization | settings-screen | Y | — | OrganizationConfig type, get/update API, i18n, page-wrapper | |
| 36a | settings-organization-patch | (patch) | N | — | прямо к V0 | |
| 37 | integrations | list+settings | partial | — | IntegrationsStatus есть; добавить webhooks CRUD + i18n + page-wrapper | |
| 37a | integrations-patch | (patch) | N | — | прямо к V0 | |
| 38 | audit | list-with-filters | partial | tasks-list.tsx | getAuditEntries есть; добавить i18n + page-wrapper | |
| 38a | audit-patch | (patch) | N | — | прямо к V0 | |
| 39 | reports-kpi | report-dashboard | Y | network-health-tab.tsx | KpiReportData type, getKpiReport, i18n, page-wrapper | |
| 40 | reports-plan-fact | report-dashboard | Y | network-health-tab.tsx | PlanFactReportData type, getPlanFactReport, i18n, page-wrapper. **[Max] — V0 в Plan Mode** | |
| 41 | reports-compare | report-dashboard | Y | network-health-tab.tsx | StoreCompareReportData, getStoreCompareReport, i18n, page-wrapper | |

---

## M1 — Раздел 07 priority (chats 42-48)

| chat | screen | pattern | foundation | reuse_from | notes | done |
|---|---|---|---|---|---|---|
| 42 | goals | list+crud (max) | Y | task-form.tsx | Goal/GoalProposal types есть; API есть; i18n + page-wrappers + AI-suggestions hookup. **[Max]** | |
| 43 | hints-upload | wizard | Y | — | HintsParseResult type есть; download/parse/apply API есть; i18n + page-wrapper | |
| 44 | bonus-tasks | list-with-filters (max) | Y | tasks-list.tsx | BonusTaskWithSource есть; metrics + budgets API; i18n + page-wrapper. **[Max]** | |
| 44a | bonus-tasks-patch | (patch) | N | — | прямо к V0 | |
| 45 | payouts | list-with-filters | partial | tasks-list.tsx | PayoutPeriod type есть; period CRUD + calculate + finalize API; i18n + page-wrapper | |
| 46 | ai-suggestions | custom (cards list) | Y | — | AISuggestionListParams есть; accept/reject/edit API есть; i18n + page-wrapper. **[Max]** | |
| 47 | ai-chat | custom (chat UI) | Y | — | thread CRUD + sendMessage + feedback API есть; i18n + page-wrapper. **[Max]** — heavy V0 UI | |
| 48 | network-goals-dashboard | report-dashboard (max) | Y | network-health-tab.tsx | NetworkGoalStore + AiPerformance types; getNetworkGoals + getAiPerformance; i18n + page-wrapper. **[Max]** | |

---

## M2 — Раздел 08 stretch (chats 49-51, опциональные)

| chat | screen | pattern | foundation | reuse_from | notes | done |
|---|---|---|---|---|---|---|
| 49 | ai-coach | custom | Y | — | AI advisor screen, mostly UI; types/API нужно создать | |
| 50 | risk-scoring | settings+list | Y | — | risk rules, скоринг; foundation needed | |
| 51 | leaderboards | report-dashboard | Y | — | board-style ranking UI | |

---

## Раздел 09 — Freelance (chats 52-63)

| chat | screen | pattern | foundation | reuse_from | notes | done |
|---|---|---|---|---|---|---|
| 52 | freelance-dashboard | report-dashboard | Y | network-health-tab.tsx | FreelanceMetrics type; getFreelanceDashboard API; i18n + page-wrapper | |
| 53 | applications-list | list-with-filters | partial | tasks-list.tsx | FreelanceApplication type есть; filters + i18n + page-wrapper | |
| 54 | application-new | crud-form | Y | task-form.tsx | createFreelanceApplication есть; формa wizard-like; i18n + page-wrapper | |
| 55 | application-detail | detail-screen (max) | Y | task-detail.tsx | applicationDetail type; approve* / reject / cancel / replaceWithBonus / approveMixed API; i18n + page-wrapper. **[Max]** | |
| 56 | services-list | list-with-filters | partial | tasks-list.tsx | Service type есть; confirmService / disputeService / markNoShow / adjust; i18n + page-wrapper | |
| 57 | payouts-list | list-with-filters | partial | tasks-list.tsx | Payout type есть; getPayouts + retryPayout + closing-doc; i18n + page-wrapper | |
| 58 | budget-limits | settings+list | Y | — | BudgetLimit + Usage types; CRUD + getBudgetUsage; i18n + page-wrapper | |
| 59 | agents-list | list-with-filters | partial | tasks-list.tsx | Agent type есть; CRUD + block + earnings; i18n + page-wrapper | |
| 60 | agent-detail | detail-screen | partial | task-detail.tsx | AgentDetail type; getAgentEarnings; i18n + page-wrapper | |
| 61a | agent-layout-dashboard | agent-cabinet (max) | Y | — | AGENT role isolated layout + dashboard; AGENT_ROUTES; i18n. **[Max]** | |
| 61b | agent-freelancers | list-with-filters | partial | tasks-list.tsx | getMyFreelancers; i18n + page-wrapper | |
| 61c | agent-earnings | report-dashboard | partial | network-health-tab.tsx | getMyEarnings; i18n + page-wrapper | |
| 61d | agent-documents | list-with-filters | partial | tasks-list.tsx | getMyDocuments; i18n + page-wrapper | |
| 62 | external-hr-config | settings-screen | Y | — | ExternalHrConfig type; get/update/triggerSync; getExternalHrSyncLogs; i18n + page-wrapper | |
| 63 | service-norms | list-with-filters | partial | tasks-list.tsx | ServiceNorm type есть; CRUD; i18n + page-wrapper | |

---

## Сводка

- **Всего: 42 чата**
- **Foundation Y (полный):** 17
- **Foundation partial:** 16
- **Foundation N (patches и прочее):** 9

Среднее время на foundation:
- partial: ~15 мин
- full Y: ~25-30 мин
- patch: 0 мин (прямо к V0)

**Total Claude work:** ~10-12 часов на все 42 экрана. В рамках MAX-подписки $0.

---

## Workflow per-chat

1. Юзер открывает следующий по номеру `XX-...-pro.md` или `-max.md`
2. Если в этой таблице `foundation` ≠ N — пишет Claude: «делаем foundation для chat XX»
3. Claude читает V0-промпт + текущий repo state, делает PR
4. После мерджа — юзер кидает V0-промпт в V0 (с уже добавленным CONTEXT-PACK блоком)
5. После V0 PR мерджа — отметить `done: ✅` в этой таблице
