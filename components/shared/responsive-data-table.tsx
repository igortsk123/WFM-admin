"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTableShell, type PaginationState } from "./data-table-shell"
import { EmptyState } from "./empty-state"
import { InboxIcon } from "lucide-react"

interface ResponsiveDataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  mobileCardRender: (row: TData) => React.ReactNode
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyMessage?: { title: string; description: string }
  pagination?: PaginationState
  onRowClick?: (row: TData, event: React.MouseEvent) => void
  className?: string
}

export function ResponsiveDataTable<TData>({
  columns,
  data,
  mobileCardRender,
  isLoading = false,
  isError = false,
  isEmpty = false,
  emptyMessage,
  pagination,
  onRowClick,
  className,
}: ResponsiveDataTableProps<TData>) {
  const t = useTranslations("common")
  const showEmpty = isEmpty || (!isLoading && data.length === 0)

  return (
    <>
      {/* Desktop ≥ md */}
      <div className={cn("hidden md:block", className)}>
        <DataTableShell
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          isEmpty={isEmpty}
          emptyMessage={emptyMessage}
          pagination={pagination}
          onRowClick={onRowClick}
        />
      </div>

      {/* Mobile < md */}
      <div className={cn("flex flex-col gap-2 md:hidden", className)}>
        {isLoading ? (
          <div
            className="contents transition-opacity duration-200"
            aria-busy="true"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : showEmpty ? (
          <EmptyState
            icon={InboxIcon}
            title={emptyMessage?.title ?? t("empty")}
            description={emptyMessage?.description ?? t("noResults")}
          />
        ) : (
          data.map((row, i) => (
            <div
              key={i}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                "bg-card border border-border rounded-lg p-4 animate-in fade-in",
                onRowClick && "cursor-pointer active:bg-muted/50 transition-colors"
              )}
              onClick={(e) => onRowClick?.(row, e)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                  onRowClick(row, e as unknown as React.MouseEvent)
                }
              }}
            >
              {mobileCardRender(row)}
            </div>
          ))
        )}

        {pagination && pagination.total > 0 && !isLoading && (
          <div className="flex items-center justify-between px-1 py-2">
            <p className="text-sm text-muted-foreground">
              {t("page")} {pagination.page} {t("of")}{" "}
              {Math.ceil(pagination.total / pagination.pageSize)}
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                className="text-sm text-primary disabled:text-muted-foreground"
              >
                {t("previous")}
              </button>
              <button
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                className="text-sm text-primary disabled:text-muted-foreground"
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
