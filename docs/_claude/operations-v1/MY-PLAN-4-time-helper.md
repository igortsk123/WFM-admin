# MY-PLAN-4: Time formatting helper (минуты/часы/дни)

**Размер:** малый.
**Зависимости:** нет.
**Затрагивает:** новый util + ~10 мест применения.

## Контекст

User: «Сколько дней назад выкладка молочки сделана, написано — это нереалистично. То есть тут обычно не в днях, а в минутах и в часах. Поэтому надо предусмотреть, что здесь могут быть сколько минут назад, сколько часов назад и сколько дней назад.»

## Задачи

### 4.1. Helper `formatRelativeTime`

**Файл:** `lib/utils/time-relative.ts` (создать новый или дополнить `lib/utils/format.ts`)

Логика:
```ts
export function formatRelativeTime(iso: string, locale: 'ru' | 'en' = 'ru'): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return locale === 'ru' ? 'только что' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return locale === 'ru'
      ? formatPlural(diffMin, ['минуту', 'минуты', 'минут']) + ' назад'
      : `${diffMin} min ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return locale === 'ru'
      ? formatPlural(diffHour, ['час', 'часа', 'часов']) + ' назад'
      : `${diffHour}h ago`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) {
    return locale === 'ru'
      ? formatPlural(diffDay, ['день', 'дня', 'дней']) + ' назад'
      : `${diffDay}d ago`;
  }
  // >= 30 days — fallback to dd MMM yyyy
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(iso));
}

function formatPlural(n: number, forms: [string, string, string]): string {
  // 1 минуту / 2 минуты / 5 минут
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ${forms[2]}`;
  if (mod10 === 1) return `${n} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${forms[1]}`;
  return `${n} ${forms[2]}`;
}
```

### 4.2. Места применения — найти и заменить

Поиск:
- `grep -rn "дней назад"` в components/
- `grep -rn "formatRelative"` (если уже есть похожий хелпер)
- `grep -rn "hours.*ago"`

Применить во всех найденных местах. Обычно:
```tsx
// было
<span>{N} дней назад</span>
// стало
<span>{formatRelativeTime(item.created_at, locale)}</span>
```

Ожидаемые места (примерно):
- Tasks Review — карточки задач "сколько назад"
- Task Detail — history events
- Notifications Center
- Audit Log
- Schedule history events
- Goals — "Установлена X дней назад"
- Bonus tasks — "Опубликована X назад"

### 4.3. Существующий formatRelative

В проекте уже может быть `lib/utils/format.ts` с `formatRelative`. Если есть — расширить логикой минут/часов. Если он использует date-fns — использовать `formatDistanceToNow` с `addSuffix` параметром.

```ts
import { formatDistanceToNow } from 'date-fns';
import { ru, enGB } from 'date-fns/locale';

export function formatRelative(date: Date, locale: 'ru' | 'en'): string {
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: locale === 'ru' ? ru : enGB,
  });
}
```

Если date-fns уже подключен — использовать его (он уже корректно даёт минуты/часы/дни).

### 4.4. Проверить на 30+ дней

Если события давно были (>30 дней) — fallback на абсолютную дату "12 апр 2026". Хелпер уже это делает в шаге 4.1.

## Verification

- `tsc --noEmit` zero errors
- Tasks Review — открыть задачу созданную несколько минут назад → "X минут назад"
- Аналогично 2 часа назад → "2 часа назад"
- 3 дня → "3 дня назад"
- 40 дней → "12 апр 2026" (абсолютная)
