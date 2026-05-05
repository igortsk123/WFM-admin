"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Archive,
  Check,
  ChevronsUpDown,
  Download,
  FileWarning,
  MoreVertical,
  Plus,
  SearchX,
  Upload,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import type {
  Permission,
  FunctionalRole,
  EmployeeType,
  FreelancerStatus,
} from "@/lib/types"
import type { UserWithAssignment } from "@/lib/api/users"
import { getUsers, archiveUser, bulkAssignPermission } from "@/lib/api/users"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
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
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { PageHeader } from "@/components/shared/page-header"
import { FilterChip } from "@/components/shared/filter-chip"
import { UserCell } from "@/components/shared/user-cell"
import { PermissionPill } from "@/components/shared/permission-pill"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { RoleBadge } from "@/components/shared/role-badge"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge"

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
]

const ALL_ROLES: FunctionalRole[] = [
  "WORKER",
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
]

const STORE_OPTIONS = [
  { id: 1, name: "СПАР Томск, пр. Ленина 80" },
  { id: 2, name: "СПАР Томск, ул. Красноармейская 99" },
  { id: 4, name: "СПАР Новосибирск, ул. Ленина 55" },
  { id: 5, name: "СПАР Новосибирск, Красный пр. 200" },
  { id: 6, name: "СПАР Кемерово, пр. Советский 50" },
  { id: 7, name: "Food City Томск Global Market, пр. Ленина 217" },
  { id: 8, name: "Food City Томск, ул. Учебная 39" },
  { id: 10, name: "Магазин одежды Альфа, Томск, пр. Ленина 50" },
]

const POSITION_OPTIONS = [
  { id: 1, name: "Универсал" },
  { id: 2, name: "Кассир" },
  { id: 3, name: "Старший кассир" },
  { id: 4, name: "Продавец-консультант" },
  { id: 5, name: "Кладовщик" },
  { id: 6, name: "Мерчендайзер" },
  { id: 7, name: "Директор магазина" },
  { id: 8, name: "Супервайзер" },
]

// Agents for filter — mirrors MOCK_FREELANCE_AGENTS (only ACTIVE)
const AGENT_OPTIONS = [
  { id: "agent-001", name: "ИП Захарова М. С." },
  { id: "agent-002", name: 'ООО «Кадровый партнёр»' },
  { id: "agent-003", name: "ИП Никитин А. И." },
]

const ALL_FREELANCER_STATUSES: FreelancerStatus[] = [
  "NEW",
  "VERIFICATION",
  "ACTIVE",
  "BLOCKED",
  "ARCHIVED",
]

/** Statuses that block task assignment */
const INACTIVE_FREELANCER_STATUSES: FreelancerStatus[] = [
  "NEW",
  "VERIFICATION",
  "BLOCKED",
]

// ─────────────────────────────────────────────────────────────────
// MULTI-SELECT COMBOBOX
// ─────────────────────────────────────────────────────────────────

interface MultiSelectComboboxProps {
  options: { value: string; label: string }[]
  selected: string[]
  onSelectionChange: (values: string[]) => void
  placeholder: string
  className?: string
}

