"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Eye,
  ArrowUpRight,
  Copy,
  ScrollText,
  SearchX,
  AlertCircle,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/shared/page-header";
import { FilterChip } from "@/components/shared/filter-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { RoleBadge } from "@/components/shared/role-badge";

import {
  getAuditEntries,
  getAuditEntryById,
  type AuditListParams,
} from "@/lib/api/audit";
import type { AuditEntry, FunctionalRole } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

function formatDateFull(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function formatDayLabel(iso: string, locale: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const dayStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(d);

  if (sameDay(d, today)) return `${t("today")}, ${dayStr}`;
  if (sameDay(d, yesterday)) return `${t("yesterday")}, ${dayStr}`;
  return dayStr;
}

function getDayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function detectDeviceType(ua?: string): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

const ENTITY_TYPE_OPTIONS = [
  "task",
  "user",
  "store",
  "shift",
  "organization",
  "api_key",
  "permission",
  "session",
  "work_type",
];

const ACTION_OPTIONS = [
  "task.create",
  "task.update",
  "task.start",
  "task.pause",
  "task.complete",
  "task.approve",
  "task.reject",
  "user.update",
  "user.activate",
  "user.deactivate",
  "permission.grant",
  "permission.revoke",
  "shift.open",
  "shift.close",
  "shift.force_close",
  "settings.update",
  "api_key.create",
  "login",
  "logout",
];

// ═══════════════════════════════════════════════════════════════════
// ENTITY BADGE
// ═══════════════════════════════════════════════════════════════════

const ENTITY_TYPE_STYLES: Record<string, string> = {
  task: "bg-info/10 text-info border-info/20",
  user: "bg-primary/10 text-primary border-primary/20",
  shift: "bg-warning/10 text-warning border-warning/20",
  store: "bg-success/10 text-success border-success/20",
  organization: "bg-accent text-accent-foreground border-border",
  api_key: "bg-destructive/10 text-destructive border-destructive/20",
  permission: "bg-primary/10 text-primary border-primary/20",
  session: "bg-muted text-muted-foreground border-border",
  work_type: "bg-accent text-accent-foreground border-border",
};

function EntityBadge({ type, label }: { type: string; label?: string }) {
  const style = ENTITY_TYPE_STYLES[type] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium shrink-0", style)}>
      {label ?? type}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MULTI-SELECT COMBOBOX (for entity types / actions)
// ═══════════════════════════════════════════════════════════════════

interface MultiComboboxProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

function MultiCombobox({ options, selected, onChange, placeholder }: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 justify-between gap-1.5 min-w-[140px] text-sm"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
              ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
              : `${placeholder} (${selected.length})`}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." />
          <CommandList>
            <CommandEmpty>Нет вариантов</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => toggle(opt.value)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex size-4 items-center justify-center rounded border border-muted-foreground/40",
                      selected.includes(opt.value) && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {selected.includes(opt.value) && (
                      <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
                        <path d="M10.5 2.5L4.5 9.5L1.5 6.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DATE RANGE PICKER
// ═══════════════════════════════════════════════════════════════════

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onChange: (from: Date | undefined, to: Date | undefined) => void;
  placeholder: string;
}

function DateRangePicker({ from, to, onChange, placeholder }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = useLocale();

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);

  const label = from && to ? `${fmt(from)} – ${fmt(to)}` : from ? `${fmt(from)} –` : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-between gap-1.5 min-w-[160px] text-sm">
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            onChange(range?.from, range?.to);
          }}
          numberOfMonths={1}
          disabled={{ after: new Date() }}
        />
        {(from || to) && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined, undefined);
                setOpen(false);
              }}
            >
              <X className="size-3.5 mr-1" />
              Очистить
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DIFF TABLE
// ═══════════════════════════════════════════════════════════════════

interface DiffTableProps {
  diff: AuditEntry["diff"];
}

