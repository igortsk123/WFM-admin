"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  CheckCircle2,
  SearchX,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Lightbulb,
  ExternalLink,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useLocale } from "next-intl"

import type { SubtaskWithTaskTitle } from "@/lib/api/tasks"
import {
  getSubtasksPending,
  approveSubtask,
  rejectSubtask,
} from "@/lib/api/tasks"
import { getStores } from "@/lib/api/stores"
import { getWorkTypes, getZones } from "@/lib/api/taxonomy"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { PageHeader } from "@/components/shared/page-header"
import { FilterChip } from "@/components/shared/filter-chip"
import { UserCell } from "@/components/shared/user-cell"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function relativeTime(isoDate: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const diff = new Date(isoDate).getTime() - Date.now()
  const absDiff = Math.abs(diff)
  if (absDiff < 60 * 1000) return rtf.format(Math.round(diff / 1000), "second")
  if (absDiff < 60 * 60 * 1000) return rtf.format(Math.round(diff / 60000), "minute")
  if (absDiff < 24 * 60 * 60 * 1000) return rtf.format(Math.round(diff / 3600000), "hour")
  return rtf.format(Math.round(diff / 86400000), "day")
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ComboOption {
  value: string
  label: string
}

interface TableCol {
  key: string
  header: React.ReactNode
  cell: (row: SubtaskWithTaskTitle) => React.ReactNode
}

// ═══════════════════════════════════════════════════════════════════
// REJECT DIALOG
// ═══════════════════════════════════════════════════════════════════

interface RejectDialogProps {
  open: boolean
  title: string
  onConfirm: (reason: string) => void
  onClose: () => void
}

function RejectDialog({ open, title, onConfirm, onClose }: RejectDialogProps) {
  const t = useTranslations("screen.subtasksModeration")
  const tc = useTranslations("common")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (!open) setReason("")
  }, [open])

  const valid = reason.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="text-sm font-medium text-foreground">
            {t("reject_reason_label")}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reject_reason_placeholder")}
            className="min-h-[80px] resize-none"
            autoFocus
          />
          {!valid && reason.length > 0 && (
            <p className="text-xs text-destructive">{t("reject_reason_hint")}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            variant="destructive"
            disabled={!valid}
            onClick={() => onConfirm(reason)}
          >
            {t("btn_reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// COMBOBOX
// ═══════════════════════════════════════════════════════════════════

interface ComboboxFilterProps {
  placeholder: string
  options: ComboOption[]
  value: string
  onSelect: (v: string) => void
  className?: string
}

function ComboboxFilter({ placeholder, options, value, onSelect, className }: ComboboxFilterProps) {
  const [open, setOpen] = React.useState(false)
  const tc = useTranslations("common")
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[160px] h-9 font-normal", className)}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={tc("search")} className="h-9" />
          <CommandList>
            <CommandEmpty>{tc("noResults")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => { onSelect(""); setOpen(false) }}
              >
                <Check className={cn("mr-2 size-4", value === "" ? "opacity-100" : "opacity-0")} />
                {tc("all")}
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(v) => { onSelect(v); setOpen(false) }}
                >
                  <Check className={cn("mr-2 size-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ═══════════════════════════════════════════════════════════════════
// EXPAND SHEET (mobile)
// ═══════════════════════════════════════════════════════════════════

interface ExpandSheetProps {
  open: boolean
  subtask: SubtaskWithTaskTitle | null
  onClose: () => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

function ExpandSheet({ open, subtask, onClose, onApprove, onReject }: ExpandSheetProps) {
  const t = useTranslations("screen.subtasksModeration")

  if (!subtask) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-3 border-b mb-4">
          <SheetTitle className="text-base text-left">{t("expand_title")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("col_subtask")}</p>
            <p className="font-medium text-foreground">{subtask.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtask.work_type_name} · {subtask.zone_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("col_task")}</p>
            <Link
              href={ADMIN_ROUTES.taskDetail(subtask.task_id)}
              className="text-sm text-primary flex items-center gap-1"
              onClick={onClose}
            >
              {subtask.task_title}
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("col_store")}</p>
            <p className="text-sm text-foreground">{subtask.store_name}</p>
          </div>
          {subtask.proposed_by && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("col_proposed_by")}</p>
              <UserCell user={subtask.proposed_by} />
            </div>
          )}
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("col_duration")}</p>
              <span className="flex items-center gap-1 text-sm">
                <Clock className="size-3.5 text-muted-foreground" />
                {t("duration_min", { min: subtask.duration_min ?? 0 })}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("col_hints")}</p>
              <span className="flex items-center gap-1 text-sm">
                <Lightbulb className="size-3.5 text-muted-foreground" />
                {subtask.hints_count}
              </span>
            </div>
          </div>
          {subtask.hints_count > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("expand_hints")}</p>
              <p className="text-sm text-foreground">{t("expand_hints_count", { count: subtask.hints_count })}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("expand_no_hints")}</p>
          )}
          <div className="flex gap-3 pt-2 border-t">
            <Button
              className="flex-1 bg-success text-success-foreground hover:bg-success/90 h-11"
              onClick={() => { onApprove(subtask.id); onClose() }}
            >
              {t("btn_approve")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => { onReject(subtask.id); onClose() }}
            >
              {t("btn_reject")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ═══════════════════════════════════════════════════════════════════
// INLINE EXPAND ROW (desktop)
// ═══════════════════════════════════════════════════════════════════

interface ExpandRowProps {
  subtask: SubtaskWithTaskTitle
}

function ExpandRow({ subtask }: ExpandRowProps) {
  const t = useTranslations("screen.subtasksModeration")
  const locale = useLocale()

  return (
    <div className="bg-muted/30 border-t border-border px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{t("expand_used_in_tasks")}</p>
        <Link
          href={ADMIN_ROUTES.taskDetail(subtask.task_id)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
          target="_blank"
          rel="noreferrer"
        >
          {subtask.task_title}
          <ExternalLink className="size-3" />
        </Link>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">{t("expand_hints")}</p>
        <p className="text-sm text-foreground">
          {subtask.hints_count > 0
            ? t("expand_hints_count", { count: subtask.hints_count })
            : t("expand_no_hints")}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">{t("col_store")}</p>
        <p className="text-sm text-foreground">{subtask.store_name}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">{t("col_created")}</p>
        <p className="text-sm text-foreground">
          {subtask.created_at ? relativeTime(subtask.created_at, locale) : "—"}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function SubtasksModeration() {
  const t = useTranslations("screen.subtasksModeration")
  const tc = useTranslations("common")
  const locale = useLocale()

  // ── data state ──
  const [rows, setRows] = React.useState<SubtaskWithTaskTitle[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── filter options ──
  const [storeOptions, setStoreOptions] = React.useState<ComboOption[]>([])
  const [workTypeOptions, setWorkTypeOptions] = React.useState<ComboOption[]>([])
  const [zoneOptions, setZoneOptions] = React.useState<ComboOption[]>([])

  // ── active filters ──
  const [search, setSearch] = React.useState("")
  const [storeId, setStoreId] = React.useState("")
  const [workTypeId, setWorkTypeId] = React.useState("")
  const [zoneId, setZoneId] = React.useState("")

  // ── selection ──
  const [selected, setSelected] = React.useState<Set<number>>(new Set())

  // ── expand (desktop inline) ──
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  // ── expand sheet (mobile) ──
  const [sheetSubtask, setSheetSubtask] = React.useState<SubtaskWithTaskTitle | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // ── reject dialog ──
  const [rejectTarget, setRejectTarget] = React.useState<number | null>(null)
  const [rejectBulk, setRejectBulk] = React.useState(false)

  // ── load filter options ──
  React.useEffect(() => {
    Promise.all([getStores(), getWorkTypes(), getZones()]).then(([s, w, z]) => {
      setStoreOptions(s.data.map((x) => ({ value: String(x.id), label: x.external_code || x.name })))
      setWorkTypeOptions(w.data.map((x) => ({ value: String(x.id), label: x.name })))
      setZoneOptions(z.data.map((x) => ({ value: String(x.id), label: x.name })))
    })
  }, [])

  // ── load data ──
  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const res = await getSubtasksPending({
        search: search || undefined,
        store_id: storeId ? Number(storeId) : undefined,
        work_type_id: workTypeId ? Number(workTypeId) : undefined,
        zone_id: zoneId ? Number(zoneId) : undefined,
        page: 1,
        page_size: 50,
      })
      setRows(res.data)
      setTotal(res.total)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [search, storeId, workTypeId, zoneId])

  React.useEffect(() => { loadData() }, [loadData])

  // ── active filter chips ──
  const activeFilters = [
    storeId && { key: "store", label: t("filter_store"), value: storeOptions.find((o) => o.value === storeId)?.label ?? storeId, onRemove: () => setStoreId("") },
    workTypeId && { key: "workType", label: t("filter_work_type"), value: workTypeOptions.find((o) => o.value === workTypeId)?.label ?? workTypeId, onRemove: () => setWorkTypeId("") },
    zoneId && { key: "zone", label: t("filter_zone"), value: zoneOptions.find((o) => o.value === zoneId)?.label ?? zoneId, onRemove: () => setZoneId("") },
  ].filter(Boolean) as { key: string; label: string; value: string; onRemove: () => void }[]

  const clearAllFilters = () => { setStoreId(""); setWorkTypeId(""); setZoneId(""); setSearch("") }

  // ── approve ──
  const handleApprove = async (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    setTotal((prev) => prev - 1)
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
    const res = await approveSubtask(String(id))
    if (res.success) {
      toast.success(t("toast_approved"))
    } else {
      loadData()
    }
  }

  // ── reject ──
  const handleRejectConfirm = async (reason: string) => {
    if (rejectBulk) {
      const ids = Array.from(selected)
      setRows((prev) => prev.filter((r) => !selected.has(r.id)))
      setTotal((prev) => prev - ids.length)
      setSelected(new Set())
      setRejectTarget(null)
      setRejectBulk(false)
      await Promise.all(ids.map((id) => rejectSubtask(String(id), reason)))
      toast.success(t("toast_bulk_rejected", { count: ids.length }))
    } else if (rejectTarget !== null) {
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget))
      setTotal((prev) => prev - 1)
      setSelected((prev) => { const s = new Set(prev); s.delete(rejectTarget); return s })
      setRejectTarget(null)
      const res = await rejectSubtask(String(rejectTarget), reason)
      if (res.success) {
        toast.success(t("toast_rejected"))
      } else {
        loadData()
      }
    }
  }

  // ── bulk approve ──
  const handleBulkApprove = async () => {
    const ids = Array.from(selected)
    setRows((prev) => prev.filter((r) => !selected.has(r.id)))
    setTotal((prev) => prev - ids.length)
    setSelected(new Set())
    await Promise.all(ids.map((id) => approveSubtask(String(id))))
    toast.success(t("toast_bulk_approved", { count: ids.length }))
  }

  // ── select helpers ──
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.id)))
  }

  // ── columns ──
  const columns: TableCol[] = React.useMemo(
    () => [
      {
        key: "select",
        header: (
          <Checkbox
            checked={rows.length > 0 && selected.size === rows.length}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all"
          />
        ),
        cell: (sub) => (
          <Checkbox
            checked={selected.has(sub.id)}
            onCheckedChange={() => toggleSelect(sub.id)}
            aria-label={`Select ${sub.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: "name",
        header: t("col_subtask"),
        cell: (sub) => {
          const isExpanded = expandedId === sub.id
          return (
            <div className="flex flex-col min-w-0 max-w-[280px]">
              <button
                className="text-sm font-medium text-foreground hover:text-primary text-left truncate flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedId(isExpanded ? null : sub.id)
                }}
              >
                {sub.name}
                {isExpanded ? (
                  <ChevronUp className="size-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
              <span className="text-xs text-muted-foreground truncate">
                {sub.work_type_name} · {sub.zone_name}
              </span>
            </div>
          )
        },
      },
      {
        key: "task_title",
        header: t("col_task"),
        cell: (sub) => (
          <Link
            href={ADMIN_ROUTES.taskDetail(sub.task_id)}
            className="text-sm text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noreferrer"
          >
            <span className="truncate">{sub.task_title}</span>
            <ExternalLink className="size-3 shrink-0" />
          </Link>
        ),
      },
      {
        key: "store_name",
        header: t("col_store"),
        cell: (sub) => (
          <span className="text-sm text-foreground whitespace-nowrap">{sub.store_name}</span>
        ),
      },
      {
        key: "proposed_by",
        header: t("col_proposed_by"),
        cell: (sub) => {
          const p = sub.proposed_by
          if (!p) return <span className="text-muted-foreground text-sm">—</span>
          return <UserCell user={p} />
        },
      },
      {
        key: "duration_min",
        header: t("col_duration"),
        cell: (sub) => (
          <span className="flex items-center gap-1.5 text-sm text-foreground whitespace-nowrap">
            <Clock className="size-3.5 text-muted-foreground" />
            {t("duration_min", { min: sub.duration_min ?? 0 })}
          </span>
        ),
      },
      {
        key: "hints_count",
        header: t("col_hints"),
        cell: (sub) => (
          <span className="flex items-center gap-1.5 text-sm text-foreground">
            <Lightbulb className="size-3.5 text-muted-foreground" />
            {sub.hints_count}
          </span>
        ),
      },
      {
        key: "created_at",
        header: t("col_created"),
        cell: (sub) => {
          const d = sub.created_at
          if (!d) return <span className="text-muted-foreground text-sm">—</span>
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {relativeTime(d, locale)}
            </span>
          )
        },
      },
      {
        key: "actions",
        header: t("col_actions"),
        cell: (sub) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-success hover:bg-success/10 hover:text-success text-xs px-3"
              onClick={() => handleApprove(sub.id)}
            >
              {t("btn_approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs px-3"
              onClick={() => setRejectTarget(sub.id)}
            >
              {t("btn_reject")}
            </Button>
          </div>
        ),
      },
    ],
    [rows, selected, expandedId, t, locale]
  )

  // ── mobile card render ──
  const mobileCardRender = (sub: SubtaskWithTaskTitle) => (
    <div
      className="flex flex-col gap-2"
      onClick={() => {
        setSheetSubtask(sub)
        setSheetOpen(true)
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Checkbox
            checked={selected.has(sub.id)}
            onCheckedChange={() => toggleSelect(sub.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 shrink-0"
            aria-label={`Select ${sub.name}`}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
            <p className="text-xs text-muted-foreground truncate">{sub.task_title} · {sub.store_name}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground pl-8">
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" />
          {t("duration_min", { min: sub.duration_min ?? 0 })}
        </span>
        {sub.hints_count > 0 && (
          <span className="flex items-center gap-1">
            <Lightbulb className="size-3.5" />
            {sub.hints_count}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-1 pl-8">
        <Button
          size="sm"
          variant="ghost"
          className="h-9 flex-1 text-success hover:bg-success/10 hover:text-success text-xs touch-target"
          onClick={(e) => { e.stopPropagation(); handleApprove(sub.id) }}
        >
          {t("btn_approve")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs touch-target"
          onClick={(e) => { e.stopPropagation(); setRejectTarget(sub.id) }}
        >
          {t("btn_reject")}
        </Button>
      </div>
    </div>
  )

  // ── custom table with inline expand rows ──
  const tableData = rows
  const isEmpty = !isLoading && rows.length === 0
  const isFiltered = !!(search || storeId || workTypeId || zoneId)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("title")}
        subtitle={t("hint")}
        actions={
          !isLoading && total > 0 ? (
            <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/20 text-sm font-medium">
              {t("counter", { count: total })}
            </Badge>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Search — always visible */}
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm h-9"
          />
          {/* Desktop filters */}
          <div className="hidden md:flex items-center gap-2">
            <ComboboxFilter
              placeholder={t("filter_store")}
              options={storeOptions}
              value={storeId}
              onSelect={setStoreId}
            />
            <ComboboxFilter
              placeholder={t("filter_work_type")}
              options={workTypeOptions}
              value={workTypeId}
              onSelect={setWorkTypeId}
            />
            <ComboboxFilter
              placeholder={t("filter_zone")}
              options={zoneOptions}
              value={zoneId}
              onSelect={setZoneId}
            />
          </div>
        </div>

        {/* Mobile filter sheet */}
        <MobileFilterSheet
          activeCount={activeFilters.length}
          onClearAll={clearAllFilters}
          onApply={() => {}}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("filter_store")}</label>
              <ComboboxFilter
                placeholder={t("filter_store")}
                options={storeOptions}
                value={storeId}
                onSelect={setStoreId}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("filter_work_type")}</label>
              <ComboboxFilter
                placeholder={t("filter_work_type")}
                options={workTypeOptions}
                value={workTypeId}
                onSelect={setWorkTypeId}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("filter_zone")}</label>
              <ComboboxFilter
                placeholder={t("filter_zone")}
                options={zoneOptions}
                value={zoneId}
                onSelect={setZoneId}
                className="w-full"
              />
            </div>
          </div>
        </MobileFilterSheet>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilters.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                value={f.value}
                onRemove={f.onRemove}
              />
            ))}
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={clearAllFilters}
            >
              {tc("clearAll")}
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-3">
            {t("error_title")} — {t("error_desc")}
            <Button size="sm" variant="outline" onClick={loadData}>{tc("retry")}</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table — desktop */}
      <div className="hidden md:block">
        {isLoading ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {[48, 280, 200, 160, 180, 80, 60, 80, 140].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isEmpty ? (
          isFiltered ? (
            <EmptyState
              icon={SearchX}
              title={t("empty_filtered_title")}
              description={t("empty_filtered_desc")}
            />
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title={t("empty_queue_title")}
              description={t("empty_queue_desc")}
              className="[&_svg]:text-success"
            />
          )
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="text-left text-xs text-muted-foreground uppercase tracking-wide h-9 px-4 font-medium"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      className={cn(
                        "border-b border-border hover:bg-muted/20 transition-colors",
                        selected.has(row.id) && "bg-accent/30"
                      )}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 align-middle">
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={columns.length} className="p-0">
                          <ExpandRow subtask={row} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table — mobile */}
      <div className="md:hidden">
        <ResponsiveDataTable<SubtaskWithTaskTitle>
          columns={[]}
          data={rows}
          mobileCardRender={mobileCardRender}
          isLoading={isLoading}
          isEmpty={isEmpty}
          emptyMessage={
            isFiltered
              ? { title: t("empty_filtered_title"), description: t("empty_filtered_desc") }
              : { title: t("empty_queue_title"), description: t("empty_queue_desc") }
          }
        />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:sticky md:bottom-4 bg-card border-t md:border border-border md:rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t("bulk_selected", { count: selected.size })}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-success text-success hover:bg-success/10"
              onClick={handleBulkApprove}
            >
              {t("bulk_approve_all")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setRejectBulk(true)}
            >
              {t("bulk_reject_all")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={() => setSelected(new Set())}
            >
              <X className="size-4 mr-1" />
              {t("bulk_clear")}
            </Button>
          </div>
        </div>
      )}

      {/* Reject dialog (single) */}
      <RejectDialog
        open={rejectTarget !== null && !rejectBulk}
        title={t("reject_dialog_title")}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectTarget(null)}
      />

      {/* Reject dialog (bulk) */}
      <RejectDialog
        open={rejectBulk}
        title={t("bulk_reject_dialog_title")}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectBulk(false)}
      />

      {/* Mobile expand sheet */}
      <ExpandSheet
        open={sheetOpen}
        subtask={sheetSubtask}
        onClose={() => setSheetOpen(false)}
        onApprove={handleApprove}
        onReject={(id) => { setSheetOpen(false); setRejectTarget(id) }}
      />
    </div>
  )
}
