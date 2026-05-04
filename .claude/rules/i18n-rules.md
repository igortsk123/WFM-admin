---
description: next-intl t() rules, namespace conventions, ICU plural. Loads when editing tsx/ts and messages JSON.
paths:
  - "**/*.{ts,tsx}"
  - "messages/**/*.json"
---

# i18n Rules (next-intl)

## Конфигурация

- `next-intl` с `localePrefix: 'as-needed'`
- RU = default, без префикса (`/dashboard`)
- EN = с префиксом `/en/dashboard`
- `NuqsAdapter` обёрнут в `app/[locale]/layout.tsx` (один раз на уровень locale)

## ⚠ t() pitfalls — КРИТИЧНО

Функция `t(key)` из next-intl **НЕ принимает** option `{ defaultValue: '...' }`. Это API react-i18next, не next-intl.

```tsx
// ПРАВИЛЬНО
t('save')
t('greeting', { name })  // интерполяция
t(key as Parameters<typeof t>[0])  // динамический ключ

// ЗАПРЕЩЕНО (TS-error в zod v4 / build break)
t('save', { defaultValue: 'Сохранить' })
```

Отсутствующий ключ → next-intl auto-fallback на ru.json + console.warn в dev.

## Namespace конвенции

```
common.*           — save, cancel, back, loading, empty, ...
nav.*              — sidebar/topbar items
nav.role.*         — FunctionalRole labels (STORE_DIRECTOR / SUPERVISOR / ...)
nav.hub.*          — navigation hub group titles
task.state.*       — Task state labels
task.review.*      — Task review state labels
permission.*       — Permission codes (CASHIER / SALES_FLOOR / ...)
goal.category.*    — Goal categories
notification.category.*  — notification types
screen.<name>.*    — strings конкретного экрана (заголовки, hints, dialogs)
```

## Зеркальная структура

`messages/ru.json` и `messages/en.json` — структура один-в-один. Если ключ есть в одном — должен быть в другом. Иначе fallback на ru = wrong text для EN-юзера.

## ICU plural

Для счётчиков:
```json
"counter": "{count, plural, one {# сотрудник} few {# сотрудника} many {# сотрудников} other {# сотрудников}}"
```

EN — `one` + `other` достаточно. RU — `one`/`few`/`many`/`other` все нужны.

## Дата / число / валюта

Через `Intl.DateTimeFormat(locale, opts)` и `Intl.NumberFormat(locale, opts)`. Никаких `toLocaleString('ru-RU')` хардкодом — берём locale из `useLocale()`.

```tsx
const locale = useLocale()
const formatted = new Intl.NumberFormat(locale).format(amount)
```

## Mojibake

При ручном редактировании messages JSON — открывай в UTF-8 редакторе. V0 иногда корраптит юникод (`Организация` → `Органи����ация`). После V0 PR — глазами проверять nav секцию.

## Hardcoded RU запрет

```tsx
// ЗАПРЕЩЕНО
<Button>Сохранить</Button>
<h1>Сотрудники</h1>

// ПРАВИЛЬНО
const t = useTranslations('common')
<Button>{t('save')}</Button>
```

Исключение — только debug `console.log` и комментарии.
