"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  AlertCircle,
  Bell,
  Download,
  ExternalLink,
  Link2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import {
  getClosingDocumentUrl,
  getPayouts,
  retryPayout,
} from "@/lib/api/freelance-payouts";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import type { Payout } from "@/lib/types";

import {
  FiltersBar,
  StatsRow,
  NominalAccountAlerts,
  MobileCard,
  PayoutDetailSheet,
  RetryDialog,
  buildColumns,
  EMPTY_FILTERS,
  MOCK_NOMINAL_ACCOUNT,
  type Filters,
  type TabStatus,
} from "./freelance-payouts-list/index";
import type { PayoutMenuAction } from "./freelance-payouts-list/row-actions";

// ───────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────

export function FreelancePayoutsList() {
  const t = useTranslations("screen.freelancePayoutsList");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();

  const isNetworkOps =
    user.role === "NETWORK_OPS" || user.role === "REGIONAL";
  const isReadOnly = user.role === "HR_MANAGER";

  // ── state ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabStatus>("PENDING");
  const [allPayouts, setAllPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [retryTargetId, setRetryTargetId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [notifyErrors, setNotifyErrors] = useState(false);

  const nominalAccount = MOCK_NOMINAL_ACCOUNT;

  // ── load payouts ──────────────────────────────────────────────────
  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayouts({
        page_size: 100,
        sort_by: "payout_date",
        sort_dir: "desc",
      });
      setAllPayouts(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── filter options ─────────────────────────────────────────────────
  const freelancerOptions = useMemo(() => {
    const seen = new Set<number>();
    return allPayouts
      .filter((p) => {
        if (seen.has(p.freelancer_id)) return false;
        seen.add(p.freelancer_id);
        return true;
      })
      .map((p) => ({
        value: String(p.freelancer_id),
        label: p.freelancer_name,
      }));
  }, [allPayouts]);

  const agentOptions = useMemo(() => {
    const seen = new Set<string>();
    return allPayouts
      .filter((p) => {
        if (!p.agent_id || seen.has(p.agent_id)) return false;
        seen.add(p.agent_id);
        return true;
      })
      .map((p) => ({ value: p.agent_id!, label: p.agent_id! }));
  }, [allPayouts]);

  // ── filtered payouts ──────────────────────────────────────────────
  const tabPayouts = useMemo(() => {
    return allPayouts.filter((p) => {
      if (p.status !== activeTab) return false;
      if (
        filters.freelancerId &&
        String(p.freelancer_id) !== filters.freelancerId
      )
        return false;
      if (filters.agentId && p.agent_id !== filters.agentId) return false;
      if (filters.dateFrom && p.payout_date < filters.dateFrom) return false;
      if (filters.dateTo && p.payout_date > filters.dateTo) return false;
      return true;
    });
  }, [allPayouts, activeTab, filters]);

  // ── counts per tab ────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      PENDING: allPayouts.filter((p) => p.status === "PENDING").length,
      PROCESSING: allPayouts.filter((p) => p.status === "PROCESSING").length,
      PAID: allPayouts.filter((p) => p.status === "PAID").length,
      FAILED: allPayouts.filter((p) => p.status === "FAILED").length,
    }),
    [allPayouts],
  );

  // ── actions ────────────────────────────────────────────────────────
  const handleMenuAction = useCallback(
    async (action: PayoutMenuAction, id: string) => {
      if (action === "details") {
        setSelectedPayoutId(id);
      } else if (action === "retry") {
        setRetryTargetId(id);
      } else if (action === "download") {
        try {
          const res = await getClosingDocumentUrl(id);
          window.open(res.data.url, "_blank");
        } catch {
          toast.error(t("toasts.doc_error"));
        }
      }
    },
    [t],
  );

  const handleConfirmRetry = useCallback(async () => {
    if (!retryTargetId) return;
    setRetrying(true);
    try {
      const res = await retryPayout(retryTargetId);
      if (res.success) {
        toast.success(t("toasts.retry_success"));
        await loadPayouts();
      } else {
        toast.error(res.error?.message ?? t("toasts.retry_error"));
      }
    } finally {
      setRetrying(false);
      setRetryTargetId(null);
    }
  }, [retryTargetId, loadPayouts, t]);

  // ── columns ────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      buildColumns({
        t,
        navigate: (url) => router.push(url),
        isReadOnly,
        onMenuAction: handleMenuAction,
      }),
    [t, router, isReadOnly, handleMenuAction],
  );

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          {
            label: t("breadcrumbs.freelance"),
            href: ADMIN_ROUTES.freelanceDashboard,
          },
          { label: t("breadcrumbs.payouts") },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isNetworkOps && (
              <Button variant="outline" size="sm" asChild className="min-h-10">
                <a
                  href={`${ADMIN_ROUTES.integrations}#nominal-account`}
                  target="_self"
                >
                  <Link2 className="size-4" />
                  {t("actions.connect_nominal")}
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="min-h-10"
              onClick={() => toast.success(t("toasts.export_success"))}
            >
              <Download className="size-4" />
              {t("actions.export_csv")}
            </Button>
          </div>
        }
      />

      <NominalAccountAlerts account={nominalAccount} />

      {!loading && !error && <StatsRow payouts={allPayouts} />}

      <FiltersBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabCounts={tabCounts}
        filters={filters}
        onFiltersChange={setFilters}
        freelancerOptions={freelancerOptions}
        agentOptions={agentOptions}
      />

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadPayouts}>
              <RefreshCw className="size-4 mr-1" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Notification subscribe (FAILED tab only) */}
      {activeTab === "FAILED" && !loading && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Bell className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">
            {t("notification_subscribe")}
          </span>
          <Switch
            checked={notifyErrors}
            onCheckedChange={setNotifyErrors}
            aria-label={t("notification_subscribe")}
          />
        </div>
      )}

      {/* Data table */}
      <ResponsiveDataTable
        columns={columns}
        data={tabPayouts}
        isLoading={loading}
        emptyMessage={{
          title: t("empty.title"),
          description: t("empty.description"),
        }}
        onRowClick={(row) => setSelectedPayoutId(row.id)}
        mobileCardRender={(row) => (
          <MobileCard payout={row} onMenuAction={handleMenuAction} />
        )}
      />

      {/* Empty state CTA for services */}
      {!loading && !error && tabPayouts.length === 0 && (
        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push(ADMIN_ROUTES.freelanceServices)}
          >
            {t("empty.action")}
            <ExternalLink className="size-3 ml-1" />
          </Button>
        </div>
      )}

      <PayoutDetailSheet
        payoutId={selectedPayoutId}
        onClose={() => setSelectedPayoutId(null)}
        onRetry={(id) => {
          setSelectedPayoutId(null);
          setRetryTargetId(id);
        }}
      />

      <RetryDialog
        open={!!retryTargetId}
        onOpenChange={(open) => !open && setRetryTargetId(null)}
        onConfirm={handleConfirmRetry}
        retrying={retrying}
      />
    </div>
  );
}
