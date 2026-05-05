"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { type ColumnDef } from "@tanstack/react-table"
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Download,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Store,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

import type { ObjectFormat } from "@/lib/types"
import type { StoreWithStats } from "@/lib/api/stores"
import {
  getStores,
  archiveStore,
  bulkArchiveStores,
  syncLama,
  createStore,
  updateStore,
} from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { PageHeader } from "@/components/shared/page-header"
import { FilterChip } from "@/components/shared/filter-chip"
import { UserCell } from "@/components/shared/user-cell"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const CITY_OPTIONS = [
  { value: "Томск", label: "Томск" },
  { value: "Новосибирск", label: "Новосибирск" },
  { value: "Кемерово", label: "Кемерово" },
]

const FORMAT_OPTIONS: { value: ObjectFormat; label: string }[] = [
  { value: "SUPERMARKET", label: "Супермаркет" },
  { value: "HYPERMARKET", label: "Гипермаркет" },
  { value: "CONVENIENCE", label: "Магазин у дома" },
  { value: "SMALL_SHOP", label: "Малый формат" },
  { value: "SEWING_WORKSHOP", label: "Швейный цех" },
  { value: "PRODUCTION_LINE", label: "Производственная линия" },
  { value: "WAREHOUSE_HUB", label: "Склад/хаб" },
  { value: "OFFICE", label: "Офис" },
]

const OBJECT_TYPE_OPTIONS = [
  { value: "STORE", label: "Магазин" },
  { value: "WORKSHOP", label: "Цех" },
  { value: "DEPARTMENT", label: "Отдел" },
  { value: "OFFICE", label: "Офис" },
  { value: "WAREHOUSE_HUB", label: "Распред. центр" },
]

// Mock map pins for 6 locations (Tomsk region)
const MAP_PINS = [
  { id: 1, label: "SPAR-TOM-001", name: "СПАР Томск, пр. Ленина 80", top: "38%", left: "46%" },
  { id: 2, label: "SPAR-TOM-002", name: "СПАР Томск, ул. Красноармейская 99", top: "52%", left: "40%" },
  { id: 3, label: "SPAR-TOM-003", name: "СПАР Томск, пр. Фрунзе 92а", top: "60%", left: "55%" },
  { id: 4, label: "FC-TOM-001", name: "Food City Томск Global Market", top: "28%", left: "58%" },
  { id: 5, label: "FC-TOM-002", name: "Food City Томск, ул. Учебная 39", top: "68%", left: "34%" },
  { id: 6, label: "ALFA-TOM-001", name: "Магазин одежды Альфа", top: "43%", left: "30%" },
]

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function formatLamaSync(isoDate: string | undefined): {
  label: string
  level: "fresh" | "stale" | "critical" | "never"
} {
  if (!isoDate) return { label: "Не синхронизировано", level: "never" }
  const synced = new Date(isoDate)
  const diffHours = (Date.now() - synced.getTime()) / (1000 * 60 * 60)
  const when = formatDistanceToNow(synced, { locale: ru, addSuffix: true })
  if (diffHours <= 6) return { label: when, level: "fresh" }
  if (diffHours <= 24) return { label: when, level: "stale" }
  return { label: when, level: "critical" }
}

// ─────────────────────────────────────────────────────────────────
// SINGLE SELECT COMBOBOX
// ─────────────────────────────────────────────────────────────────

interface SingleSelectComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  className?: string
}

function SingleSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  className,
}: SingleSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm",
            value ? "text-foreground" : "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {value ? options.find((o) => o.value === value)?.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-9" />
          <CommandList>
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onValueChange(""); setOpen(false) }}
                  className="text-muted-foreground gap-2"
                >
                  <X className="size-3.5" /> Сбросить
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(cur) => {
                    onValueChange(cur === value ? "" : cur)
                    setOpen(false)
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn("size-4", value === option.value ? "opacity-100" : "opacity-0")}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────
// STATS STRIP
// ─────────────────────────────────────────────────────────────────

interface StatsStripProps {
  total: number
  active: number
  archived: number
  noDirector: number
  isLoading: boolean
  onOpenNoDirector: () => void
}

