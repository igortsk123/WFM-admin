"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, parseISO } from "date-fns";
import { CalendarX2, Info, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/contexts/auth-context";
import {
  createBudgetLimit,
  getBudgetLimits,
  getBudgetUsage,
  updateBudgetLimit,
} from "@/lib/api/freelance-budget";
import type { BudgetLimit, BudgetPeriod, BudgetUsage } from "@/lib/types";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type ComboboxOption } from "@/components/ui/combobox";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

import { FiltersBar } from "./budget-limits/filters-bar";
import { HistorySheet } from "./budget-limits/history-sheet";
import { LimitForm } from "./budget-limits/edit-dialog";
import { LimitsTable } from "./budget-limits/limits-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  TODAY_ISO,
  isExpired,
  type LimitFormValues,
} from "./budget-limits/_shared";

// ─── BudgetLimits (entry point) ───────────────────────────────────────────────

export function BudgetLimits() {
  const t = useTranslations("freelanceBudgetLimits");
  const { user } = useAuth();

  const isRegionalOrOps =
    user.role === "REGIONAL" || user.role === "NETWORK_OPS";
  const canWrite = isRegionalOrOps;

  // ── module guard ──
  if (!user.organization.freelance_module_enabled) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">{t("module_disabled")}</p>
      </div>
    );
  }

  return <BudgetLimitsInner canWrite={canWrite} />;
}

// ─── BudgetLimitsInner ────────────────────────────────────────────────────────

interface InnerProps {
  canWrite: boolean;
}

