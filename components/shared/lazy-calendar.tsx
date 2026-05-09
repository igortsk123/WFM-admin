"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Lazy wrapper around the shadcn `Calendar` primitive.
 *
 * `react-day-picker` ships ~14.7 kB gz and was previously eager-loaded by
 * 34 routes (any screen with a date filter / date field). Routing this
 * import through `next/dynamic` defers it until the user actually opens
 * a popover/dialog containing the calendar.
 */
export const LazyCalendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => m.Calendar),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-[260px]" />,
  }
)
