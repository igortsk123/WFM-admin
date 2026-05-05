"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useQueryState } from "nuqs";
import {
  AlertCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { getMyFreelancers } from "@/lib/api/agent-cabinet";
import { AGENT_ROUTES } from "@/lib/constants/routes";
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/format";
import type { FreelancerStatus, Locale, User } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type FreelancerRow = Omit<User, "rating"> & {
  services_count_30d: number;
  total_earned_30d: number;
};

const FREELANCER_STATUSES: FreelancerStatus[] = [
  "NEW",
  "VERIFICATION",
  "ACTIVE",
  "BLOCKED",
  "ARCHIVED",
];

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function FreelancersListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 flex-1 max-w-xs" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// USER CELL
// ═══════════════════════════════════════════════════════════════════

function UserCell({ freelancer }: { freelancer: FreelancerRow }) {
  const initials = `${freelancer.first_name[0]}${freelancer.last_name[0]}`;
  const fullName = `${freelancer.last_name} ${freelancer.first_name}${
    freelancer.middle_name ? ` ${freelancer.middle_name[0]}.` : ""
  }`;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="size-8 shrink-0">
        {freelancer.avatar_url && (
          <AvatarImage src={freelancer.avatar_url} alt="" />
        )}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-foreground truncate leading-tight">
          {fullName}
        </span>
        <a
          href={`tel:${freelancer.phone}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {freelancer.phone}
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═══════════════════════════════════════════════════════════════════

function FreelancerCard({
  freelancer,
  locale,
  onOpen,
  menuLabel,
}: {
  freelancer: FreelancerRow;
  locale: Locale;
  onOpen: (id: number) => void;
  menuLabel: string;
}) {
  return (
    <button
      type="button"
      className="w-full text-left flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[56px]"
      onClick={() => onOpen(freelancer.id)}
      aria-label={`${freelancer.last_name} ${freelancer.first_name}`}
    >
      <div className="flex-1 min-w-0">
        <UserCell freelancer={freelancer} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <FreelancerStatusBadge status={freelancer.freelancer_status ?? "NEW"} size="sm" />
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(freelancer.total_earned_30d, locale)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(freelancer.id)}>
              {menuLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESKTOP TABLE
// ═══════════════════════════════════════════════════════════════════

function FreelancersTable({
  freelancers,
  locale,
  onOpen,
  menuLabel,
}: {
  freelancers: FreelancerRow[];
  locale: Locale;
  onOpen: (id: number) => void;
  menuLabel: string;
}) {
  const t = useTranslations("screen.agentFreelancers");

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm" aria-label={t("page_title")}>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left font-medium text-muted-foreground px-4 py-3">
              {t("columns.name")}
            </th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
              {t("columns.phone")}
            </th>
            <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
              {t("columns.services_30d")}
            </th>
            <th className="text-right font-medium text-muted-foreground px-4 py-3">
              {t("columns.earned_30d")}
            </th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3">
              {t("columns.status")}
            </th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
              {t("columns.added")}
            </th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {freelancers.map((f, index) => (
            <tr
              key={f.id}
              className={cn(
                "hover:bg-muted/40 transition-colors cursor-pointer",
                index < freelancers.length - 1 && "border-b border-border"
              )}
              onClick={() => onOpen(f.id)}
            >
              <td className="px-4 py-3">
                <UserCell freelancer={f} />
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <a
                  href={`tel:${f.phone}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                  {formatPhone(f.phone, locale)}
                </a>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-foreground hidden sm:table-cell">
                {f.services_count_30d}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                {formatCurrency(f.total_earned_30d, locale)}
              </td>
              <td className="px-4 py-3">
                <FreelancerStatusBadge
                  status={f.freelancer_status ?? "NEW"}
                  size="sm"
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                {f.hired_at
                  ? formatDate(new Date(f.hired_at), locale)
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpen(f.id)}>
                      {menuLabel}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AgentFreelancers() {
  const t = useTranslations("screen.agentFreelancers");
  const tFreelancer = useTranslations("freelancer.status");
  const locale = useLocale() as Locale;
  const router = useRouter();

  // nuqs URL state — filter persists on deep-link navigation
  const [search, setSearch] = useQueryState("q", { defaultValue: "" });
  const [statusFilter, setStatusFilter] = useQueryState("status", {
    defaultValue: "",
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [freelancers, setFreelancers] = useState<FreelancerRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getMyFreelancers({
        search: search || undefined,
        status: statusFilter || undefined,
        page_size: 100,
      });
      setFreelancers(res.data as FreelancerRow[]);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpen = useCallback(
    (id: number) => {
      router.push(AGENT_ROUTES.freelancerDetail(String(id)));
    },
    [router]
  );

  const hasFilters = Boolean(search || statusFilter);

  // ── LOADING ──────────────────────────────────────────────────────
  if (loading) return <FreelancersListSkeleton />;

  // ── ERROR ────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />
        <div className="flex flex-col gap-4 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>{t("error_title")}</AlertTitle>
            <AlertDescription>{t("error_description")}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="w-fit gap-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header — no primary action (add is supervisor+ only) */}
      <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />

      {/* Filter row */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        role="search"
        aria-label="Filter performers"
      >
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("filters.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-8 h-9"
            aria-label={t("filters.search")}
          />
        </div>
        <Select
          value={statusFilter || "__all__"}
          onValueChange={(v) => setStatusFilter(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-44" aria-label={t("filters.status")}>
            <SelectValue placeholder={t("filters.status_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filters.status_placeholder")}</SelectItem>
            {FREELANCER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tFreelancer(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content — 4 states: loading (above), error (above), empty-full, empty-filtered, data */}
      {freelancers.length === 0 ? (
        hasFilters ? (
          /* Empty state: filters applied but no results */
          <EmptyState
            icon={Search}
            title={t("empty.no_results")}
            description={t("empty.no_results_description")}
          />
        ) : (
          /* Empty state: no freelancers assigned to this agent yet */
          <EmptyState
            icon={Users}
            title={t("empty.no_freelancers")}
            description={t("empty.no_freelancers_description")}
          />
        )
      ) : (
        <>
          {/* Mobile: card list (<md) */}
          <ul className="flex flex-col gap-2 md:hidden" role="list" aria-label={t("page_title")}>
            {freelancers.map((f) => (
              <li key={f.id}>
                <FreelancerCard
                  freelancer={f}
                  locale={locale}
                  onOpen={handleOpen}
                  menuLabel={t("menu.open")}
                />
              </li>
            ))}
          </ul>

          {/* Desktop: table (≥md) */}
          <div className="hidden md:block">
            <FreelancersTable
              freelancers={freelancers}
              locale={locale}
              onOpen={handleOpen}
              menuLabel={t("menu.open")}
            />
          </div>
        </>
      )}
    </div>
  );
}