function StatsStrip({ total, active, archived, noDirector, isLoading, onOpenNoDirector }: StatsStripProps) {
  const t = useTranslations("screen.stores")

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.total")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.active")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{active}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.archived")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{archived}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-tight">{t("stats.no_director")}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className={cn("text-2xl font-semibold tabular-nums", noDirector > 0 && "text-warning")}>
              {noDirector}
            </p>
            {noDirector > 0 && (
              <button
                onClick={onOpenNoDirector}
                className="text-xs text-primary hover:underline"
              >
                {t("stats.open_link")}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// LAMA SYNC CELL
// ─────────────────────────────────────────────────────────────────

function LamaSyncCell({ lama_synced_at }: { lama_synced_at?: string }) {
  const { label, level } = formatLamaSync(lama_synced_at)
  return (
    <div className="flex items-center gap-1.5">
      {level === "critical" && (
        <AlertCircle className="size-3.5 text-destructive shrink-0" aria-hidden="true" />
      )}
      <span
        className={cn(
          "text-xs",
          level === "fresh" && "text-success",
          level === "stale" && "text-warning",
          level === "critical" && "text-destructive",
          level === "never" && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAP VIEW
// ─────────────────────────────────────────────────────────────────

function MapView({ onStoreClick }: { onStoreClick: (id: number) => void }) {
  const [activePin, setActivePin] = React.useState<number | null>(null)

  return (
    <div className="relative aspect-video w-full rounded-lg border border-border bg-muted overflow-hidden">
      {/* Subtle map grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50 select-none pointer-events-none">Карта (демо)</p>
      </div>

      {MAP_PINS.map((pin) => (
        <Popover
          key={pin.id}
          open={activePin === pin.id}
          onOpenChange={(open) => setActivePin(open ? pin.id : null)}
        >
          <PopoverTrigger asChild>
            <button
              style={{ top: pin.top, left: pin.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={pin.name}
            >
              <Store className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="center" side="top">
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-muted-foreground uppercase">{pin.label}</p>
              <p className="text-sm font-medium leading-snug">{pin.name}</p>
              <Button
                size="sm"
                className="w-full mt-1 h-8 text-xs"
                onClick={() => { onStoreClick(pin.id); setActivePin(null) }}
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                Открыть
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ADD / EDIT DIALOG
// ─────────────────────────────────────────────────────────────────

interface StoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  store?: StoreWithStats | null
  onSuccess: () => void
}

function StoreDialog({ open, onOpenChange, store, onSuccess }: StoreDialogProps) {
  const t = useTranslations("screen.stores")
  const [loading, setLoading] = React.useState(false)
  const [name, setName] = React.useState(store?.name ?? "")
  const [code, setCode] = React.useState(store?.external_code ?? "")
  const [address, setAddress] = React.useState(store?.address ?? "")
  const [city, setCity] = React.useState(store?.city ?? "")
  const [storeType, setStoreType] = React.useState(store?.store_type ?? "SUPERMARKET")
  const [objectType, setObjectType] = React.useState(store?.object_type ?? "STORE")

  React.useEffect(() => {
    if (open) {
      setName(store?.name ?? "")
      setCode(store?.external_code ?? "")
      setAddress(store?.address ?? "")
      setCity(store?.city ?? "")
      setStoreType(store?.store_type ?? "SUPERMARKET")
      setObjectType(store?.object_type ?? "STORE")
    }
  }, [open, store])

  async function handleSave() {
    if (!name || !city) return
    setLoading(true)
    try {
      const payload = { name, external_code: code, address, city, store_type: storeType, object_type: objectType as StoreWithStats["object_type"] }
      const result = store
        ? await updateStore(store.id, payload)
        : await createStore(payload)
      if (result.success) {
        toast.success(t("toast.saved"))
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(t("toast.error"))
      }
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!store

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("dialogs.edit_title") : t("dialogs.add_title")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="store-name">{t("dialogs.fields.name")}</Label>
            <Input
              id="store-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="СПАР Томск, пр. Ленина 80"
            />
          </div>

          {/* External code */}
          <div className="grid gap-1.5">
            <Label htmlFor="store-code">{t("dialogs.fields.external_code")}</Label>
            <Input
              id="store-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPAR-TOM-001"
              className="font-mono uppercase"
            />
          </div>

          {/* Address */}
          <div className="grid gap-1.5">
            <Label htmlFor="store-address">{t("dialogs.fields.address")}</Label>
            <Textarea
              id="store-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="пр. Ленина, 80"
            />
          </div>

          {/* City */}
          <div className="grid gap-1.5">
            <Label>{t("dialogs.fields.city")}</Label>
            <SingleSelectCombobox
              options={CITY_OPTIONS}
              value={city}
              onValueChange={setCity}
              placeholder="Выберите город"
              className="w-full"
            />
          </div>

          {/* Store type */}
          <div className="grid gap-2">
            <Label>{t("dialogs.fields.store_type")}</Label>
            <RadioGroup
              value={storeType}
              onValueChange={setStoreType}
              className="grid grid-cols-2 gap-2"
            >
              {["Супермаркет", "Гипермаркет", "Магазин у дома", "Малый формат"].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={`type-${type}`} />
                  <Label htmlFor={`type-${type}`} className="font-normal text-sm cursor-pointer">{type}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Object type */}
          <div className="grid gap-1.5">
            <Label>{t("dialogs.fields.object_type")}</Label>
            <Select value={objectType} onValueChange={(v) => setObjectType(v as typeof objectType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("dialogs.cancel")}</Button>
          <Button onClick={handleSave} disabled={!name || !city || loading}>
            {loading ? "..." : t("dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// MOBILE CARD RENDER
// ─────────────────────────────────────────────────────────────────

function StoreCard({
  store,
  onClick,
  onArchive,
  onSync,
  onEdit,
}: {
  store: StoreWithStats
  onClick: () => void
  onArchive: () => void
  onSync: () => void
  onEdit: () => void
}) {
  const t = useTranslations("screen.stores")
  const { label: lamaLabel, level: lamaLevel } = formatLamaSync(store.lama_synced_at)

  return (
    <div className="relative" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}>
      {/* Status badge top-right */}
      <div className="absolute top-0 right-9">
        <Badge variant={store.archived ? "secondary" : "outline"} className={cn("text-[10px]", !store.archived && "text-success border-success/30 bg-success/10")}>
          {store.archived ? t("status.archived") : t("status.active")}
        </Badge>
      </div>

      {/* Title + code */}
      <div className="pr-16 mb-1">
        <span className="font-medium text-base leading-snug">{store.name}</span>
        <Badge variant="secondary" className="ml-2 font-mono text-xs uppercase px-1.5 py-0 align-middle">{store.external_code}</Badge>
      </div>

      {/* Address */}
      <p className="text-xs text-muted-foreground mb-2 truncate">{store.address}, {store.city}</p>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        <Badge variant="secondary" className="text-xs">Сотр: {store.staff_count}</Badge>
        <Badge variant="secondary" className="text-xs">Откр. смен: {store.current_shifts_open_count}</Badge>
        {store.tasks_today_count > 0 && (
          <Badge variant="secondary" className="text-xs">Задач: {store.tasks_today_count}</Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs",
          lamaLevel === "fresh" && "text-success",
          lamaLevel === "stale" && "text-warning",
          lamaLevel === "critical" && "text-destructive flex items-center gap-1",
          lamaLevel === "never" && "text-muted-foreground"
        )}>
          {lamaLevel === "critical" && <AlertCircle className="size-3 inline mr-0.5" />}
          {lamaLabel}
        </span>
        {/* ⋮ menu — stop propagation */}
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Действия</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClick}>{t("actions.open")}</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>{t("actions.edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={onSync}>{t("actions.force_sync_lama")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive} className="text-destructive focus:text-destructive">{t("actions.archive")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function StoresList() {
  const t = useTranslations("screen.stores")
  const router = useRouter()

  // ── URL state ──────────────────────────────────────────────────
  const [tabParam, setTabParam] = useQueryState("status", parseAsString.withDefault("all"))
  const [viewParam, setViewParam] = useQueryState("view", parseAsString.withDefault("list"))
  const [searchParam, setSearchParam] = useQueryState("search", parseAsString.withDefault(""))
  const [cityParam, setCityParam] = useQueryState("city", parseAsString.withDefault(""))
  const [storeTypeParam, setStoreTypeParam] = useQueryState("store_type", parseAsString.withDefault(""))
  const [pageParam, setPageParam] = useQueryState("page", parseAsInteger.withDefault(1))

  // Format filter (local, not encoded in URL for brevity)
  const [selectedFormats, setSelectedFormats] = React.useState<ObjectFormat[]>([])

  // ── Data state ──────────────────────────────────────────────────
  const [data, setData] = React.useState<StoreWithStats[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // Stats strip counts
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [statsTotal, setStatsTotal] = React.useState(0)
  const [statsActive, setStatsActive] = React.useState(0)
  const [statsArchived, setStatsArchived] = React.useState(0)
  const [statsNoDirector, setStatsNoDirector] = React.useState(0)

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())

  // ── Dialog state ────────────────────────────────────────────────
  const [archivingId, setArchivingId] = React.useState<number | null>(null)
  const [bulkArchiveOpen, setBulkArchiveOpen] = React.useState(false)
  const [storeDialogOpen, setStoreDialogOpen] = React.useState(false)
  const [editingStore, setEditingStore] = React.useState<StoreWithStats | null>(null)
  const [syncingId, setSyncingId] = React.useState<number | null>(null)
  const [syncConfirmOpen, setSyncConfirmOpen] = React.useState(false)

  // ── Fetch data ──────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const archived = tabParam === "archived" ? true : tabParam === "active" ? false : undefined
      const result = await getStores({
        archived: archived ?? false,
        search: searchParam || undefined,
        city: cityParam || undefined,
        store_type: storeTypeParam || undefined,
        format: selectedFormats.length > 0 ? selectedFormats : undefined,
        page: pageParam,
        page_size: 20,
      })
      setData(result.data)
      setTotal(result.total ?? 0)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [tabParam, searchParam, cityParam, storeTypeParam, selectedFormats, pageParam])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Stats strip fetch (counts) ─────────────────────────────────
  React.useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true)
      try {
        const [activeRes, archivedRes] = await Promise.all([
          getStores({ archived: false, page_size: 100 }),
          getStores({ archived: true, page_size: 100 }),
        ])
        const activeStores = activeRes.data
        const archivedStores = archivedRes.data
        const noDirectorCount = activeStores.filter((s) => !s.manager_id).length
        setStatsActive(activeRes.total ?? 0)
        setStatsArchived(archivedRes.total ?? 0)
        setStatsTotal((activeRes.total ?? 0) + (archivedRes.total ?? 0))
        setStatsNoDirector(noDirectorCount)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])

  // ── Filter helpers ──────────────────────────────────────────────
  const activeFilterCount =
    (cityParam ? 1 : 0) +
    (storeTypeParam ? 1 : 0) +
    selectedFormats.length

  const hasActiveFilters = activeFilterCount > 0 || !!searchParam

  function clearAllFilters() {
    setSearchParam(null)
    setCityParam(null)
    setStoreTypeParam(null)
    setSelectedFormats([])
    setPageParam(null)
  }

  // ── Selection helpers ───────────────────────────────────────────
  const allSelected = data.length > 0 && data.every((s) => selectedIds.has(s.id))
  const someSelected = selectedIds.size > 0

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(data.map((s) => s.id)))
  }

  function toggleRow(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // ── Row actions ─────────────────────────────────────────────────
  async function handleArchiveSingle(id: number) {
    const result = await archiveStore(id)
    if (result.success) {
      toast.success(t("toast.archived"))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
    setArchivingId(null)
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds)
    const result = await bulkArchiveStores(ids)
    if (result.success) {
      toast.success(t("toast.bulk_archived", { count: ids.length }))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
    setBulkArchiveOpen(false)
  }

  async function handleSyncLama(id: number) {
    toast.info(t("toast.sync_started"))
    const result = await syncLama(id)
    if (result.success) {
      toast.success(t("toast.sync_finished"))
      fetchData()
    } else {
      toast.error(t("toast.error"))
    }
    setSyncingId(null)
    setSyncConfirmOpen(false)
  }

  function handleRowClick(row: StoreWithStats, e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('[role="checkbox"]') ||
      target.closest('[data-radix-collection-item]')
    ) return
    router.push(ADMIN_ROUTES.storeDetail(String(row.id)))
  }

  // ── Columns definition ──────────────────────────────────────────
  const columns: ColumnDef<StoreWithStats>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
          aria-label="Выбрать всё"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleRow(row.original.id)}
          aria-label={`Выбрать ${row.original.name}`}
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      id: "code",
      header: t("columns.code"),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs uppercase px-1.5 py-0 tabular-nums">
          {row.original.external_code}
        </Badge>
      ),
    },
    {
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-primary hover:underline cursor-pointer truncate max-w-[180px] block">
          {row.original.name}
        </span>
      ),
    },
    {
      id: "address",
      header: t("columns.address"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
          {row.original.address}
        </span>
      ),
    },
    {
      id: "city",
      header: t("columns.city"),
      cell: ({ row }) => <span className="text-sm">{row.original.city}</span>,
    },
    {
      id: "director",
      header: t("columns.director"),
      cell: ({ row }) => {
        const store = row.original
        if (store.manager_id && store.manager_name) {
          const nameParts = store.manager_name.split(" ")
          return (
            <UserCell
              user={{
                first_name: nameParts[1] ?? "",
                last_name: nameParts[0] ?? store.manager_name,
              }}
            />
          )
        }
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm italic text-muted-foreground">{t("director.unassigned")}</span>
            <button className="text-xs text-primary hover:underline shrink-0">{t("director.assign")}</button>
          </div>
        )
      },
    },
    {
      id: "staff",
      header: () => <span className="block text-right">{t("columns.staff")}</span>,
      cell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums">{row.original.staff_count}</span>
      ),
    },
    {
      id: "active_shifts",
      header: t("columns.active_shifts"),
      cell: ({ row }) => {
        const open = row.original.current_shifts_open_count
        const total = row.original.current_shifts_total
        return (
          <div className="flex items-center gap-1.5">
            {open > 0 && <span className="size-1.5 rounded-full bg-success inline-block" />}
            <span className="text-sm tabular-nums">
              {t("columns.shifts_ratio", { open, total })}
            </span>
          </div>
        )
      },
    },
    {
      id: "tasks_today",
      header: t("columns.tasks_today"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.tasks_today_count}</span>
      ),
    },
    {
      id: "lama_sync",
      header: t("columns.lama_sync"),
      cell: ({ row }) => <LamaSyncCell lama_synced_at={row.original.lama_synced_at} />,
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => (
        <Badge
          variant={row.original.archived ? "secondary" : "outline"}
          className={cn(!row.original.archived && "text-success border-success/30 bg-success/10")}
        >
          {row.original.archived ? t("status.archived") : t("status.active")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const store = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Действия</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(ADMIN_ROUTES.storeDetail(String(store.id))) }}>
                {t("actions.open")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingStore(store); setStoreDialogOpen(true) }}>
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation() }}>
                {t("actions.change_director")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setSyncingId(store.id); setSyncConfirmOpen(true) }}
              >
                {t("actions.force_sync_lama")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); setArchivingId(store.id) }}
              >
                {t("actions.archive")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
  ]

  // ── Empty / error states ────────────────────────────────────────
  const isEmptyAll = !hasActiveFilters && tabParam !== "archived" && data.length === 0 && !isLoading
  const isEmptyFiltered = hasActiveFilters && data.length === 0 && !isLoading
  const isEmptyArchived = tabParam === "archived" && data.length === 0 && !isLoading && !hasActiveFilters

  // ── Page actions (mobile overflow) ─────────────────────────────
  const pageActions = (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => { setEditingStore(null); setStoreDialogOpen(true) }}>
        <Plus className="size-4" />
        <span className="hidden sm:inline">{t("actions.add")}</span>
      </Button>
      {/* Mobile overflow menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-9 md:hidden">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">{t("actions.more")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2">
            <Download className="size-4" /> {t("actions.export_csv")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  // ── Filter row (desktop) ────────────────────────────────────────
  const filterContent = (
    <>
      {/* Search */}
      <div className="relative flex-1 min-w-0 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="h-9 pl-9"
          placeholder={t("filters.search_placeholder")}
          value={searchParam}
          onChange={(e) => { setSearchParam(e.target.value || null); setPageParam(null) }}
        />
        {searchParam && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchParam(null)}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* City */}
      <SingleSelectCombobox
        options={CITY_OPTIONS}
        value={cityParam}
        onValueChange={(v) => { setCityParam(v || null); setPageParam(null) }}
        placeholder={t("filters.city")}
        className="w-40"
      />

      {/* Format */}
      <Select
        value={storeTypeParam}
        onValueChange={(v) => { setStoreTypeParam(v || null); setPageParam(null) }}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder={t("filters.store_type")} />
        </SelectTrigger>
        <SelectContent>
          {FORMAT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
          <X className="size-3.5" /> {t("filters.clear_all")}
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={!isLoading ? t("counter", { count: total }) : undefined}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.stores") },
        ]}
        actions={pageActions}
      />

      {/* Stats strip */}
      <StatsStrip
        total={statsTotal}
        active={statsActive}
        archived={statsArchived}
        noDirector={statsNoDirector}
        isLoading={statsLoading}
        onOpenNoDirector={() => {
          setTabParam("active")
          setSearchParam(null)
        }}
      />

      {/* Toolbar row: tabs + view toggle */}
      <div className="flex items-center justify-between gap-3">
        <ScrollArea className="max-w-full">
          <Tabs
            value={tabParam}
            onValueChange={(v) => { setTabParam(v); setPageParam(null); setSelectedIds(new Set()) }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-sm">{t("tabs.all")}</TabsTrigger>
              <TabsTrigger value="active" className="text-sm">{t("tabs.active")}</TabsTrigger>
              <TabsTrigger value="archived" className="text-sm">{t("tabs.archived")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <ToggleGroup
          type="single"
          value={viewParam}
          onValueChange={(v) => v && setViewParam(v)}
          className="shrink-0"
        >
          <ToggleGroupItem value="list" aria-label={t("view.list")} className="h-9 w-9">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 3h11M2 7.5h11M2 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label={t("view.map")} className="h-9 w-9">
            <MapPin className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filter row — desktop */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {filterContent}
      </div>

      {/* Filter row — mobile (sheet) */}
      <MobileFilterSheet
        activeCount={activeFilterCount}
        onClearAll={clearAllFilters}
        onApply={() => {}}
        className="md:hidden"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("filters.search_placeholder")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="h-11 pl-9"
                placeholder={t("filters.search_placeholder")}
                value={searchParam}
                onChange={(e) => setSearchParam(e.target.value || null)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("filters.city")}</Label>
            <SingleSelectCombobox
              options={CITY_OPTIONS}
              value={cityParam}
              onValueChange={(v) => setCityParam(v || null)}
              placeholder={t("filters.city")}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("filters.store_type")}</Label>
            <Select
              value={storeTypeParam}
              onValueChange={(v) => setStoreTypeParam(v || null)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder={t("filters.store_type")} />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </MobileFilterSheet>

      {/* Active filter chips */}
      {(cityParam || storeTypeParam || selectedFormats.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {cityParam && (
            <FilterChip
              label={t("filters.city")}
              value={cityParam}
              onRemove={() => setCityParam(null)}
            />
          )}
          {storeTypeParam && (
            <FilterChip
              label={t("filters.store_type")}
              value={FORMAT_OPTIONS.find((f) => f.value === storeTypeParam)?.label ?? storeTypeParam}
              onRemove={() => setStoreTypeParam(null)}
            />
          )}
          {selectedFormats.map((fmt) => (
            <FilterChip
              key={fmt}
              label={t("filters.format")}
              value={FORMAT_OPTIONS.find((f) => f.value === fmt)?.label ?? fmt}
              onRemove={() => setSelectedFormats((prev) => prev.filter((f) => f !== fmt))}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center gap-3">
            {t("error.title")}
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="size-3.5 mr-1.5" />
              {t("error.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Map view */}
      {viewParam === "map" && !isError && (
        <MapView onStoreClick={(id) => router.push(ADMIN_ROUTES.storeDetail(String(id)))} />
      )}

      {/* List view */}
      {viewParam === "list" && !isError && (
        <>
          {isEmptyAll && (
            <EmptyState
              icon={Store}
              title={t("empty.all.title")}
              description={t("empty.all.subtitle")}
              action={{ label: t("empty.all.cta"), onClick: () => { setEditingStore(null); setStoreDialogOpen(true) }, icon: Plus }}
            />
          )}
          {isEmptyArchived && (
            <EmptyState
              icon={Store}
              title={t("empty.archived.title")}
              description={t("empty.archived.subtitle")}
            />
          )}
          {isEmptyFiltered && (
            <EmptyState
              icon={SearchX}
              title={t("empty.filtered.title")}
              description={t("empty.filtered.subtitle")}
              action={{ label: t("empty.filtered.reset"), onClick: clearAllFilters }}
            />
          )}
          {(!isEmptyAll && !isEmptyArchived && !isEmptyFiltered) && (
            <ResponsiveDataTable
              columns={columns}
              data={data}
              isLoading={isLoading}
              isError={false}
              onRowClick={handleRowClick}
              pagination={{
                page: pageParam,
                pageSize: 20,
                total,
                onPageChange: (p) => setPageParam(p),
              }}
              mobileCardRender={(store) => (
                <StoreCard
                  store={store}
                  onClick={() => router.push(ADMIN_ROUTES.storeDetail(String(store.id)))}
                  onArchive={() => setArchivingId(store.id)}
                  onSync={() => { setSyncingId(store.id); setSyncConfirmOpen(true) }}
                  onEdit={() => { setEditingStore(store); setStoreDialogOpen(true) }}
                />
              )}
            />
          )}
        </>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
            <p className="text-sm font-medium">
              {t("bulk.selected", { count: selectedIds.size })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkArchiveOpen(true)}
              >
                {t("bulk.archive")}
              </Button>
              <Button size="sm" variant="outline">
                {t("bulk.change_format")}
              </Button>
              <Button size="sm" variant="outline">
                <Download className="size-3.5 mr-1.5" />
                {t("bulk.export")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                {t("bulk.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive single dialog */}
      <AlertDialog open={archivingId !== null} onOpenChange={(open) => !open && setArchivingId(null)}>
        <ConfirmDialog
          title={t("dialogs.archive_title")}
          message={t("dialogs.archive_description")}
          confirmLabel={t("dialogs.archive_confirm")}
          cancelLabel={t("dialogs.cancel")}
          variant="destructive"
          onConfirm={() => {
            if (archivingId !== null) handleArchiveSingle(archivingId);
          }}
          onOpenChange={(open) => !open && setArchivingId(null)}
        />
      </AlertDialog>

      {/* Bulk archive dialog */}
      <AlertDialog open={bulkArchiveOpen} onOpenChange={setBulkArchiveOpen}>
        <ConfirmDialog
          title={t("dialogs.bulk_archive_title", { count: selectedIds.size })}
          message={t("dialogs.bulk_archive_description")}
          confirmLabel={t("bulk.archive")}
          cancelLabel={t("dialogs.cancel")}
          variant="destructive"
          onConfirm={handleBulkArchive}
          onOpenChange={setBulkArchiveOpen}
        />
      </AlertDialog>

      {/* Sync LAMA confirm */}
      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.sync_lama_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.sync_lama_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setSyncConfirmOpen(false)}>{t("dialogs.cancel")}</Button>
            <Button onClick={() => syncingId !== null && handleSyncLama(syncingId)}>
              {t("dialogs.sync_lama_confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit dialog */}
      <StoreDialog
        open={storeDialogOpen}
        onOpenChange={setStoreDialogOpen}
        store={editingStore}
        onSuccess={fetchData}
      />
    </div>
  )
}