function MultiSelectCombobox({
  options,
  selected,
  onSelectionChange,
  placeholder,
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} выбрано`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm",
            selected.length > 0 ? "text-foreground" : "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-9" />
          <CommandList>
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}
                  className="gap-2"
                >
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center rounded border border-border",
                      selected.includes(option.value)
                        ? "bg-primary border-primary"
                        : "opacity-50"
                    )}
                  >
                    {selected.includes(option.value) && (
                      <Check className="size-3 text-primary-foreground" />
                    )}
                  </div>
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
            {value
              ? options.find((o) => o.value === value)?.label
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-9" />
          <CommandList>
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(current) => {
                    onValueChange(current === value ? "" : current)
                    setOpen(false)
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
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
// PERMISSION ASSIGN DIALOG
// ─────────────────────────────────────────────────────────────────

interface PermissionAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: number[]
  onSuccess: () => void
}

function PermissionAssignDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: PermissionAssignDialogProps) {
  const t = useTranslations("screen.employees")
  const tPerm = useTranslations("permission")
  const [selectedPerm, setSelectedPerm] = React.useState<Permission | "">("")
  const [loading, setLoading] = React.useState(false)

  const permOptions = ALL_PERMISSIONS.map((p) => ({
    value: p,
    label: tPerm(
      p === "CASHIER"
        ? "cashier"
        : p === "SALES_FLOOR"
        ? "sales_floor"
        : p === "SELF_CHECKOUT"
        ? "self_checkout"
        : p === "WAREHOUSE"
        ? "warehouse"
        : "production_line"
    ),
  }))

  async function handleConfirm() {
    if (!selectedPerm) return
    setLoading(true)
    try {
      const result = await bulkAssignPermission(selectedIds, selectedPerm)
      if (result.success) {
        toast.success(t("toast.permission_assigned"))
        onSuccess()
        onOpenChange(false)
        setSelectedPerm("")
      } else {
        toast.error(t("toast.error"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("dialogs.permission_title")}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <SingleSelectCombobox
            options={permOptions}
            value={selectedPerm}
            onValueChange={(v) => setSelectedPerm(v as Permission | "")}
            placeholder={t("dialogs.permission_select")}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("bulk.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPerm || loading}
          >
            {loading ? "..." : t("bulk.assign_permission")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function formatHiredAt(isoDate: string | undefined, locale: string): string {
  if (!isoDate) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate))
}

function formatShiftTime(timeStr: string | undefined): string {
  if (!timeStr) return ""
  // Extract HH:mm from ISO datetime "2026-05-01T09:00:00"
  return timeStr.substring(11, 16)
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function EmployeesList() {
  const t = useTranslations("screen.employees")
  const tRole = useTranslations("role.functional")
  const tPerm = useTranslations("permission")
  const router = useRouter()
  const locale = useLocale()
  const { user } = useAuth()

  const currentRole = user.role

  const canFullCRUD = currentRole === "HR_MANAGER" || currentRole === "NETWORK_OPS"
  const canArchiveBulk = canFullCRUD
  const canImpersonate = canFullCRUD
  const hideStore = currentRole === "STORE_DIRECTOR"

  // ── URL state ───────────────────────────────────────────────────
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all")
  )
  const [searchParam, setSearchParam] = useQueryState(
    "search",
    parseAsString.withDefault("")
  )
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  )

  // Local filter state (not in URL for brevity — complex multi arrays)
  const [selectedStoreIds, setSelectedStoreIds] = React.useState<string[]>([])
  const [selectedPositionIds, setSelectedPositionIds] = React.useState<
    string[]
  >([])
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    string[]
  >([])
  const [selectedRole, setSelectedRole] = React.useState<string>("")
  const [selectedEmploymentType, setSelectedEmploymentType] =
    React.useState<string>("")
  const [selectedAgentIds, setSelectedAgentIds] = React.useState<string[]>([])
  const [selectedFreelancerStatus, setSelectedFreelancerStatus] =
    React.useState<string>("")
  const [selectedSource, setSelectedSource] = React.useState<string>("")

  // ── Data state ──────────────────────────────────────────────────
  const [data, setData] = React.useState<UserWithAssignment[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())

  // ── Dialog state ────────────────────────────────────────────────
  const [permDialogOpen, setPermDialogOpen] = React.useState(false)
  const [archivingId, setArchivingId] = React.useState<number | null>(null)
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] =
    React.useState(false)

  // ── Fetch ───────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const archived = statusParam === "archived"
      const result = await getUsers({
        archived,
        search: searchParam || undefined,
        store_ids:
          selectedStoreIds.length > 0
            ? selectedStoreIds.map(Number)
            : undefined,
        position_ids:
          selectedPositionIds.length > 0
            ? selectedPositionIds.map(Number)
            : undefined,
        permissions:
          selectedPermissions.length > 0
            ? (selectedPermissions as Permission[])
            : undefined,
        role: selectedRole ? (selectedRole as FunctionalRole) : undefined,
        employment_type: selectedEmploymentType
          ? (selectedEmploymentType as EmployeeType)
          : undefined,
        freelancer_status: selectedFreelancerStatus
          ? (selectedFreelancerStatus as FreelancerStatus)
          : undefined,
        agent_ids:
          selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
        source: selectedSource
          ? (selectedSource as "MANUAL" | "EXTERNAL_SYNC")
          : undefined,
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
  }, [
    statusParam,
    searchParam,
    selectedStoreIds,
    selectedPositionIds,
    selectedPermissions,
    selectedRole,
    selectedEmploymentType,
    selectedFreelancerStatus,
    selectedAgentIds,
    selectedSource,
    pageParam,
  ])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Counts for tabs ─────────────────────────────────────────────
  const [allCount, setAllCount] = React.useState(0)
  const [activeCount, setActiveCount] = React.useState(0)
  const [archivedCount, setArchivedCount] = React.useState(0)

  React.useEffect(() => {
    Promise.all([
      getUsers({ archived: false, page_size: 1 }),
      getUsers({ archived: true, page_size: 1 }),
    ]).then(([active, archived]) => {
      const a = active.total ?? 0
      const ar = archived.total ?? 0
      setActiveCount(a)
      setArchivedCount(ar)
      setAllCount(a + ar)
    })
  }, [])

  // ── Org feature flags (mock: NOMINAL_ACCOUNT + external_hr_enabled) ──
  // In production these come from user.organization
  type PaymentMode = "NOMINAL_ACCOUNT" | "CLIENT_DIRECT"
  const paymentMode: PaymentMode = "NOMINAL_ACCOUNT" as PaymentMode
  const externalHrEnabled = true
  const showAgentFilter = paymentMode !== "CLIENT_DIRECT"
  const showSourceFilter = externalHrEnabled
  const showFreelancerStatusFilter = selectedEmploymentType === "FREELANCE"

  // ── Active filter count ─────────────────────────────────────────
  const activeFilterCount =
    selectedStoreIds.length +
    selectedPositionIds.length +
    selectedPermissions.length +
    (selectedRole ? 1 : 0) +
    (selectedEmploymentType ? 1 : 0) +
    selectedAgentIds.length +
    (selectedFreelancerStatus ? 1 : 0) +
    (selectedSource ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0 || !!searchParam

  function clearAllFilters() {
    setSelectedStoreIds([])
    setSelectedPositionIds([])
    setSelectedPermissions([])
    setSelectedRole("")
    setSelectedEmploymentType("")
    setSelectedAgentIds([])
    setSelectedFreelancerStatus("")
    setSelectedSource("")
    setSearchParam(null)
    setPageParam(null)
  }

  // ── Selection helpers ───────────────────────────────────────────
  const allSelected = data.length > 0 && data.every((u) => selectedIds.has(u.id))
  const someSelected = selectedIds.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((u) => u.id)))
    }
  }

  function toggleRow(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // ── Row actions ─────────────────────────────────────────────────
  async function handleArchiveSingle(id: number) {
    const result = await archiveUser(id)
    if (result.success) {
      toast.success(t("toast.archived"))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds)
    const results = await Promise.all(ids.map((id) => archiveUser(id)))
    const successCount = results.filter((r) => r.success).length
    if (successCount > 0) {
      toast.success(t("toast.bulk_archived", { count: successCount }))
      fetchData()
      setSelectedIds(new Set())
    } else {
      toast.error(t("toast.error"))
    }
    setBulkArchiveDialogOpen(false)
  }

  function handleRowClick(row: UserWithAssignment, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey) {
      console.log("[v0] New tab:", ADMIN_ROUTES.employeeDetail(String(row.id)))
      return
    }
    router.push(ADMIN_ROUTES.employeeDetail(String(row.id)))
  }

  // ── Permission/Role label helpers ────────────────────────────────
  const permLabelMap: Record<Permission, string> = {
    CASHIER: tPerm("cashier"),
    SALES_FLOOR: tPerm("sales_floor"),
    SELF_CHECKOUT: tPerm("self_checkout"),
    WAREHOUSE: tPerm("warehouse"),
    PRODUCTION_LINE: tPerm("production_line"),
  }

  const roleLabelMap: Record<string, string> = {
    WORKER: tRole("worker"),
    STORE_DIRECTOR: tRole("store_director"),
    SUPERVISOR: tRole("supervisor"),
    REGIONAL: tRole("regional"),
    NETWORK_OPS: tRole("network_ops"),
    HR_MANAGER: tRole("hr_manager"),
    OPERATOR: tRole("operator"),
  }

  // ── Columns ─────────────────────────────────────────────────────
  const columns: ColumnDef<UserWithAssignment>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
          aria-label="Select all"
          className="translate-y-[1px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleRow(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
          className="translate-y-[1px]"
        />
      ),
      enableSorting: false,
    },
    {
      id: "fio",
      header: t("columns.fio"),
      cell: ({ row }) => {
        const u = row.original
        const hasUnsignedOferta =
          u.type === "FREELANCE" && !u.oferta_accepted_at
        return (
          <div className="flex items-center gap-1.5">
            <UserCell
              user={{
                first_name: u.first_name,
                last_name: u.last_name,
                middle_name: u.middle_name,
                avatar_url: u.avatar_url,
                position_name: u.assignment?.position_name,
              }}
            />
            {hasUnsignedOferta && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FileWarning
                      className="size-3.5 text-warning shrink-0"
                      aria-label={t("employment.no_oferta")}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("employment.no_oferta")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
    },
    ...(!hideStore
      ? [
          {
            id: "store",
            header: t("columns.store"),
            cell: ({ row }: { row: { original: UserWithAssignment } }) => (
              <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                {row.original.assignment?.store_name ?? "—"}
              </span>
            ),
          } as ColumnDef<UserWithAssignment>,
        ]
      : []),
    {
      id: "position",
      header: t("columns.position"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.assignment?.position_name ?? "—"}
        </span>
      ),
    },
    {
      id: "functional_role",
      header: t("columns.functional_role"),
      cell: ({ row }) =>
        row.original.functional_role ? (
          <RoleBadge role={row.original.functional_role} size="sm" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "permissions",
      header: t("columns.permissions"),
      cell: ({ row }) => {
        const perms = row.original.permissions ?? []
        const visible = perms.slice(0, 3)
        const extra = perms.length - 3
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((p) => (
              <PermissionPill key={p} permission={p} />
            ))}
            {extra > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5">
                {t("columns.more_permissions", { n: extra })}
              </Badge>
            )}
            {perms.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        )
      },
    },
    {
      id: "current_shift",
      header: t("columns.current_shift"),
      cell: ({ row }) => {
        const shift = row.original.current_shift
        if (!shift) {
          return (
            <span className="text-xs italic text-muted-foreground">
              {t("shift.no_shift")}
            </span>
          )
        }
        const start = formatShiftTime(shift.actual_start ?? shift.planned_start)
        const end = formatShiftTime(shift.actual_end ?? shift.planned_end)
        return (
          <div className="flex items-center gap-1.5">
            <ShiftStateBadge status={shift.status} size="sm" />
            {shift.status === "OPENED" && start && end && (
              <span className="text-xs text-muted-foreground">
                {t("shift.time_range", { start, end })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "employment",
      header: t("columns.employment"),
      cell: ({ row }) => {
        const isFreelance = row.original.type === "FREELANCE"
        const noDocs =
          isFreelance &&
          (row.original.freelance_documents_count ?? 0) === 0
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              className={cn(
                "text-xs",
                isFreelance
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {isFreelance
                ? t("employment.freelance")
                : t("employment.staff")}
            </Badge>
            {noDocs && (
              <FileWarning
                className="size-3.5 text-warning shrink-0"
                aria-label={t("employment.no_documents")}
              />
            )}
          </div>
        )
      },
    },
    {
      id: "hired_at",
      header: t("columns.hired_at"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatHiredAt(row.original.hired_at, locale)}
        </span>
      ),
    },
    // ── FREELANCE-only columns ──────────────────────────────────────
    {
      id: "freelancer_status",
      header: t("columns.freelancer_status"),
      cell: ({ row }) => {
        const u = row.original
        if (u.type !== "FREELANCE" || !u.freelancer_status) return null
        return <FreelancerStatusBadge status={u.freelancer_status} size="sm" />
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const u = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => e.stopPropagation()}
                aria-label={t("row_actions.open")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(ADMIN_ROUTES.employeeDetail(String(u.id)))
                }}
              >
                {t("row_actions.open")}
              </DropdownMenuItem>
              {u.type === "FREELANCE" &&
              u.freelancer_status &&
              INACTIVE_FREELANCER_STATUSES.includes(u.freelancer_status) ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                        {t("row_actions.assign_task")}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("employment.not_activated_tooltip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`${ADMIN_ROUTES.taskNew}?assignee_id=${u.id}`)
                  }}
                >
                  {t("row_actions.assign_task")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIds(new Set([u.id]))
                  setPermDialogOpen(true)
                }}
              >
                {t("row_actions.permissions")}
              </DropdownMenuItem>
              {canFullCRUD && (
                <DropdownMenuItem
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("row_actions.change_position")}
                </DropdownMenuItem>
              )}
              {canImpersonate &&
                process.env.NODE_ENV === "development" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log("[v0] Impersonate user:", u.id)
                    }}
                  >
                    {t("row_actions.impersonate")}
                  </DropdownMenuItem>
                )}
              {canArchiveBulk && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setArchivingId(u.id)
                    }}
                  >
                    {t("row_actions.archive")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
  ]

  // ── Filter options ───────────────────────────────────────────────
  const storeOptions = STORE_OPTIONS.map((s) => ({
    value: String(s.id),
    label: s.name,
  }))
  const positionOptions = POSITION_OPTIONS.map((p) => ({
    value: String(p.id),
    label: p.name,
  }))
  const permOptions = ALL_PERMISSIONS.map((p) => ({
    value: p,
    label: permLabelMap[p],
  }))
  const roleOptions = ALL_ROLES.map((r) => ({
    value: r,
    label: roleLabelMap[r] ?? r,
  }))
  const employmentOptions = [
    { value: "STAFF", label: t("employment.staff") },
    { value: "FREELANCE", label: t("employment.freelance") },
  ]

  const agentOptions = AGENT_OPTIONS.map((a) => ({
    value: a.id,
    label: a.name,
  }))

  const freelancerStatusOptions = ALL_FREELANCER_STATUSES.map((s) => ({
    value: s,
    label:
      s === "NEW"
        ? "Новый"
        : s === "VERIFICATION"
        ? "Проверка"
        : s === "ACTIVE"
        ? "Активен"
        : s === "BLOCKED"
        ? "Заблокирован"
        : "Архив",
  }))

  const sourceOptions = [
    { value: "MANUAL", label: t("source.manual") },
    { value: "EXTERNAL_SYNC", label: t("source.external") },
  ]

  // ── Empty state variants ─────────────────────────────────────────
  function getEmptyState() {
    if (hasActiveFilters || !!searchParam) {
      return {
        icon: SearchX,
        title: t("empty.filtered.title"),
        description: t("empty.filtered.subtitle"),
        action: {
          label: t("empty.filtered.reset"),
          onClick: clearAllFilters,
        },
      }
    }
    if (statusParam === "archived") {
      return {
        icon: Archive,
        title: t("empty.archived.title"),
        description: t("empty.archived.subtitle"),
      }
    }
    return {
      icon: Users,
      title: t("empty.all.title"),
      description: "",
      action: canFullCRUD
        ? {
            label: t("empty.all.cta"),
            onClick: () => router.push(ADMIN_ROUTES.employeeNew),
          }
        : undefined,
    }
  }

  const emptyState = getEmptyState()

  // ── Tab counts ──────────────────────────────────────────────────
  const tabCountMap: Record<string, number> = {
    all: allCount,
    active: activeCount,
    archived: archivedCount,
  }

  const displayTotal = tabCountMap[statusParam] ?? total

  // ── Header actions ───────────────────────────────────────────────
  const desktopActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex"
        onClick={() => toast.info("Импорт XLSX — мок")}
      >
        <Upload className="size-4 mr-1.5" />
        {t("actions.import_xlsx")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex"
        onClick={() => toast.info("Экспорт XLSX — мок")}
      >
        <Download className="size-4 mr-1.5" />
        {t("actions.export_xlsx")}
      </Button>
      {canFullCRUD && (
        <Button
          size="sm"
          onClick={() => router.push(ADMIN_ROUTES.employeeNew)}
          className="hidden md:flex"
        >
          <Plus className="size-4 mr-1.5" />
          {t("actions.add")}
        </Button>
      )}
      {/* Mobile: meatball menu for secondary actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden size-9">
            <MoreVertical className="size-4" />
            <span className="sr-only">{t("actions.more")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => toast.info("Импорт XLSX — мок")}>
            {t("actions.import_xlsx")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Экспорт XLSX — мок")}>
            {t("actions.export_xlsx")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Mobile: primary add button */}
      {canFullCRUD && (
        <Button
          size="sm"
          onClick={() => router.push(ADMIN_ROUTES.employeeNew)}
          className="md:hidden"
        >
          <Plus className="size-4 mr-1.5" />
          {t("actions.add")}
        </Button>
      )}
    </>
  )

  // ── Filter chips ─────────────────────────────────────────────────
  const filterChips: React.ReactNode[] = []

  selectedStoreIds.forEach((id) => {
    const name =
      STORE_OPTIONS.find((s) => String(s.id) === id)?.name ?? id
    filterChips.push(
      <FilterChip
        key={`store-${id}`}
        label={t("filters.store")}
        value={name}
        onRemove={() =>
          setSelectedStoreIds((prev) => prev.filter((v) => v !== id))
        }
      />
    )
  })

  selectedPositionIds.forEach((id) => {
    const name =
      POSITION_OPTIONS.find((p) => String(p.id) === id)?.name ?? id
    filterChips.push(
      <FilterChip
        key={`pos-${id}`}
        label={t("filters.position")}
        value={name}
        onRemove={() =>
          setSelectedPositionIds((prev) => prev.filter((v) => v !== id))
        }
      />
    )
  })

  selectedPermissions.forEach((p) => {
    filterChips.push(
      <FilterChip
        key={`perm-${p}`}
        label={t("filters.permission")}
        value={permLabelMap[p as Permission] ?? p}
        onRemove={() =>
          setSelectedPermissions((prev) => prev.filter((v) => v !== p))
        }
      />
    )
  })

  if (selectedRole) {
    filterChips.push(
      <FilterChip
        key="role"
        label={t("filters.functional_role")}
        value={roleLabelMap[selectedRole] ?? selectedRole}
        onRemove={() => setSelectedRole("")}
      />
    )
  }

  if (selectedEmploymentType) {
    filterChips.push(
      <FilterChip
        key="emp"
        label={t("filters.employment_type")}
        value={
          selectedEmploymentType === "STAFF"
            ? t("employment.staff")
            : t("employment.freelance")
        }
        onRemove={() => setSelectedEmploymentType("")}
      />
    )
  }

  selectedAgentIds.forEach((id) => {
    const name = AGENT_OPTIONS.find((a) => a.id === id)?.name ?? id
    filterChips.push(
      <FilterChip
        key={`agent-${id}`}
        label={t("filters.agent")}
        value={name}
        onRemove={() =>
          setSelectedAgentIds((prev) => prev.filter((v) => v !== id))
        }
      />
    )
  })

  if (selectedFreelancerStatus) {
    const statusLabel =
      freelancerStatusOptions.find((o) => o.value === selectedFreelancerStatus)
        ?.label ?? selectedFreelancerStatus
    filterChips.push(
      <FilterChip
        key="fstatus"
        label={t("filters.freelancer_status")}
        value={statusLabel}
        onRemove={() => setSelectedFreelancerStatus("")}
      />
    )
  }

  if (selectedSource) {
    filterChips.push(
      <FilterChip
        key="source"
        label={t("filters.source_creation")}
        value={
          selectedSource === "MANUAL"
            ? t("source.manual")
            : t("source.external")
        }
        onRemove={() => setSelectedSource("")}
      />
    )
  }

  // ── Mobile card render ────────────────────────────────────────────
  function renderMobileCard(u: UserWithAssignment) {
    const shift = u.current_shift
    const isFreelance = u.type === "FREELANCE"
    const noDocs = isFreelance && (u.freelance_documents_count ?? 0) === 0
    const start = shift ? formatShiftTime(shift.actual_start ?? shift.planned_start) : ""
    const end = shift ? formatShiftTime(shift.actual_end ?? shift.planned_end) : ""
    const visiblePerms = (u.permissions ?? []).slice(0, 2)
    const extraPerms = (u.permissions ?? []).length - 2

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <UserCell
              user={{
                first_name: u.first_name,
                last_name: u.last_name,
                middle_name: u.middle_name,
                avatar_url: u.avatar_url,
                position_name: u.assignment?.position_name,
              }}
              className="flex-1"
            />
            {noDocs && (
              <FileWarning
                className="size-4 text-warning shrink-0"
                aria-label={t("employment.no_documents")}
              />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Checkbox
              checked={selectedIds.has(u.id)}
              onCheckedChange={() => toggleRow(u.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select"
              className="size-5"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(ADMIN_ROUTES.employeeDetail(String(u.id)))
                  }}
                >
                  {t("row_actions.open")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`${ADMIN_ROUTES.taskNew}?assignee_id=${u.id}`)
                  }}
                >
                  {t("row_actions.assign_task")}
                </DropdownMenuItem>
                {canArchiveBulk && !u.archived && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setArchivingId(u.id)
                      }}
                    >
                      {t("row_actions.archive")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!hideStore && u.assignment?.store_name && (
          <p className="text-xs text-muted-foreground truncate pl-[42px]">
            {u.assignment.store_name}
          </p>
        )}

        <div className="flex items-center gap-2 pl-[42px] flex-wrap">
          {u.functional_role && (
            <RoleBadge role={u.functional_role} size="sm" />
          )}
          <Badge
            className={cn(
              "text-xs",
              isFreelance
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-muted text-muted-foreground border-transparent"
            )}
          >
            {isFreelance ? t("employment.freelance") : t("employment.staff")}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1 pl-[42px]">
          {visiblePerms.map((p) => (
            <PermissionPill key={p} permission={p} />
          ))}
          {extraPerms > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5">
              {t("columns.more_permissions", { n: extraPerms })}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 pl-[42px]">
          {shift ? (
            <>
              <ShiftStateBadge status={shift.status} size="sm" />
              {shift.status === "OPENED" && start && end && (
                <span className="text-xs text-muted-foreground">
                  {t("shift.time_range", { start, end })}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              {t("shift.no_shift")}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Filter panel (reused desktop + mobile sheet) ──────────────────
  const _filterPanel = (
    <div className="flex flex-col gap-3">
      {!hideStore && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t("filters.store")}
          </p>
          <MultiSelectCombobox
            options={storeOptions}
            selected={selectedStoreIds}
            onSelectionChange={setSelectedStoreIds}
            placeholder={t("filters.store")}
            className="w-full"
          />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {t("filters.position")}
        </p>
        <MultiSelectCombobox
          options={positionOptions}
          selected={selectedPositionIds}
          onSelectionChange={setSelectedPositionIds}
          placeholder={t("filters.position")}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {t("filters.permission")}
        </p>
        <MultiSelectCombobox
          options={permOptions}
          selected={selectedPermissions}
          onSelectionChange={setSelectedPermissions}
          placeholder={t("filters.permission")}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {t("filters.functional_role")}
        </p>
        <SingleSelectCombobox
          options={roleOptions}
          value={selectedRole}
          onValueChange={setSelectedRole}
          placeholder={t("filters.functional_role")}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {t("filters.employment_type")}
        </p>
        <SingleSelectCombobox
          options={employmentOptions}
          value={selectedEmploymentType}
          onValueChange={setSelectedEmploymentType}
          placeholder={t("filters.employment_type")}
          className="w-full"
        />
      </div>
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={
          isLoading
            ? undefined
            : t("counter", { count: displayTotal })
        }
        actions={desktopActions}
      />

      {/* Tabs */}
      <ScrollArea className="w-full">
        <Tabs
          value={statusParam}
          onValueChange={(v) => {
            setStatusParam(v === "all" ? null : v)
            setPageParam(null)
            setSelectedIds(new Set())
          }}
        >
          <TabsList className="h-9">
            <TabsTrigger value="all">
              {t("tabs.all")}
              {allCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">
                  {allCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              {t("tabs.active")}
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">
              {t("tabs.archived")}
              {archivedCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">
                  {archivedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Search + Desktop filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("filters.search_placeholder")}
            value={searchParam ?? ""}
            onChange={(e) => {
              setSearchParam(e.target.value || null)
              setPageParam(null)
            }}
            className="h-9 max-w-xs"
          />

          {/* Desktop filter comboboxes */}
          <div className="hidden md:flex items-center gap-2 flex-wrap flex-1">
            {!hideStore && (
              <MultiSelectCombobox
                options={storeOptions}
                selected={selectedStoreIds}
                onSelectionChange={(v) => {
                  setSelectedStoreIds(v)
                  setPageParam(null)
                }}
                placeholder={t("filters.store")}
                className="w-44"
              />
            )}
            <MultiSelectCombobox
              options={positionOptions}
              selected={selectedPositionIds}
              onSelectionChange={(v) => {
                setSelectedPositionIds(v)
                setPageParam(null)
              }}
              placeholder={t("filters.position")}
              className="w-44"
            />
            <MultiSelectCombobox
              options={permOptions}
              selected={selectedPermissions}
              onSelectionChange={(v) => {
                setSelectedPermissions(v)
                setPageParam(null)
              }}
              placeholder={t("filters.permission")}
              className="w-40"
            />
            <SingleSelectCombobox
              options={roleOptions}
              value={selectedRole}
              onValueChange={(v) => {
                setSelectedRole(v)
                setPageParam(null)
              }}
              placeholder={t("filters.functional_role")}
              className="w-44"
            />
            <SingleSelectCombobox
              options={employmentOptions}
              value={selectedEmploymentType}
              onValueChange={(v) => {
                setSelectedEmploymentType(v)
                // Reset freelancer-specific filter if no longer FREELANCE
                if (v !== "FREELANCE") setSelectedFreelancerStatus("")
                setPageParam(null)
              }}
              placeholder={t("filters.employment_type")}
              className="w-40"
            />
            {showFreelancerStatusFilter && (
              <SingleSelectCombobox
                options={freelancerStatusOptions}
                value={selectedFreelancerStatus}
                onValueChange={(v) => {
                  setSelectedFreelancerStatus(v)
                  setPageParam(null)
                }}
                placeholder={t("filters.freelancer_status")}
                className="w-44"
              />
            )}
            {showAgentFilter && (
              <MultiSelectCombobox
                options={agentOptions}
                selected={selectedAgentIds}
                onSelectionChange={(v) => {
                  setSelectedAgentIds(v)
                  setPageParam(null)
                }}
                placeholder={t("filters.agent")}
                className="w-44"
              />
            )}
            {showSourceFilter && (
              <SingleSelectCombobox
                options={sourceOptions}
                value={selectedSource}
                onValueChange={(v) => {
                  setSelectedSource(v)
                  setPageParam(null)
                }}
                placeholder={t("filters.source_creation")}
                className="w-44"
              />
            )}
          </div>

          {/* Mobile filter sheet trigger */}
          <div className="md:hidden flex-1">
              <MobileFilterSheet
                activeCount={activeFilterCount}
                onClearAll={clearAllFilters}
                onApply={() => { /* filters apply on change */ }}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("filters.store")}
                    </p>
                    <MultiSelectCombobox
                      options={storeOptions}
                      selected={selectedStoreIds}
                      onSelectionChange={(v) => {
                        setSelectedStoreIds(v)
                        setPageParam(null)
                      }}
                      placeholder={t("filters.store")}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("filters.position")}
                    </p>
                    <MultiSelectCombobox
                      options={positionOptions}
                      selected={selectedPositionIds}
                      onSelectionChange={(v) => {
                        setSelectedPositionIds(v)
                        setPageParam(null)
                      }}
                      placeholder={t("filters.position")}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("filters.functional_role")}
                    </p>
                    <SingleSelectCombobox
                      options={roleOptions}
                      value={selectedRole}
                      onValueChange={(v) => {
                        setSelectedRole(v)
                        setPageParam(null)
                      }}
                      placeholder={t("filters.functional_role")}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("filters.employment_type")}
                    </p>
                    <SingleSelectCombobox
                      options={employmentOptions}
                      value={selectedEmploymentType}
                      onValueChange={(v) => {
                        setSelectedEmploymentType(v)
                        if (v !== "FREELANCE") setSelectedFreelancerStatus("")
                        setPageParam(null)
                      }}
                      placeholder={t("filters.employment_type")}
                      className="w-full"
                    />
                  </div>
                  {showFreelancerStatusFilter && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("filters.freelancer_status")}
                      </p>
                      <SingleSelectCombobox
                        options={freelancerStatusOptions}
                        value={selectedFreelancerStatus}
                        onValueChange={(v) => {
                          setSelectedFreelancerStatus(v)
                          setPageParam(null)
                        }}
                        placeholder={t("filters.freelancer_status")}
                        className="w-full"
                      />
                    </div>
                  )}
                  {showAgentFilter && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("filters.agent")}
                      </p>
                      <MultiSelectCombobox
                        options={agentOptions}
                        selected={selectedAgentIds}
                        onSelectionChange={(v) => {
                          setSelectedAgentIds(v)
                          setPageParam(null)
                        }}
                        placeholder={t("filters.agent")}
                        className="w-full"
                      />
                    </div>
                  )}
                  {showSourceFilter && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("filters.source_creation")}
                      </p>
                      <SingleSelectCombobox
                        options={sourceOptions}
                        value={selectedSource}
                        onValueChange={(v) => {
                          setSelectedSource(v)
                          setPageParam(null)
                        }}
                        placeholder={t("filters.source_creation")}
                        className="w-full"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("filters.permission")}
                    </p>
                    <MultiSelectCombobox
                      options={permOptions}
                      selected={selectedPermissions}
                      onSelectionChange={(v) => {
                        setSelectedPermissions(v)
                        setPageParam(null)
                      }}
                      placeholder={t("filters.permission")}
                      className="w-full"
                    />
                  </div>
                </div>
              </MobileFilterSheet>
          </div>
        </div>

        {/* Active filter chips */}
        {filterChips.length > 0 && (
          <div className="flex items-center flex-wrap gap-2">
            {filterChips}
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
            >
              {t("filters.clear_all")}
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-3">
            Не удалось загрузить список сотрудников.
            <Button size="sm" variant="outline" onClick={fetchData}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {!isError && (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={renderMobileCard}
          isLoading={isLoading}
          isEmpty={!isLoading && data.length === 0}
          emptyMessage={{
            title: emptyState.title,
            description: emptyState.description ?? "",
          }}
          pagination={{
            page: pageParam,
            pageSize: 20,
            total,
            onPageChange: (p) => setPageParam(p),
          }}
          onRowClick={handleRowClick}
        />
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg",
            "flex items-center gap-3 px-4 py-3 md:px-6",
            "md:left-[var(--sidebar-width,260px)]"
          )}
        >
          <span className="text-sm font-medium text-foreground shrink-0">
            {t("bulk.selected", { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2 flex-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPermDialogOpen(true)}
            >
              {t("bulk.assign_permission")}
            </Button>
            {canArchiveBulk && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkArchiveDialogOpen(true)}
              >
                {t("bulk.archive")}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 ml-auto"
            onClick={() => setSelectedIds(new Set())}
            aria-label={t("bulk.cancel")}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <PermissionAssignDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          fetchData()
          setSelectedIds(new Set())
        }}
      />

      {/* Single archive confirm */}
      <AlertDialog
        open={archivingId !== null}
        onOpenChange={(o) => !o && setArchivingId(null)}
      >
        <ConfirmDialog
          title={t("dialogs.archive_title")}
          message={t("dialogs.archive_description")}
          confirmLabel={t("dialogs.archive_confirm")}
          variant="destructive"
          onConfirm={async () => {
            if (archivingId !== null) await handleArchiveSingle(archivingId)
          }}
          onOpenChange={(o) => !o && setArchivingId(null)}
        />
      </AlertDialog>

      {/* Bulk archive confirm */}
      <AlertDialog
        open={bulkArchiveDialogOpen}
        onOpenChange={setBulkArchiveDialogOpen}
      >
        <ConfirmDialog
          title={t("dialogs.archive_title")}
          message={t("dialogs.archive_description")}
          confirmLabel={t("dialogs.archive_confirm")}
          variant="destructive"
          onConfirm={handleBulkArchive}
          onOpenChange={setBulkArchiveDialogOpen}
        />
      </AlertDialog>
    </div>
  )
}
