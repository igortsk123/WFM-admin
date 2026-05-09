"use client"

import * as React from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyState } from "./empty-state"
import { InboxIcon } from "lucide-react"

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableShellProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyMessage?: { title: string; description: string }
  pagination?: PaginationState
  onSort?: (columnId: string, direction: "asc" | "desc" | false) => void
  onRowClick?: (row: TData, event: React.MouseEvent) => void
  className?: string
}

export function DataTableShell<TData>({
  columns,
  data,
  isLoading = false,
  isError = false,
  isEmpty = false,
  emptyMessage,
  pagination,
  onSort,
  onRowClick,
  className,
}: DataTableShellProps<TData>) {
  const t = useTranslations("common")
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      setSorting(next)
      if (onSort && next.length > 0) {
        onSort(next[0].id, next[0].desc ? "desc" : "asc")
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: !!pagination,
    manualSorting: !!onSort,
  })

  if (isError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {t("error")}
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="size-3.5 mr-1.5" />
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-0 transition-opacity duration-200",
        className
      )}
    >
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isEmpty || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={InboxIcon}
                    title={emptyMessage?.title ?? t("empty")}
                    description={emptyMessage?.description ?? t("noResults")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "animate-in fade-in",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={(e) => onRowClick?.(row.original, e)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-1 py-3">
          <p className="text-sm text-muted-foreground">
            {t("page")} {pagination.page}{" "}
            {t("of")} {Math.ceil(pagination.total / pagination.pageSize)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
