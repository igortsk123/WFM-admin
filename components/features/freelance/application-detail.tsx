"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";

import {
  getFreelanceApplicationById,
  simulateApplicationApproval,
} from "@/lib/api/freelance-applications";
import { getAssignmentsByApplication } from "@/lib/api/freelance-assignments";

import type { FreelancerAssignment } from "@/lib/types";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { PageHeader, EmptyState } from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatRelative } from "@/lib/utils/format";

import {
  ApplicationDetailSkeleton,
  DecisionSidebar,
  AssignmentSidebar,
  TerminalSidebar,
  ExternalSidebar,
  RelatedCard,
  StatusCard,
  ParamsCard,
  FinanceCard,
  HistoryCard,
  shortId,
  type ApplicationDetailData,
  type SimulationResult,
} from "./application-detail/index";

export function ApplicationDetail({ id }: { id: string }) {
  const t = useTranslations("screen.freelanceApplicationDetail");
  const tHeader = useTranslations("screen.freelanceApplicationDetail.header");
  const tStates = useTranslations("screen.freelanceApplicationDetail.states");
  const locale = useLocale();

  const [data, setData] = useState<ApplicationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);

  // Simulator state
  const [simHours, setSimHours] = useState<number>(0);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFreelanceApplicationById(id);
      setData(res.data);
      setSimHours(res.data.requested_hours);
      const aRes = await getAssignmentsByApplication(id);
      setAssignments(aRes.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runSimulation = useCallback(
    async (hours: number, appId: string) => {
      if (hours <= 0) return;
      setSimLoading(true);
      try {
        const res = await simulateApplicationApproval(appId, hours);
        setSimulation(res.data);
      } catch {
        // silently ignore sim errors — advisory only
      } finally {
        setSimLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!data) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSimulation(simHours, data.id);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [simHours, data, runSimulation]);

  // ── States ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <ApplicationDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="size-4" />
          <AlertTitle>{tStates("error_title")}</AlertTitle>
          <AlertDescription>{tStates("error_desc")}</AlertDescription>
        </Alert>
        <Button onClick={load} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          {tStates("error_retry")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Info}
        title={tStates("not_found_title")}
        description={tStates("not_found_desc")}
        action={{
          label: tStates("not_found_cta"),
          href: ADMIN_ROUTES.freelanceApplications,
        }}
      />
    );
  }

  // ── Derived values ────────────────────────────────────────────────

  const isExternal = data.source === "EXTERNAL";
  const isPending = data.status === "PENDING" && !isExternal;
  const isApproved =
    data.status === "APPROVED_FULL" ||
    data.status === "APPROVED_PARTIAL" ||
    data.status === "MIXED";
  const isTerminal =
    data.status === "REJECTED" ||
    data.status === "REPLACED_WITH_BONUS" ||
    data.status === "CANCELLED";

  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
    {
      label: t("breadcrumbs.applications"),
      href: ADMIN_ROUTES.freelanceApplications,
    },
    { label: t("breadcrumbs.detail") },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={tHeader("title", {
          shortId: shortId(data.id),
          storeName: data.store_name,
        })}
        subtitle={tHeader("created_by", {
          name: data.created_by_name,
          role: data.created_by_role,
          time: formatRelative(new Date(data.created_at), locale as "ru" | "en"),
        })}
        breadcrumbs={breadcrumbs}
      />

      {/* Two-col layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0 flex-1 max-w-3xl">
          <StatusCard app={data} isExternal={isExternal} />
          <ParamsCard app={data} />
          <FinanceCard
            app={data}
            isExternal={isExternal}
            simulation={simulation}
            simHours={simHours}
            simLoading={simLoading}
            onSimHoursChange={setSimHours}
          />
          <HistoryCard app={data} />
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div className="lg:w-80 lg:shrink-0 flex flex-col gap-4">
          {/* Decision sidebar: only for PENDING INTERNAL */}
          {isPending && (
            <DecisionSidebar
              app={data}
              simulation={simulation}
              simulatedHours={simHours}
              onRefresh={load}
            />
          )}

          {/* External info block */}
          {isExternal && (
            <ExternalSidebar
              app={data}
              assignments={assignments}
              onRefresh={load}
            />
          )}

          {/* Assignment sidebar: for approved */}
          {isApproved && !isExternal && (
            <AssignmentSidebar
              app={data}
              assignments={assignments}
              onRefresh={load}
            />
          )}

          {/* Terminal: rejected / bonus / cancelled */}
          {isTerminal && <TerminalSidebar app={data} />}

          {/* Related entities */}
          <RelatedCard app={data} />
        </div>
      </div>
    </div>
  );
}
