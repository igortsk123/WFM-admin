"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState } from "nuqs"
import { toast } from "sonner"
import {
  RefreshCw,
  Keyboard,
  Camera,
  ArrowUpRight,
  MoreVertical,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Store,
  MapPin,
  Briefcase,
  ChevronsUpDown,
  Check,
} from "lucide-react"

import type { TaskWithAvatar } from "@/lib/api/tasks"
import {
  getTasks,
  approveTask,
  rejectTask,
  getTaskListFilterOptions,
  type TaskFiltersResponse,
} from "@/lib/api/tasks"
import { getStores } from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/utils/format"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { PageHeader } from "@/components/shared/page-header"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { EmptyState } from "@/components/shared/empty-state"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SortOption = "oldest" | "newest" | "duration"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  return name.charAt(0).toUpperCase()
}

function fmtWaitTime(iso: string, t: ReturnType<typeof useTranslations>): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return t("waiting_time", { min: mins })
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return t("waiting_time_long", { h, min: m })
}

function fmtRelative(iso: string, locale: string): string {
  return formatRelative(new Date(iso), locale === "en" ? "en" : "ru")
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

function calcActualMin(task: TaskWithAvatar): number | null {
  if (!task.history_brief) return null
  return task.history_brief.work_intervals.reduce((acc, iv) => {
    return acc + Math.floor((new Date(iv.to).getTime() - new Date(iv.from).getTime()) / 60000)
  }, 0)
}

function getDeviationClass(planned: number, actual: number): string {
  const pct = ((actual - planned) / planned) * 100
  if (pct <= 0) return "text-success"
  if (pct <= 20) return "text-warning"
  return "text-destructive"
}

// ─────────────────────────────────────────────────────────────────────────────
// SingleCombobox
// ─────────────────────────────────────────────────────────────────────────────

interface ComboboxOption { value: string; label: string }

interface SingleComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}

