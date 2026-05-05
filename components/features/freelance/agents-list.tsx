"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Building2,
  ChevronsUpDown,
  Check,
  ExternalLink,
  MoreVertical,
  Plus,
  User,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import type { Agent, AgentStatus } from "@/lib/types"
import {
  getAgents,
  createAgent,
  updateAgent,
  blockAgent,
  archiveAgent,
  unblockAgent,
} from "@/lib/api/freelance-agents"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { AgentStatusBadge } from "@/components/shared/agent-status-badge"

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

type AgentTab = "active" | "blocked" | "archive"
type AgentType = "INDIVIDUAL" | "COMPANY"
type SheetMode = "create" | "edit"

const TAB_STATUS_MAP: Record<AgentTab, AgentStatus> = {
  active: "ACTIVE",
  blocked: "BLOCKED",
  archive: "ARCHIVED",
}

// ─────────────────────────────────────────────────────────────────
// CONTRACT BADGE
// ─────────────────────────────────────────────────────────────────

function ContractBadge({ signedAt }: { signedAt?: string | null }) {
  if (signedAt) {
    return (
      <Badge className="bg-success/10 text-success border-0 text-xs font-medium">
        Подписан
      </Badge>
    )
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-0 text-xs font-medium">
      Не подписан
    </Badge>
  )
}

// ─────────────────────────────────────────────────────────────────
// TYPE COMBOBOX (Single select)
// ─────────────────────────────────────────────────────────────────

interface TypeComboboxProps {
  value: string
  onValueChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}

