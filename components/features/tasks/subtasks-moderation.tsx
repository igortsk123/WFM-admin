"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  CheckCircle2,
  SearchX,
  X,
  ChevronDown,
  Clock,
  ExternalLink,
  ChevronsUpDown,
  Check,
  User,
  UserCog,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useLocale } from "next-intl"

import type { SubtaskWithTaskTitle } from "@/lib/api/tasks"
import type { SubtaskSuggestionSource } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? ""
  const l = lastName?.[0] ?? ""
  return `${f}${l}`.toUpperCase() || "?"
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ComboOption {
  value: string
  label: string
}

// ═══════════════════════════════════════════════════════════════════
// SOURCE BADGE
// ═══════════════════════════════════════════════════════════════════

interface SourceBadgeProps {
  source?: SubtaskSuggestionSource
}

function SourceBadge({ source }: SourceBadgeProps) {
  const t = useTranslations("screen.subtasksModeration.source")

  if (source === "worker") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
        <User className="size-3 shrink-0" />
        {t("worker")}
      </span>
    )
  }

  if (source === "store_director") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted border border-border rounded-full px-2 py-0.5">
        <UserCog className="size-3 shrink-0" />
        {t("store_director")}
      </span>
    )
  }

  return null
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
// EXPANDED BODY
// ═══════════════════════════════════════════════════════════════════

interface ExpandedBodyProps {
  subtask: SubtaskWithTaskTitle
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

function ExpandedBody({ subtask, onApprove, onReject }: ExpandedBodyProps) {
  const t = useTranslations("screen.subtasksModeration")

  return (
    <div
      className="px-4 pb-4 pt-0 flex flex-col gap-4 border-t border-border mt-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Full subtask name */}
      <div className="pt-3">
        <p className="text-xs text-muted-foreground mb-0.5">{t("col_subtask")}</p>
        <p className="text-sm font-medium text-foreground">{subtask.name}</p>
      </div>

      {/* Linked task */}
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{t("expand_used_in_tasks")}</p>
        <Link
          href={ADMIN_ROUTES.taskDetail(subtask.task_id)}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          target="_blank"
          rel="noreferrer"
        >
          <span>{subtask.task_title}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </Link>
      </div>

      {/* Duration + hints row */}
      <div className="flex items-center gap-6">
        {subtask.duration_min != null && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("col_duration")}</p>
            <span className="flex items-center gap-1 text-sm text-foreground">
              <Clock className="size-3.5 text-muted-foreground" />
              {t("duration_min", { min: subtask.duration_min })}
            </span>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("expand_hints")}</p>
          <p className="text-sm text-foreground">
            {subtask.hints_count > 0
              ? t("expand_hints_count", { count: subtask.hints_count })
              : t("expand_no_hints")}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1 h-11 bg-success text-success-foreground hover:bg-success/90"
          onClick={() => onApprove(subtask.id)}
        >
          {t("btn_approve")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11 border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => onReject(subtask.id)}
        >
          {t("btn_reject")}
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SUBTASK CARD
// ═══════════════════════════════════════════════════════════════════

interface SubtaskCardProps {
  subtask: SubtaskWithTaskTitle
  isExpanded: boolean
  onToggle: () => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

function SubtaskCard({ subtask, isExpanded, onToggle, onApprove, onReject }: SubtaskCardProps) {
  const locale = useLocale()
  const p = subtask.proposed_by

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-colors cursor-pointer",
        "hover:bg-accent",
        isExpanded && "bg-accent/50"
      )}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      {/* Card header — always visible */}
      <div className="flex items-start gap-3 p-4 min-h-[44px]">
        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Top row: source badge */}
          <div className="flex items-center justify-between gap-2">
            <SourceBadge source={subtask.suggestion_source} />
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>

          {/* Subtask name */}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-relaxed">
            {subtask.name}
          </p>

          {/* Chips: work type + zone */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className="text-xs font-normal px-2 py-0.5 rounded-md"
            >
              {subtask.work_type_name}
            </Badge>
            {subtask.zone_name && subtask.zone_name !== "—" && (
              <Badge
                variant="outline"
                className="text-xs font-normal px-2 py-0.5 rounded-md"
              >
                {subtask.zone_name}
              </Badge>
            )}
          </div>

          {/* Author row */}
          {p && (
            <div className="flex items-center gap-2 pt-0.5">
              <Avatar className="size-6 shrink-0">
                <AvatarImage src={(p as { avatar_url?: string }).avatar_url} alt={`${p.first_name} ${p.last_name}`} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(p.first_name, p.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {p.last_name} {p.first_name}
                {p.middle_name ? ` ${p.middle_name[0]}.` : ""}
                {" · "}
                {subtask.created_at ? relativeTime(subtask.created_at, locale) : "—"}
              </span>
            </div>
          )}

          {/* Store + frequency for worker-sourced subtasks */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">{subtask.store_name}</span>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <ExpandedBody
          subtask={subtask}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON CARD
// ═══════════════════════════════════════════════════════════════════

function SubtaskCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-40" />
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

  // ── expand state ──
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  // ── reject dialog ──
  const [rejectTarget, setRejectTarget] = React.useState<number | null>(null)

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
    if (expandedId === id) setExpandedId(null)
    const res = await approveSubtask(String(id))
    if (res.success) {
      toast.success(t("toast_approved"))
    } else {
      loadData()
    }
  }

  // ── reject ──
  const handleRejectConfirm = async (reason: string) => {
    if (rejectTarget !== null) {
      const id = rejectTarget
      setRows((prev) => prev.filter((r) => r.id !== id))
      setTotal((prev) => prev - 1)
      if (expandedId === id) setExpandedId(null)
      setRejectTarget(null)
      const res = await rejectSubtask(String(id), reason)
      if (res.success) {
        toast.success(t("toast_rejected"))
      } else {
        loadData()
      }
    }
  }

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

      {/* Card list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SubtaskCardSkeleton key={i} />
          ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((row) => (
            <SubtaskCard
              key={row.id}
              subtask={row}
              isExpanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              onApprove={handleApprove}
              onReject={(id) => setRejectTarget(id)}
            />
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <RejectDialog
        open={rejectTarget !== null}
        title={t("reject_dialog_title")}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectTarget(null)}
      />

      {/* Clear selection pill (if filter is active, show count) */}
      {!isLoading && total > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("counter", { count: total })}
        </p>
      )}
    </div>
  )
}