function SingleCombobox({ options, value, onChange, placeholder, className }: SingleComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("h-9 justify-between font-normal truncate", className)}
        >
          <span className="truncate text-left text-sm">
            {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-8 text-sm" />
          <CommandList className="max-h-52">
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem value="__clear__" onSelect={() => { onChange(""); setOpen(false) }}>
                  <span className="text-muted-foreground text-xs">Очистить</span>
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => { onChange(opt.value); setOpen(false) }}
                >
                  <Check className={cn("mr-2 size-3.5", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="text-sm">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QueueCard
// ─────────────────────────────────────────────────────────────────────────────

interface QueueCardProps {
  task: TaskWithAvatar
  isSelected: boolean
  onClick: () => void
  t: ReturnType<typeof useTranslations>
  locale: string
}

function QueueCard({ task, isSelected, onClick, t, locale }: QueueCardProps) {
  const waitTime = task.updated_at ? fmtWaitTime(task.updated_at, t) : "—"
  const completedAt = task.history_brief?.completed_at
    ? fmtRelative(task.history_brief.completed_at, locale)
    : null
  const subtitle = [task.store_name, task.zone_name, task.work_type_name].filter(Boolean).join(" / ")

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full max-w-full overflow-hidden p-3 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "min-h-[44px]",
        isSelected
          ? "border-primary bg-accent"
          : "border-border/40 hover:border-border hover:bg-muted/30"
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="size-7 shrink-0">
            <AvatarImage src={task.assignee_avatar} alt={task.assignee_name ?? ""} />
            <AvatarFallback className="text-xs bg-accent text-accent-foreground">
              {task.assignee_name ? getInitials(task.assignee_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium truncate min-w-0">{task.assignee_name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground whitespace-nowrap">
          <Clock className="size-3" />
          <span className="text-xs">{waitTime}</span>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-medium line-clamp-2 mb-1 text-foreground break-words">
        {task.title}
      </p>

      {/* Subtitle — title attribute показывает полный текст при hover.
          inline-style гарантирует что truncate не перебивается каскадом. */}
      <p
        className="text-xs text-muted-foreground mb-1.5 max-w-full"
        title={subtitle}
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {subtitle}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          {task.requires_photo && <Camera className="size-3 text-muted-foreground" />}
        </div>
        {completedAt && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{completedAt}</span>
        )}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewPane
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewPaneProps {
  task: TaskWithAvatar
  comment: string
  onCommentChange: (v: string) => void
  commentError: boolean
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
  isRejecting: boolean
  onOpenFull: () => void
  t: ReturnType<typeof useTranslations>
  locale: string
}

function PreviewPane({
  task, comment, onCommentChange, commentError,
  onApprove, onReject, isApproving, isRejecting, onOpenFull, t, locale,
}: PreviewPaneProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const actualMin = calcActualMin(task)
  const hasPhoto = !!task.report_image_url
  const missingPhoto = task.requires_photo && !hasPhoto

  const QUICK_REASONS = [
    t("quick_reject_no_photo"),
    t("quick_reject_wrong_photo"),
    t("quick_reject_not_done"),
    t("quick_reject_overdue"),
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-lg font-semibold text-balance leading-tight">{task.title}</h2>
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onOpenFull}
                    aria-label={t("open_full")}
                  >
                    <ArrowUpRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("open_full")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Действия">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpenFull}>
                  <ArrowUpRight className="size-4 mr-2" />
                  {t("open_full")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ReviewStateBadge reviewState="ON_REVIEW" size="sm" />
        </div>

        {/* Meta */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {task.assignee_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3 shrink-0" />
              <span className="truncate">{task.assignee_name}</span>
            </div>
          )}
          {task.store_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="size-3 shrink-0" />
              <span className="truncate">{task.store_name}</span>
            </div>
          )}
          {task.zone_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{task.zone_name}</span>
            </div>
          )}
          {task.work_type_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="size-3 shrink-0" />
              <span className="truncate">{task.work_type_name}</span>
            </div>
          )}
          {task.history_brief?.completed_at && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              <span>{fmtRelative(task.history_brief.completed_at, locale)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Missing photo alert */}
      {missingPhoto && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">{t("photo_required_missing")}</AlertDescription>
        </Alert>
      )}

      {/* Photo */}
      {hasPhoto && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setLightboxOpen(true)}
            aria-label="Открыть фото"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.report_image_url!}
              alt="Фото отчёта"
              className="w-full aspect-video object-cover hover:opacity-90 transition-opacity"
              crossOrigin="anonymous"
            />
          </button>
        </div>
      )}

      {/* Timing */}
      {task.planned_minutes && (
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("timing_plan")}</p>
              <p className="text-sm font-semibold">{fmtMin(task.planned_minutes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("timing_actual")}</p>
              <p className={cn("text-sm font-semibold", actualMin !== null && getDeviationClass(task.planned_minutes, actualMin))}>
                {actualMin !== null ? fmtMin(actualMin) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("timing_deviation")}</p>
              <p className={cn(
                "text-sm font-semibold",
                actualMin !== null && getDeviationClass(task.planned_minutes, actualMin)
              )}>
                {actualMin !== null
                  ? `${actualMin - task.planned_minutes > 0 ? "+" : ""}${actualMin - task.planned_minutes} мин`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manager comment */}
      {task.comment && (
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("manager_comment")}</p>
          <p className="text-sm leading-relaxed">{task.comment}</p>
        </div>
      )}

      {/* Action bar */}
      <div className="bg-card border rounded-lg p-4 flex flex-col gap-3 mt-auto">
        {/* Quick reasons */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onCommentChange(reason)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                comment === reason ? "bg-accent border-primary" : "bg-background border-border"
              )}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <Textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={t("comment_placeholder")}
          className={cn(
            "min-h-[72px] resize-none text-sm",
            commentError && "border-destructive focus-visible:ring-destructive"
          )}
          aria-label={t("comment_label")}
        />
        {commentError && (
          <p className="text-xs text-destructive -mt-2">{t("reject_comment_hint")}</p>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenFull}
            className="hidden md:flex"
          >
            {t("btn_open_full")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onReject}
            disabled={isRejecting || isApproving}
          >
            {isRejecting ? "..." : t("btn_reject")}
          </Button>
          <Button
            className="bg-success text-success-foreground hover:bg-success/90"
            size="sm"
            onClick={onApprove}
            disabled={isApproving || isRejecting}
          >
            {isApproving ? "..." : t("btn_approve")}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {hasPhoto && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.report_image_url!}
              alt="Фото отчёта"
              className="w-full object-contain max-h-[80vh]"
              crossOrigin="anonymous"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MobilePreviewSheet
// ─────────────────────────────────────────────────────────────────────────────

interface MobilePreviewSheetProps {
  task: TaskWithAvatar | null
  open: boolean
  onClose: () => void
  comment: string
  onCommentChange: (v: string) => void
  commentError: boolean
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
  isRejecting: boolean
  onOpenFull: () => void
  t: ReturnType<typeof useTranslations>
  locale: string
}

function MobilePreviewSheet(props: MobilePreviewSheetProps) {
  const { task, open, onClose, t } = props

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="text-sm text-left">{task?.title ?? ""}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4 py-3">
          {task && (
            <PreviewPane
              {...props}
              task={task}
            />
          )}
        </ScrollArea>
        {/* Sticky mobile buttons */}
        {task && (
          <div className="border-t p-3 flex gap-2">
            <Button
              variant="destructive"
              className="flex-1 h-12"
              onClick={props.onReject}
              disabled={props.isRejecting || props.isApproving}
            >
              {t("btn_reject_short")}
            </Button>
            <Button
              className="flex-1 h-12 bg-success text-success-foreground hover:bg-success/90"
              onClick={props.onApprove}
              disabled={props.isApproving || props.isRejecting}
            >
              {t("btn_approve_short")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HotkeysDialog
// ─────────────────────────────────────────────────────────────────────────────

function HotkeysDialog({ open, onClose, t }: { open: boolean; onClose: () => void; t: ReturnType<typeof useTranslations> }) {
  const hotkeys = [
    t("hotkey_navigate"),
    t("hotkey_approve"),
    t("hotkey_reject"),
    t("hotkey_open"),
    t("hotkey_clear"),
    t("hotkey_help"),
  ]
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("hotkeys_title")}</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {hotkeys.map((h) => (
            <li key={h} className="text-sm text-muted-foreground">{h}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewQueue — main component
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function ReviewQueue() {
  const t = useTranslations("screen.reviewQueue")
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const isNetworkOps = user.role === "NETWORK_OPS"

  // ── URL state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useQueryState("selected")

  // ── Filters & sort ─────────────────────────────────────────────────────────
  const [storeFilter, setStoreFilter] = React.useState("")
  const [zoneFilter, setZoneFilter] = React.useState("")
  const [workTypeFilter, setWorkTypeFilter] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("")
  const [sortBy, setSortBy] = React.useState<SortOption>("newest")

  // ── Data ───────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = React.useState<TaskWithAvatar[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)
  const [filterOptions, setFilterOptions] = React.useState<TaskFiltersResponse | null>(null)
  const [storeOptions, setStoreOptions] = React.useState<{ value: string; label: string }[]>([])

  // ── Selection & actions ────────────────────────────────────────────────────
  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null
  const [comment, setComment] = React.useState("")
  const [commentError, setCommentError] = React.useState(false)
  const [isApproving, setIsApproving] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [hotkeysOpen, setHotkeysOpen] = React.useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false)
  const [isMd, setIsMd] = React.useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const commentRef = React.useRef<HTMLTextAreaElement>(null)

  // ── Responsive ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsMd(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // ── Load filter options ────────────────────────────────────────────────────
  React.useEffect(() => {
    getTaskListFilterOptions().then(setFilterOptions)
    getStores({ active: true, page: 1, page_size: 100 }).then((res) =>
      setStoreOptions(res.data.map((s) => ({ value: String(s.id), label: s.name })))
    )
  }, [])

  // ── Load tasks ─────────────────────────────────────────────────────────────
  const loadTasks = React.useCallback(async (resetPage = true) => {
    setIsLoading(true)
    setIsError(false)
    const p = resetPage ? 1 : page
    if (resetPage) setPage(1)

    try {
      const res = await getTasks({
        review_state: "ON_REVIEW",
        archived: false,
        store_ids: storeFilter ? [Number(storeFilter)] : undefined,
        zone_ids: zoneFilter ? [Number(zoneFilter)] : undefined,
        work_type_ids: workTypeFilter ? [Number(workTypeFilter)] : undefined,
        assignee_ids: assigneeFilter ? [Number(assigneeFilter)] : undefined,
        page: p,
        page_size: PAGE_SIZE,
        sort_by: "updated_at",
        sort_dir: sortBy === "newest" ? "desc" : "asc",
      })

      let sorted = res.data
      if (sortBy === "duration") {
        sorted = [...res.data].sort((a, b) => {
          const aMin = calcActualMin(a) ?? a.planned_minutes
          const bMin = calcActualMin(b) ?? b.planned_minutes
          return bMin - aMin
        })
      }

      if (resetPage) {
        setTasks(sorted)
      } else {
        setTasks((prev) => [...prev, ...sorted])
      }
      setTotal(res.total)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [storeFilter, zoneFilter, workTypeFilter, assigneeFilter, sortBy, page])

  React.useEffect(() => { loadTasks(true) }, [storeFilter, zoneFilter, workTypeFilter, assigneeFilter, sortBy])

  // Auto-select first task if URL has ?selected=
  React.useEffect(() => {
    if (selectedId && !selectedTask && tasks.length > 0) {
      // selectedId not found in tasks — clear it
      setSelectedId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.key === "?" && !inInput) {
        setHotkeysOpen(true)
        return
      }

      if (inInput) return

      const idx = tasks.findIndex((t) => t.id === selectedId)

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault()
        const next = tasks[idx + 1] ?? tasks[0]
        if (next) selectTask(next)
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault()
        const prev = tasks[idx - 1] ?? tasks[tasks.length - 1]
        if (prev) selectTask(prev)
      } else if (e.key === "a" || e.key === "A") {
        if (selectedTask) handleApprove()
      } else if (e.key === "r" || e.key === "R") {
        if (selectedTask) {
          if (comment.length < 10) {
            setCommentError(true)
            commentRef.current?.focus()
          } else {
            handleReject()
          }
        }
      } else if (e.key === "Enter") {
        if (selectedTask) {
          window.open(`/${locale}${ADMIN_ROUTES.taskDetail(selectedTask.id)}`, "_blank")
        }
      } else if (e.key === "Escape") {
        setSelectedId(null)
        setMobileSheetOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, selectedId, selectedTask, comment, locale])

  // ── Select task ────────────────────────────────────────────────────────────
  function selectTask(task: TaskWithAvatar) {
    setSelectedId(task.id)
    setComment("")
    setCommentError(false)
    if (!isMd) setMobileSheetOpen(true)
  }

  // ── Remove from queue (optimistic) ────────────────────────────────────────
  function removeFromQueue(id: string) {
    const idx = tasks.findIndex((t) => t.id === id)
    const next = tasks[idx + 1] ?? tasks[idx - 1] ?? null
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
    if (next) {
      setSelectedId(next.id)
    } else {
      setSelectedId(null)
    }
    setComment("")
    setCommentError(false)
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!selectedTask) return
    setIsApproving(true)
    const taskId = selectedTask.id

    // Optimistic
    removeFromQueue(taskId)
    setMobileSheetOpen(false)

    try {
      const res = await approveTask(taskId, comment || undefined)
      if (!res.success && res.error?.code === "NOT_ON_REVIEW") {
        toast.error(t("toast_conflict"))
        return
      }
      toast.success(t("toast_approved"), {
        action: {
          label: t("toast_undo"),
          onClick: () => {
            // Re-fetch to restore
            loadTasks(true)
          },
        },
        duration: 5000,
      })
    } catch {
      toast.error(t("toast_conflict"))
    } finally {
      setIsApproving(false)
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  async function handleReject() {
    if (!selectedTask) return
    if (comment.trim().length < 10) {
      setCommentError(true)
      commentRef.current?.focus()
      return
    }
    setIsRejecting(true)
    const taskId = selectedTask.id

    // Optimistic
    removeFromQueue(taskId)
    setMobileSheetOpen(false)

    try {
      const res = await rejectTask(taskId, comment)
      if (!res.success && res.error?.code === "NOT_ON_REVIEW") {
        toast.error(t("toast_conflict"))
        return
      }
      toast.success(t("toast_rejected"), {
        action: {
          label: t("toast_undo"),
          onClick: () => { loadTasks(true) },
        },
        duration: 5000,
      })
    } catch {
      toast.error(t("toast_conflict"))
    } finally {
      setIsRejecting(false)
    }
  }

  function openFull() {
    if (!selectedTask) return
    window.open(`/${locale}${ADMIN_ROUTES.taskDetail(selectedTask.id)}`, "_blank")
  }

  // ── Filter option arrays ───────────────────────────────────────────────────
  const zoneOptions = (filterOptions?.zones ?? []).map((z) => ({ value: String(z.id), label: z.name }))
  const workTypeOptions = (filterOptions?.work_types ?? []).map((w) => ({ value: String(w.id), label: w.name }))
  const assigneeOptions = (filterOptions?.assignees ?? []).map((u) => ({
    value: String(u.id),
    label: `${u.last_name} ${u.first_name}`,
  }))

  const hasMore = tasks.length < total

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <PageHeader
        title={t("title")}
        subtitle={isLoading ? undefined : t("counter", { count: total })}
        actions={
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => loadTasks(true)}
                    aria-label={t("refresh")}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("refresh")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Keyboard hint — hidden on mobile */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex"
                    onClick={() => setHotkeysOpen(true)}
                    aria-label={t("keyboard_hint")}
                  >
                    <Keyboard className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>A=принять, R=отклонить, ↑↓=навигация, Enter=полностью</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {isNetworkOps && (
          <SingleCombobox
            options={storeOptions}
            value={storeFilter}
            onChange={setStoreFilter}
            placeholder={t("filter_store")}
            className="w-44"
          />
        )}
        <SingleCombobox
          options={zoneOptions}
          value={zoneFilter}
          onChange={setZoneFilter}
          placeholder={t("filter_zone")}
          className="w-36"
        />
        <SingleCombobox
          options={workTypeOptions}
          value={workTypeFilter}
          onChange={setWorkTypeFilter}
          placeholder={t("filter_work_type")}
          className="w-40"
        />
        <SingleCombobox
          options={assigneeOptions}
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          placeholder={t("filter_assignee")}
          className="w-44"
        />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest">{t("sort_oldest")}</SelectItem>
            <SelectItem value="newest">{t("sort_newest")}</SelectItem>
            <SelectItem value="duration">{t("sort_duration")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("error_desc")}</span>
            <Button variant="outline" size="sm" onClick={() => loadTasks(true)}>Повторить</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty queue */}
      {!isLoading && !isError && tasks.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title={t("empty_queue_title")}
          description={t("empty_queue_desc")}
          className="min-h-[50vh]"
        />
      )}

      {/* Two-column layout */}
      {(isLoading || tasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: queue list */}
          <div className="lg:col-span-1">
            {isLoading ? (
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
            ) : (
              <ScrollArea className="lg:h-[calc(100vh-180px)]">
                <div className="flex flex-col gap-1.5 pr-4">
                  {tasks.map((task) => (
                    <QueueCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedId}
                      onClick={() => selectTask(task)}
                      t={t}
                      locale={locale}
                    />
                  ))}

                  {/* Load more */}
                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1"
                      onClick={async () => {
                        const nextPage = page + 1
                        setPage(nextPage)
                        await loadTasks(false)
                      }}
                    >
                      {t("load_more", { count: Math.min(PAGE_SIZE, total - tasks.length) })}
                    </Button>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right: preview pane — desktop only */}
          <div className="hidden lg:block lg:col-span-2 sticky top-8">
            {selectedTask ? (
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="pr-2">
                  <PreviewPane
                    task={selectedTask}
                    comment={comment}
                    onCommentChange={(v) => { setComment(v); if (v.length >= 10) setCommentError(false) }}
                    commentError={commentError}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isApproving={isApproving}
                    isRejecting={isRejecting}
                    onOpenFull={openFull}
                    t={t}
                    locale={locale}
                  />
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="flex size-20 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-10 text-muted-foreground" strokeWidth={1.5} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold">{t("empty_preview_title")}</p>
                    <p className="text-sm text-muted-foreground">{t("empty_preview_desc")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      <MobilePreviewSheet
        task={selectedTask}
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        comment={comment}
        onCommentChange={(v) => { setComment(v); if (v.length >= 10) setCommentError(false) }}
        commentError={commentError}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
        isRejecting={isRejecting}
        onOpenFull={openFull}
        t={t}
        locale={locale}
      />

      {/* Hotkeys dialog */}
      <HotkeysDialog open={hotkeysOpen} onClose={() => setHotkeysOpen(false)} t={t} />
    </div>
  )
}
