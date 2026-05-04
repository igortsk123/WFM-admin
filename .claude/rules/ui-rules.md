---
description: Tailwind v4 tokens, shadcn, mobile-first responsive patterns. Loads when editing tsx components and globals.css.
paths:
  - "app/**/*.tsx"
  - "components/**/*.tsx"
  - "app/globals.css"
---

# UI Rules

## Tailwind v4 — конфигурация

```css
/* globals.css */
@import "tailwindcss";
@theme inline { ... }   /* OKLCH токены */
```

НЕТ `@tailwind directives` (v3 синтаксис).

## Semantic tokens — обязательно

```tsx
// ПРАВИЛЬНО
<div className="bg-card text-card-foreground border-border">
<Button className="bg-primary text-primary-foreground">

// ЗАПРЕЩЕНО
<div className="bg-white text-black border-gray-200">
<Button className="bg-blue-500 text-white">
```

Используй `bg-{primary|secondary|muted|accent|destructive|success|warning|card|popover|background|sidebar}` + соответствующий `-foreground`. Никаких `bg-blue-*`, `text-gray-*`, `bg-white`.

## Layout-grid critical rules

В `app/[locale]/(admin)/layout.tsx` внешний flex-wrapper ОБЯЗАН иметь `w-full`:

```tsx
<div className="flex min-h-screen w-full">  {/* w-full обязателен — без него flex-item коллапсится */}
  <AdminSidebar />
  <SidebarInset className="flex flex-col">
    <AdminTopBar />
    <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
      <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
    </main>
  </SidebarInset>
</div>
```

То же для `app/[locale]/(auth)/layout.tsx`:
```tsx
<div className="flex min-h-svh w-full bg-background">{children}</div>
```

## Mobile-first responsive

Breakpoints (Tailwind v4): `sm=640`, `md=768`, `lg=1024`, `xl=1280`.

**Pri-1 mobile роли:** STORE_DIRECTOR (торговый зал) + SUPERVISOR (в дороге).

Каждый screen-компонент должен явно прописывать поведение на `<md`:
- Sidebar → MobileBottomNav (5 пунктов)
- Tables → cards (через `ResponsiveDataTable`)
- Detail screens → single-column stack
- Filter row → `MobileFilterSheet` с button «Фильтры (N)»
- Sticky bottom bars → `h-14` full-width buttons
- Touch targets ≥44px

## Иконки

Только `lucide-react`. Никаких эмодзи в UI.

## next/image

Для картинок в `components/shared/admin-sidebar.tsx` и других — использовать `next/image`, не `<img>`. Сейчас в коде `<img>` накапливается warnings — чистить через TECH-DEBT.

## Что проверить перед использованием shared-компонента

- `TaskStateBadge` принимает `state` (не `status`)
- `ReviewStateBadge` принимает `reviewState` (не `state`)
- `ShiftStateBadge` — открой файл и сверь
- Перед import из `@/components/shared/<x>` — Read файла, посмотри на `interface XProps`