function TypeCombobox({ value, onValueChange, placeholder, options }: TypeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const label = options.find((o) => o.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal text-sm min-w-[140px]",
            value ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="truncate">{label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {value && (
                <CommandItem
                  value=""
                  onSelect={() => { onValueChange(""); setOpen(false) }}
                  className="text-muted-foreground text-xs"
                >
                  Сбросить
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(current) => {
                    onValueChange(current === value ? "" : current)
                    setOpen(false)
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn("size-4", value === opt.value ? "opacity-100" : "opacity-0")}
                  />
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

// ─────────────────────────────────────────────────────────────────
// BLOCK DIALOG
// ─────────────────────────────────────────────────────────────────

interface BlockDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  isLoading: boolean
}

function BlockDialog({ open, onOpenChange, onConfirm, isLoading }: BlockDialogProps) {
  const t = useTranslations("screen.freelanceAgents")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (!open) setReason("")
  }, [open])

  async function handleConfirm() {
    if (reason.trim().length < 5) return
    await onConfirm(reason.trim())
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("block_dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("block_dialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="block-reason">{t("block_dialog.reason_label")}</Label>
          <textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("block_dialog.reason_placeholder")}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("block_dialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 5 || isLoading}
            onClick={handleConfirm}
          >
            {t("block_dialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// AGENT FORM (Sheet)
// ─────────────────────────────────────────────────────────────────

interface AgentFormData {
  name: string
  type: AgentType
  inn: string
  kpp: string
  ogrn: string
  contact_person_name: string
  contact_phone: string
  contact_email: string
  contract_url: string
  commission_pct: string
  status: AgentStatus
}

const EMPTY_FORM: AgentFormData = {
  name: "",
  type: "INDIVIDUAL",
  inn: "",
  kpp: "",
  ogrn: "",
  contact_person_name: "",
  contact_phone: "",
  contact_email: "",
  contract_url: "",
  commission_pct: "10",
  status: "ACTIVE",
}

interface AgentSheetProps {
  open: boolean
  mode: SheetMode
  agent: Agent | null
  onClose: () => void
  onSuccess: () => void
}

function AgentSheet({ open, mode, agent, onClose, onSuccess }: AgentSheetProps) {
  const t = useTranslations("screen.freelanceAgents")
  const [form, setForm] = React.useState<AgentFormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Partial<Record<keyof AgentFormData, string>>>({})

  // Populate form when editing
  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && agent) {
        setForm({
          name: agent.name,
          type: agent.type,
          inn: agent.inn ?? "",
          kpp: agent.kpp ?? "",
          ogrn: agent.ogrn ?? "",
          contact_person_name: agent.contact_person_name ?? "",
          contact_phone: agent.contact_phone ?? "",
          contact_email: agent.contact_email ?? "",
          contract_url: agent.contract_url ?? "",
          commission_pct: String(agent.commission_pct),
          status: agent.status,
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [open, mode, agent])

  function set(field: keyof AgentFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof AgentFormData, string>> = {}
    if (!form.name.trim()) errs.name = "Обязательное поле"
    if (!form.inn.trim()) {
      errs.inn = "Обязательное поле"
    } else if (form.type === "COMPANY" && form.inn.length !== 10) {
      errs.inn = "ИНН юр. лица — 10 цифр"
    } else if (form.type === "INDIVIDUAL" && form.inn.length !== 12) {
      errs.inn = "ИНН ИП/физлица — 12 цифр"
    }
    if (form.type === "COMPANY") {
      if (form.kpp && form.kpp.length !== 9) errs.kpp = "КПП — 9 цифр"
      if (form.ogrn && form.ogrn.length !== 13) errs.ogrn = "ОГРН — 13 цифр"
    }
    const pct = Number(form.commission_pct)
    if (isNaN(pct) || pct < 0 || pct > 50) errs.commission_pct = "От 0 до 50"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const payload: Partial<Agent> = {
        name: form.name.trim(),
        type: form.type,
        inn: form.inn.trim() || undefined,
        kpp: form.type === "COMPANY" ? (form.kpp.trim() || undefined) : undefined,
        ogrn: form.type === "COMPANY" ? (form.ogrn.trim() || undefined) : undefined,
        contact_person_name: form.contact_person_name.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        contract_url: form.contract_url.trim() || null,
        commission_pct: Number(form.commission_pct),
        status: mode === "edit" ? form.status : "ACTIVE",
      }

      const result =
        mode === "create"
          ? await createAgent(payload)
          : await updateAgent(agent!.id, payload)

      if (result.success) {
        toast.success(mode === "create" ? t("toasts.created") : t("toasts.updated"))
        onSuccess()
        onClose()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>
            {mode === "create" ? t("sheet.title_create") : t("sheet.title_edit")}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="af-name">
                {t("sheet.field_name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("sheet.field_name_placeholder")}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>{t("sheet.field_type")}</Label>
              <RadioGroup
                value={form.type}
                onValueChange={(v) => set("type", v as AgentType)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="INDIVIDUAL" id="af-type-ind" />
                  <Label htmlFor="af-type-ind" className="font-normal cursor-pointer">
                    {t("type.INDIVIDUAL")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="COMPANY" id="af-type-comp" />
                  <Label htmlFor="af-type-comp" className="font-normal cursor-pointer">
                    {t("type.COMPANY")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* INN */}
            <div className="space-y-1.5">
              <Label htmlFor="af-inn">
                {t("sheet.field_inn")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-inn"
                value={form.inn}
                onChange={(e) => set("inn", e.target.value.replace(/\D/g, ""))}
                placeholder={
                  form.type === "COMPANY"
                    ? t("sheet.field_inn_placeholder_company")
                    : t("sheet.field_inn_placeholder_individual")
                }
                maxLength={form.type === "COMPANY" ? 10 : 12}
                inputMode="numeric"
                className={cn(errors.inn && "border-destructive")}
              />
              {errors.inn && (
                <p className="text-xs text-destructive">{errors.inn}</p>
              )}
            </div>

            {/* KPP + OGRN (COMPANY only) */}
            {form.type === "COMPANY" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="af-kpp">{t("sheet.field_kpp")}</Label>
                  <Input
                    id="af-kpp"
                    value={form.kpp}
                    onChange={(e) => set("kpp", e.target.value.replace(/\D/g, ""))}
                    placeholder={t("sheet.field_kpp_placeholder")}
                    maxLength={9}
                    inputMode="numeric"
                    className={cn(errors.kpp && "border-destructive")}
                  />
                  {errors.kpp && (
                    <p className="text-xs text-destructive">{errors.kpp}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="af-ogrn">{t("sheet.field_ogrn")}</Label>
                  <Input
                    id="af-ogrn"
                    value={form.ogrn}
                    onChange={(e) => set("ogrn", e.target.value.replace(/\D/g, ""))}
                    placeholder={t("sheet.field_ogrn_placeholder")}
                    maxLength={13}
                    inputMode="numeric"
                    className={cn(errors.ogrn && "border-destructive")}
                  />
                  {errors.ogrn && (
                    <p className="text-xs text-destructive">{errors.ogrn}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="af-contact-name">{t("sheet.field_contact_name")}</Label>
              <Input
                id="af-contact-name"
                value={form.contact_person_name}
                onChange={(e) => set("contact_person_name", e.target.value)}
                placeholder="ФИО контактного лица"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="af-phone">{t("sheet.field_contact_phone")}</Label>
                <Input
                  id="af-phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                  placeholder="+7 ..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-email">{t("sheet.field_contact_email")}</Label>
                <Input
                  id="af-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Contract URL */}
            <div className="space-y-1.5">
              <Label htmlFor="af-contract">{t("sheet.field_contract_url")}</Label>
              <Input
                id="af-contract"
                value={form.contract_url}
                onChange={(e) => set("contract_url", e.target.value)}
                placeholder={t("sheet.field_contract_url_placeholder")}
              />
            </div>

            {/* Commission */}
            <div className="space-y-1.5">
              <Label htmlFor="af-commission">
                {t("sheet.field_commission")} <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="af-commission"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={form.commission_pct}
                  onChange={(e) => set("commission_pct", e.target.value)}
                  className={cn("w-28", errors.commission_pct && "border-destructive")}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              {errors.commission_pct && (
                <p className="text-xs text-destructive">{errors.commission_pct}</p>
              )}
            </div>

            {/* Status (edit only) */}
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label htmlFor="af-status">{t("sheet.field_status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as AgentStatus)}
                >
                  <SelectTrigger id="af-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                    <SelectItem value="BLOCKED">{t("status.BLOCKED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? t("sheet.submit_create") : t("sheet.submit_edit")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────
// TABLE SKELETON
// ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function AgentsList() {
  const t = useTranslations("screen.freelanceAgents")
  const router = useRouter()
  const locale = useLocale()
  const { user } = useAuth()

  const currentRole = user.role
  const canWrite = currentRole === "NETWORK_OPS" || currentRole === "HR_MANAGER"
  const isReadOnly = currentRole === "REGIONAL" || currentRole === "SUPERVISOR"

  // Guard: only available in NOMINAL_ACCOUNT mode
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT"

  // ── URL state (nuqs) ──────────────────────────────────────────────
  const [tabParam, setTabParam] = useQueryState("tab", parseAsString.withDefault("active"))
  const [searchParam, setSearchParam] = useQueryState("q", parseAsString.withDefault(""))
  const [typeParam, setTypeParam] = useQueryState("type", parseAsString.withDefault(""))
  const [pageParam, setPageParam] = useQueryState("page", parseAsInteger.withDefault(1))

  const activeTab = (tabParam as AgentTab) || "active"

  // ── Data state ────────────────────────────────────────────────────
  const [data, setData] = React.useState<Agent[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── Action state ──────────────────────────────────────────────────
  const [blockTarget, setBlockTarget] = React.useState<Agent | null>(null)
  const [isBlocking, setIsBlocking] = React.useState(false)
  const [isActing, setIsActing] = React.useState<string | null>(null) // agent id being actioned

  // ── Sheet state ───────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<SheetMode>("create")
  const [sheetAgent, setSheetAgent] = React.useState<Agent | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const status = TAB_STATUS_MAP[activeTab as AgentTab] ?? "ACTIVE"
      const result = await getAgents({
        status,
        search: searchParam || undefined,
        page: pageParam,
        page_size: 20,
      })
      // Client-side type filter
      const filtered =
        typeParam
          ? result.data.filter((a) => a.type === typeParam)
          : result.data
      setData(filtered)
      setTotal(filtered.length)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchParam, typeParam, pageParam])

  React.useEffect(() => {
    void fetchData()
  }, [fetchData])

  // ── Handlers ──────────────────────────────────────────────────────
  function handleRowClick(agent: Agent, e: React.MouseEvent) {
    const url = ADMIN_ROUTES.freelanceAgentDetail(agent.id)
    if (e.ctrlKey || e.metaKey) {
      window.open(url, "_blank", "noreferrer")
    } else {
      router.push(url)
    }
  }

  function openCreate() {
    setSheetMode("create")
    setSheetAgent(null)
    setSheetOpen(true)
  }

  function openEdit(agent: Agent) {
    setSheetMode("edit")
    setSheetAgent(agent)
    setSheetOpen(true)
  }

  async function handleBlock(reason: string) {
    if (!blockTarget) return
    setIsBlocking(true)
    try {
      const result = await blockAgent(blockTarget.id, reason)
      if (result.success) {
        toast.success(t("toasts.blocked"))
        setBlockTarget(null)
        void fetchData()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsBlocking(false)
    }
  }

  async function handleUnblock(agent: Agent) {
    setIsActing(agent.id)
    try {
      const result = await unblockAgent(agent.id)
      if (result.success) {
        toast.success(t("toasts.unblocked"))
        void fetchData()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsActing(null)
    }
  }

  async function handleArchive(agent: Agent) {
    setIsActing(agent.id)
    try {
      const result = await archiveAgent(agent.id)
      if (result.success) {
        toast.success(t("toasts.archived"))
        void fetchData()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsActing(null)
    }
  }

  // ── Type options ──────────────────────────────────────────────────
  const typeOptions = [
    { value: "INDIVIDUAL", label: t("type.INDIVIDUAL") },
    { value: "COMPANY", label: t("type.COMPANY") },
  ]

  // ── Columns ───────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<Agent>[]>(
    () => [
      {
        id: "name",
        header: t("columns.agent"),
        cell: ({ row }) => {
          const agent = row.original
          const Icon = agent.type === "COMPANY" ? Building2 : User
          return (
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="font-medium truncate">{agent.name}</span>
            </div>
          )
        },
      },
      {
        id: "inn",
        header: t("columns.inn"),
        size: 130,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground font-mono">
            {row.original.inn ?? "—"}
          </span>
        ),
      },
      {
        id: "contract",
        header: t("columns.contract"),
        size: 120,
        cell: ({ row }) => (
          <ContractBadge signedAt={row.original.contract_signed_at} />
        ),
      },
      {
        id: "commission_pct",
        header: () => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dashed border-muted-foreground">
                  {t("columns.commission")}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("commission_tooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        size: 110,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.commission_pct}%</span>
        ),
      },
      {
        id: "freelancers_count",
        header: t("columns.performers"),
        size: 120,
        cell: ({ row }) => {
          const agent = row.original
          const url = `${ADMIN_ROUTES.employees}?agent_id=${agent.id}&type=FREELANCE`
          return (
            <a
              href={url}
              onClick={(e) => { e.stopPropagation(); router.push(url) }}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline min-h-[44px] py-2"
              aria-label={`${agent.freelancers_count} исполнителей`}
            >
              <Users className="size-3.5" aria-hidden="true" />
              {agent.freelancers_count}
            </a>
          )
        },
      },
      {
        id: "total_earned_30d",
        header: t("columns.earned_30d"),
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.total_earned_30d.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")} ₽
          </span>
        ),
      },
      {
        id: "status",
        header: t("columns.status"),
        size: 120,
        cell: ({ row }) => <AgentStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        cell: ({ row }) => {
          const agent = row.original
          const actioning = isActing === agent.id

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  aria-label="Действия"
                  onClick={(e) => e.stopPropagation()}
                  disabled={actioning}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(ADMIN_ROUTES.freelanceAgentDetail(agent.id))
                  }}
                >
                  <ExternalLink className="size-3.5 mr-2 opacity-60" />
                  {t("menu.open")}
                </DropdownMenuItem>

                {canWrite && agent.status !== "ARCHIVED" && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); openEdit(agent) }}
                  >
                    {t("menu.edit")}
                  </DropdownMenuItem>
                )}

                {canWrite && agent.status === "ACTIVE" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-warning focus:text-warning"
                      onClick={(e) => { e.stopPropagation(); setBlockTarget(agent) }}
                    >
                      {t("menu.block")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); void handleArchive(agent) }}
                    >
                      {t("menu.archive")}
                    </DropdownMenuItem>
                  </>
                )}

                {canWrite && agent.status === "BLOCKED" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); void handleUnblock(agent) }}
                    >
                      {t("menu.unblock")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); void handleArchive(agent) }}
                    >
                      {t("menu.archive")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, canWrite, isActing, locale]
  )

  // ── Mobile card ───────────────────────────────────────────────────
  const mobileCard = React.useCallback(
    (agent: Agent) => {
      const Icon = agent.type === "COMPANY" ? Building2 : User
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="font-medium text-sm truncate">{agent.name}</span>
            </div>
            <AgentStatusBadge status={agent.status} size="sm" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {agent.inn && <span>ИНН: {agent.inn}</span>}
            <span className="flex items-center gap-1">
              <Users className="size-3" aria-hidden="true" />
              {agent.freelancers_count} исп.
            </span>
            <span>{agent.total_earned_30d.toLocaleString("ru-RU")} ₽ / 30д</span>
          </div>
          {canWrite && agent.status !== "ARCHIVED" && (
            <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => openEdit(agent)}
              >
                {t("menu.edit")}
              </Button>
              {agent.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs text-warning border-warning/30"
                  onClick={() => setBlockTarget(agent)}
                >
                  {t("menu.block")}
                </Button>
              )}
              {agent.status === "BLOCKED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => void handleUnblock(agent)}
                >
                  {t("menu.unblock")}
                </Button>
              )}
            </div>
          )}
        </div>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, t]
  )

  // ── Guard: CLIENT_DIRECT ──────────────────────────────────────────
  if (isClientDirect) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
        <p className="text-muted-foreground text-sm max-w-sm">
          Раздел «Агенты» недоступен в режиме прямых расчётов (CLIENT_DIRECT).
        </p>
      </div>
    )
  }

  // ── Mobile tabs combobox ──────────────────────────────────────────
  const tabOptions = [
    { value: "active",  label: t("tabs.active") },
    { value: "blocked", label: t("tabs.blocked") },
    { value: "archive", label: t("tabs.archive") },
  ]

  const isEmpty = !isLoading && data.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
          { label: t("breadcrumbs.agents") },
        ]}
        actions={
          canWrite ? (
            <Button
              size="sm"
              onClick={openCreate}
              className="h-9 min-w-[44px]"
              aria-label={t("actions.new_agent")}
            >
              <Plus className="size-4 mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("actions.new_agent")}</span>
              <span className="sm:hidden">Агент</span>
            </Button>
          ) : undefined
        }
      />

      {/* Tabs — desktop */}
      <div className="hidden md:block">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            void setTabParam(v)
            void setPageParam(null)
          }}
        >
          <TabsList>
            <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
            <TabsTrigger value="blocked">{t("tabs.blocked")}</TabsTrigger>
            <TabsTrigger value="archive">{t("tabs.archive")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabs — mobile combobox */}
      <div className="md:hidden">
        <TypeCombobox
          value={activeTab}
          onValueChange={(v) => { void setTabParam(v || "active"); void setPageParam(null) }}
          placeholder={t("tabs.active")}
          options={tabOptions}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder={t("filters.search")}
          value={searchParam}
          onChange={(e) => {
            void setSearchParam(e.target.value || null)
            void setPageParam(null)
          }}
          className="h-9 w-full sm:w-64"
          aria-label={t("filters.search")}
        />
        <TypeCombobox
          value={typeParam}
          onValueChange={(v) => { void setTypeParam(v || null); void setPageParam(null) }}
          placeholder={t("filters.type")}
          options={typeOptions}
        />
      </div>

      {/* Table / Cards */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">Не удалось загрузить данные</p>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            Повторить
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Users}
          title={t("empty.no_agents")}
          description={t("empty.description")}
          action={
            canWrite
              ? { label: t("actions.new_agent"), onClick: openCreate, icon: Plus }
              : undefined
          }
        />
      ) : (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          mobileCardRender={mobileCard}
          onRowClick={handleRowClick}
          pagination={{
            page: pageParam,
            pageSize: 20,
            total,
            onPageChange: (p) => void setPageParam(p),
          }}
        />
      )}

      {/* Block dialog */}
      <BlockDialog
        open={!!blockTarget}
        onOpenChange={(v) => !v && setBlockTarget(null)}
        onConfirm={handleBlock}
        isLoading={isBlocking}
      />

      {/* Create / Edit sheet */}
      <AgentSheet
        open={sheetOpen}
        mode={sheetMode}
        agent={sheetAgent}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => void fetchData()}
      />
    </div>
  )
}
