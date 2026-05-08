"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
  RefreshCw,
  Pencil,
  ShieldOff,
  ShieldCheck,
  Archive,
} from "lucide-react";

import type { Agent, AgentStatus } from "@/lib/types";
import {
  getAgentById,
  blockAgent,
  archiveAgent,
  updateAgent,
} from "@/lib/api/freelance-agents";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";

import { PageHeader } from "@/components/shared/page-header";
import { AgentStatusBadge } from "@/components/shared/agent-status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import {
  AgentDetailSkeleton,
  HeroCard,
  KpiRow,
  PerformersTab,
  AccrualsTab,
  HistoryTab,
  EditSheet,
  BlockDialogWithReason,
  formatMoney,
  type AgentWithRoster,
} from "./agent-detail/index";

// ─── Main Component ────────────────────────────────────────────────────────────

export function AgentDetail({ id }: { id: string }) {
  const t = useTranslations("screen.freelanceAgentDetail");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();

  const [agent, setAgent] = React.useState<AgentWithRoster | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [unblockOpen, setUnblockOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const canEdit = ["NETWORK_OPS", "HR_MANAGER"].includes(user.role);
  const canBlock = ["NETWORK_OPS", "HR_MANAGER"].includes(user.role);

  // ─── Check payment mode (CLIENT_DIRECT → 404-equivalent) ─────────
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";

  const load = React.useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    getAgentById(id)
      .then((res) => {
        setAgent(res.data as AgentWithRoster);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  // ─── Action handlers ──────────────────────────────────────────────

  async function handleBlock(reason: string) {
    if (!agent) return;
    const res = await blockAgent(agent.id, reason);
    if (res.success) {
      toast.success(t("toasts.blocked"));
      setAgent((prev) => (prev ? { ...prev, status: "BLOCKED" as AgentStatus } : prev));
    } else {
      toast.error(t("toasts.error"));
    }
    setBlockOpen(false);
  }

  async function handleUnblock() {
    if (!agent) return;
    // unblock = update status back to ACTIVE via updateAgent
    const res = await updateAgent(agent.id, { status: "ACTIVE" as AgentStatus });
    if (res.success) {
      toast.success(t("toasts.unblocked"));
      setAgent((prev) => (prev ? { ...prev, status: "ACTIVE" as AgentStatus } : prev));
    } else {
      toast.error(t("toasts.error"));
    }
    setUnblockOpen(false);
  }

  async function handleArchive() {
    if (!agent) return;
    const activeCount = agent.freelancers.filter(
      (f) => f.freelancer_status === "ACTIVE"
    ).length;
    if (activeCount > 0) {
      toast.error(t("toasts.archive_error_active_freelancers"));
      setArchiveOpen(false);
      return;
    }
    const res = await archiveAgent(agent.id);
    if (res.success) {
      toast.success(t("toasts.archived"));
      setAgent((prev) => (prev ? { ...prev, status: "ARCHIVED" as AgentStatus } : prev));
    } else {
      toast.error(res.error?.message ?? t("toasts.error"));
    }
    setArchiveOpen(false);
  }

  function handleSaved(updated: Partial<Agent>) {
    setAgent((prev) => (prev ? { ...prev, ...updated } : prev));
    toast.success(t("toasts.saved"));
  }

  // ─── Render states ────────────────────────────────────────────────

  if (isClientDirect) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ShieldOff className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">{t("not_available")}</p>
      </div>
    );
  }

  if (isLoading) return <AgentDetailSkeleton />;

  if (isError || !agent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{tc("error")}</p>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
          {tc("retry")}
        </Button>
      </div>
    );
  }

  // ─── Actions area ─────────────────────────────────────────────────

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && agent.status !== "ARCHIVED" && (
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.edit")}
        </Button>
      )}
      {canBlock && agent.status === "ACTIVE" && (
        <Button size="sm" variant="outline" onClick={() => setBlockOpen(true)}>
          <ShieldOff className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.block")}
        </Button>
      )}
      {canBlock && agent.status === "BLOCKED" && (
        <Button size="sm" variant="outline" onClick={() => setUnblockOpen(true)}>
          <ShieldCheck className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.unblock")}
        </Button>
      )}
      {canEdit && agent.status !== "ARCHIVED" && (
        <Button size="sm" variant="outline" onClick={() => setArchiveOpen(true)}>
          <Archive className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.archive")}
        </Button>
      )}
    </div>
  );

  // ─── Tabs ─────────────────────────────────────────────────────────

  const totalEarnings = agent.earnings.reduce(
    (s, e) => s + e.commission_amount,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={agent.name}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.agents"), href: ADMIN_ROUTES.freelanceAgents },
          { label: agent.name },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <AgentStatusBadge status={agent.status} />
            <div className="hidden md:flex items-center gap-2">{headerActions}</div>
          </div>
        }
      />

      {/* Hero Card */}
      <HeroCard agent={agent} t={t} />

      {/* KPI Row */}
      <KpiRow agent={agent} t={t} locale={locale} />

      {/* Tabs */}
      <Tabs defaultValue="performers" className="flex flex-col gap-4">
        <TabsList className="w-full md:w-auto justify-start h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto">
          <TabsTrigger value="performers" className="text-sm whitespace-nowrap">
            {t("tabs.performers")}{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({agent.freelancers.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="accruals" className="text-sm whitespace-nowrap">
            {t("tabs.accruals")}{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({formatMoney(totalEarnings, locale)})
            </span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm whitespace-nowrap">
            {t("tabs.history")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performers" className="mt-0">
          <PerformersTab agent={agent} t={t} locale={locale} />
        </TabsContent>

        <TabsContent value="accruals" className="mt-0">
          <AccrualsTab agentId={agent.id} t={t} locale={locale} />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <HistoryTab agent={agent} t={t} />
        </TabsContent>
      </Tabs>

      {/* Mobile sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 px-4 py-3 bg-background border-t border-border md:hidden">
        {headerActions}
      </div>

      {/* Edit Sheet */}
      {canEdit && (
        <EditSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          agent={agent}
          onSaved={handleSaved}
          t={t}
        />
      )}

      {/* Block Dialog */}
      {canBlock && (
        <BlockDialogWithReason
          open={blockOpen}
          onOpenChange={setBlockOpen}
          onConfirm={handleBlock}
          t={t}
          tc={tc}
        />
      )}

      {/* Unblock Dialog */}
      <AlertDialog open={unblockOpen} onOpenChange={setUnblockOpen}>
        <ConfirmDialog
          title={t("unblock_dialog.title")}
          message={t("unblock_dialog.description")}
          confirmLabel={t("unblock_dialog.confirm")}
          cancelLabel={tc("cancel")}
          variant="default"
          onConfirm={handleUnblock}
          onOpenChange={setUnblockOpen}
        />
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ConfirmDialog
          title={t("archive_dialog.title")}
          message={t("archive_dialog.description")}
          confirmLabel={t("archive_dialog.confirm")}
          cancelLabel={tc("cancel")}
          variant="destructive"
          onConfirm={handleArchive}
          onOpenChange={setArchiveOpen}
        />
      </AlertDialog>
    </div>
  );
}