function BudgetLimitsInner({ canWrite }: InnerProps) {
  const t = useTranslations("freelanceBudgetLimits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";

  // ── data ──────────────────────────────────────────────────────────
  const [allLimits, setAllLimits] = useState<BudgetLimit[]>([]);
  const [usagesMap, setUsagesMap] = useState<Map<string, BudgetUsage>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [limitsRes, usageRes] = await Promise.all([
        getBudgetLimits({ page_size: 100 }),
        getBudgetUsage({}),
      ]);
      setAllLimits(limitsRes.data);

      const map = new Map<string, BudgetUsage>();
      usageRes.data.forEach((u) => map.set(`${u.store_id}:${u.period}`, u));
      setUsagesMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── filters ───────────────────────────────────────────────────────
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [filterStores, setFilterStores] = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<BudgetPeriod | "">("");

  const storeOptions = useMemo<ComboboxOption[]>(() => {
    const seen = new Set<string>();
    const opts: ComboboxOption[] = [];
    allLimits.forEach((l) => {
      const key = String(l.store_id);
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ value: key, label: l.store_name });
      }
    });
    return opts;
  }, [allLimits]);

  const filteredLimits = useMemo(() => {
    return allLimits.filter((l) => {
      if (tab === "active" && isExpired(l)) return false;
      if (tab === "expired" && !isExpired(l)) return false;
      if (filterStores.length > 0 && !filterStores.includes(String(l.store_id)))
        return false;
      if (filterPeriod && l.period !== filterPeriod) return false;
      return true;
    });
  }, [allLimits, tab, filterStores, filterPeriod]);

  const activeChips = useMemo(() => {
    const chips: Array<{
      key: string;
      label: string;
      value: string;
      onRemove: () => void;
    }> = [];
    filterStores.forEach((sid) => {
      const name = storeOptions.find((o) => o.value === sid)?.label ?? sid;
      chips.push({
        key: `store-${sid}`,
        label: t("filters.object"),
        value: name,
        onRemove: () =>
          setFilterStores((prev) => prev.filter((s) => s !== sid)),
      });
    });
    if (filterPeriod) {
      chips.push({
        key: `period-${filterPeriod}`,
        label: t("filters.period"),
        value: t(`period.${filterPeriod}`),
        onRemove: () => setFilterPeriod(""),
      });
    }
    return chips;
  }, [filterStores, filterPeriod, storeOptions, t]);

  // ── sheet state ───────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetLimit | null>(null);
  const [historyTarget, setHistoryTarget] = useState<BudgetLimit | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }

  function openEdit(limit: BudgetLimit) {
    setEditTarget(limit);
    setSheetOpen(true);
  }

  function openHistory(limit: BudgetLimit) {
    setHistoryTarget(limit);
    setHistoryOpen(true);
  }

  // ── mutations ─────────────────────────────────────────────────────
  async function handleSubmit(values: LimitFormValues) {
    if (editTarget) {
      const res = await updateBudgetLimit(editTarget.id, {
        amount: parseFloat(values.amount),
        valid_from: values.valid_from
          ? format(values.valid_from, "yyyy-MM-dd")
          : undefined,
        valid_to: values.valid_to
          ? format(values.valid_to, "yyyy-MM-dd")
          : null,
      });
      if (res.success) {
        toast.success(t("toasts.updated"));
        setSheetOpen(false);
        await loadData();
      } else {
        toast.error(t("toasts.error"));
      }
    } else {
      const res = await createBudgetLimit({
        store_id: values.store_id ?? undefined,
        store_name: values.store_name,
        period: values.period as BudgetPeriod,
        amount: parseFloat(values.amount),
        currency: "RUB",
        valid_from: values.valid_from
          ? format(values.valid_from, "yyyy-MM-dd")
          : TODAY_ISO,
        valid_to: values.valid_to
          ? format(values.valid_to, "yyyy-MM-dd")
          : null,
      });
      if (res.success) {
        toast.success(t("toasts.created"));
        setSheetOpen(false);
        await loadData();
      } else {
        toast.error(t("toasts.error"));
      }
    }
  }

  async function handleTerminate(limit: BudgetLimit) {
    const res = await updateBudgetLimit(limit.id, {
      valid_to: TODAY_ISO,
    });
    if (res.success) {
      toast.success(t("toasts.terminated"));
      await loadData();
    } else {
      toast.error(t("toasts.error"));
    }
  }

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          {
            label: t("breadcrumbs.freelance"),
            href: ADMIN_ROUTES.freelanceDashboard,
          },
          { label: t("breadcrumbs.limits") },
        ]}
        actions={
          canWrite ? (
            <Button onClick={openCreate} size="sm" className="min-h-11">
              <Plus className="size-4 mr-1.5" aria-hidden="true" />
              {t("actions.add")}
            </Button>
          ) : undefined
        }
      />

      {/* Info banner */}
      <Alert>
        <Info className="size-4" aria-hidden="true" />
        <AlertDescription className="text-sm leading-relaxed">
          {t("info_banner")}
        </AlertDescription>
      </Alert>

      {/* Tabs + filters */}
      <div className="flex flex-col gap-4">
        <FiltersBar
          tab={tab}
          onChangeTab={setTab}
          storeOptions={storeOptions}
          filterStores={filterStores}
          onChangeStores={setFilterStores}
          filterPeriod={filterPeriod}
          onChangePeriod={setFilterPeriod}
          activeChips={activeChips}
          onClearAll={() => {
            setFilterStores([]);
            setFilterPeriod("");
          }}
        />

        {/* Content */}
        {loading ? (
          <TableSkeleton rows={5} rowHeight="h-14" />
        ) : filteredLimits.length === 0 ? (
          tab === "active" ? (
            <EmptyState
              icon={Wallet}
              title={t("empty.no_limits_title")}
              description={
                canWrite
                  ? t("empty.no_limits_desc_regional")
                  : t("empty.no_limits_desc_supervisor")
              }
              action={
                canWrite
                  ? {
                      label: t("actions.add"),
                      onClick: openCreate,
                      icon: Plus,
                    }
                  : undefined
              }
            />
          ) : (
            <EmptyState
              icon={CalendarX2}
              title={t("tabs.expired")}
              description={tCommon("no_data")}
            />
          )
        ) : (
          <LimitsTable
            limits={filteredLimits}
            usagesMap={usagesMap}
            isClientDirect={isClientDirect}
            canWrite={canWrite}
            locale={locale}
            onEdit={openEdit}
            onTerminate={handleTerminate}
            onHistory={openHistory}
          />
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editTarget ? t("sheet.edit_title") : t("sheet.create_title")}
            </SheetTitle>
          </SheetHeader>
          <LimitForm
            mode={editTarget ? "edit" : "create"}
            storeOptions={storeOptions}
            lockedStore={!!editTarget}
            lockedPeriod={!!editTarget}
            initial={
              editTarget
                ? {
                    store_id: editTarget.store_id,
                    store_name: editTarget.store_name,
                    period: editTarget.period,
                    amount: String(editTarget.amount),
                    valid_from: editTarget.valid_from
                      ? parseISO(editTarget.valid_from)
                      : new Date(),
                    valid_to: editTarget.valid_to
                      ? parseISO(editTarget.valid_to)
                      : undefined,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* History Sheet */}
      {historyTarget && (
        <HistorySheet
          limit={historyTarget}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}
    </div>
  );
}