function DiffTable({ diff }: DiffTableProps) {
  const t = useTranslations("screen.audit");

  if (!diff || diff.length === 0) return null;

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Поле</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Было</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Стало</th>
          </tr>
        </thead>
        <tbody>
          {diff.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 font-mono text-muted-foreground">{row.field}</td>
              <td className="px-3 py-2">
                {row.before !== null && row.before !== undefined ? (
                  <span className="inline-flex rounded bg-destructive/10 text-destructive px-1.5 py-0.5 font-mono line-through">
                    {String(row.before)}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                {row.after !== null && row.after !== undefined ? (
                  <span className="inline-flex rounded bg-success/10 text-success px-1.5 py-0.5 font-mono">
                    {String(row.after)}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DETAIL PANEL CONTENT
// ═══════════════════════════════════════════════════════════════════

interface DetailPanelContentProps {
  entry: AuditEntry;
  onCopyId: () => void;
  onOpenEntity: () => void;
  locale: string;
  entityTypeLabel: (type: string) => string;
}

function DetailPanelContent({
  entry,
  onCopyId,
  onOpenEntity,
  locale,
  entityTypeLabel,
}: DetailPanelContentProps) {
  const t = useTranslations("screen.audit");
  const tc = useTranslations("common");
  const [payloadOpen, setPayloadOpen] = React.useState(true);
  const deviceType = entry.device_type ?? detectDeviceType(entry.user_agent);

  const DeviceIcon =
    deviceType === "mobile"
      ? Smartphone
      : deviceType === "tablet"
      ? Tablet
      : Monitor;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {formatDateFull(entry.occurred_at, locale)}
          </p>
          <EntityBadge type={entry.entity_type} label={entityTypeLabel(entry.entity_type)} />
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[calc(100vh-14rem)] lg:max-h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-0 divide-y divide-border">
          {/* WHO */}
          <section className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail_sheet.actor_section")}
            </p>
            <div className="flex items-start gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="text-xs font-medium bg-accent text-accent-foreground">
                  {getInitials(entry.actor.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 min-w-0">
                <a
                  href={`/employees/${entry.actor.id}`}
                  className="text-sm font-medium text-foreground hover:underline truncate"
                >
                  {entry.actor.name}
                </a>
                {entry.actor.email && (
                  <p className="text-xs text-muted-foreground truncate">{entry.actor.email}</p>
                )}
                <RoleBadge role={entry.actor.role as FunctionalRole} size="sm" />
              </div>
            </div>
          </section>

          {/* WHAT */}
          <section className="p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail_sheet.what_section")}
            </p>
            <p className="text-base font-medium text-foreground">{entry.action_label}</p>
            {entry.entity_url ? (
              <a
                href={entry.entity_url}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {entry.entity_name}
                <ArrowUpRight className="size-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{entry.entity_name}</p>
            )}
          </section>

          {/* DIFF */}
          {entry.diff && entry.diff.length > 0 && (
            <section className="p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("detail_sheet.diff_section")}
              </p>
              <DiffTable diff={entry.diff} />
            </section>
          )}

          {/* PAYLOAD */}
          <section className="p-4 flex flex-col gap-2">
            <Collapsible open={payloadOpen} onOpenChange={setPayloadOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                {payloadOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                Payload (JSON)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-muted p-3 rounded max-h-96 overflow-auto">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* CONTEXT */}
          <section className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Контекст
            </p>
            <div className="flex flex-col gap-2">
              {entry.ip_address && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                    {t("detail_sheet.ip_label")}
                  </span>
                  <span className="font-mono text-xs text-foreground">{entry.ip_address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                  Устройство
                </span>
                <DeviceIcon className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
              </div>
              {entry.user_agent && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                    {t("detail_sheet.user_agent_label")}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] cursor-default">
                          {entry.user_agent}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs break-all">
                        {entry.user_agent}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t">
        {entry.entity_url && (
          <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onOpenEntity}>
            <ArrowUpRight className="size-4" />
            {t("row_actions.open_entity")}
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onCopyId}>
          <Copy className="size-4" />
          {t("row_actions.copy_id")}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EVENT ROW
// ═══════════════════════════════════════════════════════════════════

interface EventRowProps {
  entry: AuditEntry;
  selected: boolean;
  onSelect: () => void;
  locale: string;
  entityTypeLabel: (type: string) => string;
  onEyeClick: () => void;
}

function EventRow({
  entry,
  selected,
  onSelect,
  locale,
  entityTypeLabel,
  onEyeClick,
}: EventRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left group flex items-start gap-3 px-4 py-3 transition-colors border-l-4",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected
          ? "border-l-primary bg-accent"
          : "border-l-transparent"
      )}
      aria-pressed={selected}
    >
      {/* Time */}
      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground leading-none pt-1">
        {formatTime(entry.occurred_at, locale)}
      </span>

      {/* Avatar */}
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="text-xs font-medium bg-accent text-accent-foreground">
          {getInitials(entry.actor.name)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm leading-snug">
          <span className="font-medium text-foreground">{entry.actor.name}</span>{" "}
          <span className="text-muted-foreground">{entry.action_label.toLowerCase()}</span>{" "}
          <span className="font-medium text-foreground">{entry.entity_name}</span>
        </p>
      </div>

      {/* Entity badge + eye */}
      <div className="flex items-center gap-2 shrink-0">
        <EntityBadge type={entry.entity_type} label={entityTypeLabel(entry.entity_type)} />
        <button
          type="button"
          aria-label="View details"
          onClick={(e) => {
            e.stopPropagation();
            onEyeClick();
          }}
          className="hidden group-hover:flex size-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Eye className="size-4" />
        </button>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════

function AuditSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="w-10 h-4 mt-1" />
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER STATE
// ═══════════════════════════════════════════════════════════════════

interface FilterState {
  search: string;
  actorId: number | undefined;
  entityTypes: string[];
  actions: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

const DEFAULT_DATE_FROM = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
})();

const initialFilters: FilterState = {
  search: "",
  actorId: undefined,
  entityTypes: [],
  actions: [],
  dateFrom: DEFAULT_DATE_FROM,
  dateTo: new Date(),
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AuditLog() {
  const t = useTranslations("screen.audit");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [filters, setFilters] = React.useState<FilterState>(() => ({
    ...initialFilters,
    dateFrom: undefined,
    dateTo: undefined,
  }));
  const [searchInput, setSearchInput] = React.useState("");
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    () => searchParams.get("id")
  );
  const [selectedEntry, setSelectedEntry] = React.useState<AuditEntry | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  // Keyboard navigation
  const listRef = React.useRef<HTMLDivElement>(null);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch entries
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: AuditListParams = {
      search: filters.search || undefined,
      actor_id: filters.actorId,
      entity_types: filters.entityTypes.length > 0 ? filters.entityTypes : undefined,
      actions: filters.actions.length > 0 ? filters.actions : undefined,
      date_from: filters.dateFrom?.toISOString(),
      date_to: filters.dateTo?.toISOString(),
      page,
      page_size: PAGE_SIZE,
      sort_by: "occurred_at",
      sort_dir: "desc",
    };

    getAuditEntries(params)
      .then((res) => {
        if (!cancelled) {
          setEntries(res.data);
          setTotal(res.total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить журнал аудита");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  // Sync selected entry from URL param on mount
  React.useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      getAuditEntryById(id)
        .then((res) => setSelectedEntry(res.data))
        .catch(() => setSelectedEntry(null));
    }
  }, [searchParams]);

  // Fetch detail when selectedId changes
  React.useEffect(() => {
    if (!selectedId) {
      setSelectedEntry(null);
      return;
    }
    // Try to find in current entries first
    const found = entries.find((e) => e.id === selectedId);
    if (found) {
      setSelectedEntry(found);
      return;
    }
    getAuditEntryById(selectedId)
      .then((res) => setSelectedEntry(res.data))
      .catch(() => setSelectedEntry(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!entries.length) return;
      const idx = entries.findIndex((en) => en.id === selectedId);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = entries[idx + 1];
        if (next) handleSelect(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = entries[idx - 1];
        if (prev) handleSelect(prev.id);
      } else if (e.key === "Escape") {
        handleDeselect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(null, "", url.toString());
  }

  function handleDeselect() {
    setSelectedId(null);
    setSelectedEntry(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url.toString());
  }

  function handleMobileSelect(id: string) {
    handleSelect(id);
    setMobileDrawerOpen(true);
  }

  function clearAllFilters() {
    setFilters({ ...initialFilters, dateFrom: undefined, dateTo: undefined });
    setSearchInput("");
    setPage(1);
  }

  function handleCopyId() {
    if (!selectedEntry) return;
    navigator.clipboard.writeText(selectedEntry.id).then(() => {
      toast.success(t("toasts.id_copied"));
    });
  }

  function handleOpenEntity() {
    if (!selectedEntry?.entity_url) return;
    router.push(selectedEntry.entity_url as Parameters<typeof router.push>[0]);
  }

  function handleExport() {
    toast.success(t("toasts.exported"));
  }

  function entityTypeLabel(type: string): string {
    try {
      return t(`entity_type.${type}` as Parameters<typeof t>[0]);
    } catch {
      return type;
    }
  }

  // Group entries by day
  const grouped = React.useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of entries) {
      const key = getDayKey(e.occurred_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  // Active filter chips
  const activeFilters: { key: string; label: string; value: string; onRemove: () => void }[] = [];

  if (filters.entityTypes.length > 0) {
    filters.entityTypes.forEach((et) => {
      activeFilters.push({
        key: `et-${et}`,
        label: t("filters.entity_type"),
        value: entityTypeLabel(et),
        onRemove: () =>
          setFilters((p) => ({ ...p, entityTypes: p.entityTypes.filter((v) => v !== et) })),
      });
    });
  }

  if (filters.actions.length > 0) {
    filters.actions.forEach((a) => {
      activeFilters.push({
        key: `ac-${a}`,
        label: t("filters.action"),
        value: a,
        onRemove: () =>
          setFilters((p) => ({ ...p, actions: p.actions.filter((v) => v !== a) })),
      });
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    const fmtDate = (d: Date) =>
      new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
    const val = [
      filters.dateFrom ? fmtDate(filters.dateFrom) : "…",
      filters.dateTo ? fmtDate(filters.dateTo) : "…",
    ].join(" – ");
    activeFilters.push({
      key: "date",
      label: tc("dateRange"),
      value: val,
      onRemove: () => setFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined })),
    });
  }

  const entityTypeOptions = ENTITY_TYPE_OPTIONS.map((v) => ({
    value: v,
    label: entityTypeLabel(v),
  }));

  const actionOptions = ACTION_OPTIONS.map((v) => ({ value: v, label: v }));

  const filterChildren = (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t("filters.entity_type")}</p>
        <MultiCombobox
          options={entityTypeOptions}
          selected={filters.entityTypes}
          onChange={(v) => { setFilters((p) => ({ ...p, entityTypes: v })); setPage(1); }}
          placeholder={t("filters.entity_type")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t("filters.action")}</p>
        <MultiCombobox
          options={actionOptions}
          selected={filters.actions}
          onChange={(v) => { setFilters((p) => ({ ...p, actions: v })); setPage(1); }}
          placeholder={t("filters.action")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{tc("dateRange")}</p>
        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(from, to) => {
            setFilters((p) => ({ ...p, dateFrom: from, dateTo: to }));
            setPage(1);
          }}
          placeholder={t("filters.date_range")}
        />
      </div>
    </>
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* PAGE HEADER */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.audit") },
          ]}
          actions={
            <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
              <Download className="size-4" />
              <span className="hidden sm:inline">{t("actions.export")}</span>
            </Button>
          }
        />

        {/* TOOLBAR */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-3 -mx-4 px-4 md:-mx-6 md:px-6 flex flex-col gap-3 pt-2">
          {/* Search */}
          <Input
            placeholder={t("filters.search_placeholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-full"
            aria-label={t("filters.search_placeholder")}
          />

          {/* Desktop filters */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            <MultiCombobox
              options={entityTypeOptions}
              selected={filters.entityTypes}
              onChange={(v) => { setFilters((p) => ({ ...p, entityTypes: v })); setPage(1); }}
              placeholder={t("filters.entity_type")}
            />
            <MultiCombobox
              options={actionOptions}
              selected={filters.actions}
              onChange={(v) => { setFilters((p) => ({ ...p, actions: v })); setPage(1); }}
              placeholder={t("filters.action")}
            />
            <DateRangePicker
              from={filters.dateFrom}
              to={filters.dateTo}
              onChange={(from, to) => {
                setFilters((p) => ({ ...p, dateFrom: from, dateTo: to }));
                setPage(1);
              }}
              placeholder={t("filters.date_range")}
            />
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={clearAllFilters}
              >
                <X className="size-3.5 mr-1" />
                {t("filters.clear_all")}
              </Button>
            )}
          </div>

          {/* Mobile filter sheet trigger */}
          <MobileFilterSheet
            activeCount={activeFilters.length}
            onClearAll={clearAllFilters}
            onApply={() => {}}
          >
            {filterChildren}
          </MobileFilterSheet>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="list" aria-label="Active filters">
              {activeFilters.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  value={chip.value}
                  onRemove={chip.onRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* >1000 results warning */}
        {total > 1000 && !loading && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Найдено более 1000 записей. Уточните фильтры для получения более точных результатов.
            </AlertDescription>
          </Alert>
        )}

        {/* MAIN GRID */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Event list */}
          <div className="lg:col-span-2 flex flex-col gap-0 rounded-lg border bg-card overflow-hidden">
            {loading ? (
              <AuditSkeleton />
            ) : error ? (
              <div className="p-6 flex flex-col items-center gap-4">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((p) => ({ ...p }))}
                >
                  <RefreshCw className="size-4 mr-1" />
                  {tc("retry")}
                </Button>
              </div>
            ) : entries.length === 0 ? (
              filters.search ||
              filters.entityTypes.length > 0 ||
              filters.actions.length > 0 ||
              filters.dateFrom ||
              filters.dateTo ? (
                <EmptyState
                  icon={SearchX}
                  title={tc("noResults")}
                  description={t("empty.filtered_title")}
                  action={{
                    label: t("empty.filtered_reset"),
                    onClick: clearAllFilters,
                  }}
                />
              ) : (
                <EmptyState
                  icon={ScrollText}
                  title={t("empty.no_entries_title")}
                  description={t("empty.no_entries_subtitle")}
                />
              )
            ) : (
              <div ref={listRef} role="listbox" aria-label="Audit events">
                {grouped.map(([dayKey, dayEntries]) => (
                  <div key={dayKey}>
                    {/* Day sticky sub-header */}
                    <div className="sticky top-0 z-[1] bg-muted/80 backdrop-blur px-4 py-1.5">
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                        {formatDayLabel(dayEntries[0].occurred_at, locale, tc)}
                      </p>
                    </div>
                    {dayEntries.map((entry) => (
                      <EventRow
                        key={entry.id}
                        entry={entry}
                        selected={selectedId === entry.id}
                        onSelect={() => {
                          if (selectedId === entry.id) {
                            handleDeselect();
                          } else {
                            handleSelect(entry.id);
                          }
                        }}
                        locale={locale}
                        entityTypeLabel={entityTypeLabel}
                        onEyeClick={() => {
                          handleSelect(entry.id);
                          setMobileDrawerOpen(true);
                        }}
                      />
                    ))}
                    <Separator />
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      {tc("page")} {page} {tc("of")} {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {tc("previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {tc("next")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Detail panel (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-32 self-start max-h-[calc(100vh-9rem)] overflow-auto rounded-lg border bg-card">
              {selectedEntry ? (
                <DetailPanelContent
                  entry={selectedEntry}
                  onCopyId={handleCopyId}
                  onOpenEntity={handleOpenEntity}
                  locale={locale}
                  entityTypeLabel={entityTypeLabel}
                />
              ) : (
                <EmptyState
                  icon={ScrollText}
                  title="Выберите событие"
                  description="Кликните на запись слева"
                  className="py-12"
                />
              )}
            </div>
          </div>
        </div>

        {/* MOBILE: Detail Drawer */}
        <Drawer
          open={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          direction="right"
        >
          <DrawerContent className="lg:hidden">
            <DrawerHeader className="border-b p-4">
              <DrawerTitle>{t("detail_sheet.title")}</DrawerTitle>
            </DrawerHeader>
            {selectedEntry ? (
              <DetailPanelContent
                entry={selectedEntry}
                onCopyId={handleCopyId}
                onOpenEntity={handleOpenEntity}
                locale={locale}
                entityTypeLabel={entityTypeLabel}
              />
            ) : (
              <EmptyState
                icon={ScrollText}
                title="Выберите событие"
                description="Запись не найдена или была удалена"
                className="py-12"
              />
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}
