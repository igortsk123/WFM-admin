# Сервис svc_shifts

> ⚠️ **УСТАРЕВШИЙ ДОКУМЕНТ**
>
> Сервис `svc_shifts` **объединён с `svc_tasks`** (миграция выполнена 2026-03-12).
>
> - Таблицы `shifts_plan` и `shifts_fact` перенесены в базу `wfm_tasks`
> - Эндпоинты смен теперь доступны по префиксу `/shifts/` через `svc_tasks` (порт 8000)
> - Отдельного контейнера `svc_shifts` больше не существует
>
> **Актуальная документация:**
> - Сервис: `.memory_bank/backend/services/svc_tasks.md`
> - API смен: `.memory_bank/backend/apis/api_shifts.md`
