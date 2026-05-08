"use client"

import * as React from "react"

import type { TaskWithAvatar } from "@/lib/api/tasks"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

import { QueueRow } from "./queue-row"
import { PAGE_SIZE, type TFn } from "./_shared"

export interface QueueListProps {
  tasks: TaskWithAvatar[]
  total: number
  isLoading: boolean
  selectedId: string | null
  onSelect: (task: TaskWithAvatar) => void
  onLoadMore: () => void | Promise<void>
  t: TFn
  locale: string
}

export function QueueList({
  tasks,
  total,
  isLoading,
  selectedId,
  onSelect,
  onLoadMore,
  t,
  locale,
}: QueueListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 border rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    )
  }

  const hasMore = tasks.length < total

  return (
    <ScrollArea className="lg:h-[calc(100vh-180px)]">
      <div className="flex flex-col gap-1.5 pr-4">
        {tasks.map((task) => (
          <QueueRow
            key={task.id}
            task={task}
            isSelected={task.id === selectedId}
            onClick={() => onSelect(task)}
            t={t}
            locale={locale}
          />
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1"
            onClick={() => onLoadMore()}
          >
            {t("load_more", { count: Math.min(PAGE_SIZE, total - tasks.length) })}
          </Button>
        )}
      </div>
    </ScrollArea>
  )
}
