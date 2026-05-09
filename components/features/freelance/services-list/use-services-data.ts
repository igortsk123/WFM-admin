"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR, { mutate as globalMutate } from "swr";

import {
  adjustServiceAmount,
  confirmService,
  disputeService,
  getServices,
} from "@/lib/api/freelance-services";
import { getNoShows, updateNoShowStatus } from "@/lib/api/no-show";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";
import type {
  NoShowReport,
  PaymentMode,
  Service,
  ServiceStatus,
} from "@/lib/types";

import {
  SWR_NO_SHOWS_KEY,
  SWR_SERVICES_KEY,
  type TabKey,
  getTabStatuses,
} from "./_shared";

export interface FilterOption {
  value: string;
  label: string;
}

export interface UseServicesDataParams {
  tab: TabKey;
  paymentMode: PaymentMode;
  storeFilter: string;
  freelancerFilter: string;
  agentFilter: string;
  workTypeFilter: string;
  page: number;
}

export function useServicesData(params: UseServicesDataParams) {
  const t = useTranslations("screen.freelanceServicesList");

  const {
    tab,
    paymentMode,
    storeFilter,
    freelancerFilter,
    agentFilter,
    workTypeFilter,
    page,
  } = params;

  // ── Detail / dialog state ──────────────────────────────────────────────────
  const [detailService, setDetailService] = useState<Service | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjustService, setAdjustService] = useState<Service | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [disputeTargetService, setDisputeTargetService] =
    useState<Service | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── No-show map ────────────────────────────────────────────────────────────
  const { data: noShowsData } = useSWR(SWR_NO_SHOWS_KEY, () =>
    getNoShows({ page_size: 100 }),
  );
  const noShowMap = useMemo(() => {
    const map = new Map<string, NoShowReport>();
    noShowsData?.data.forEach((r) => map.set(r.service_id, r));
    return map;
  }, [noShowsData]);

  // ── Services SWR ───────────────────────────────────────────────────────────
  const tabStatuses = getTabStatuses(tab, paymentMode);

  const swrKey = [
    SWR_SERVICES_KEY,
    tab,
    storeFilter,
    freelancerFilter,
    agentFilter,
    workTypeFilter,
    page,
  ].join("|");

  const { data, isLoading, error, mutate } = useSWR(
    swrKey,
    async () => {
      const statusParam: ServiceStatus | undefined =
        tabStatuses?.length === 1 ? tabStatuses[0] : undefined;
      const result = await getServices({
        status: statusParam,
        store_id: storeFilter ? Number(storeFilter) : undefined,
        freelancer_id: freelancerFilter ? Number(freelancerFilter) : undefined,
        agent_id: agentFilter || undefined,
        page,
        page_size: 20,
      });
      // Multi-status tab (ready = CONFIRMED + READY_TO_PAY) — filter client-side
      if (tabStatuses && tabStatuses.length > 1) {
        return {
          ...result,
          data: result.data.filter((s) => tabStatuses.includes(s.status)),
        };
      }
      return result;
    },
    { revalidateOnFocus: false },
  );

  // ── Filter options (from mock — scope-locked in real impl) ─────────────────
  const storeOptions = useMemo<FilterOption[]>(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      seen.set(String(s.store_id), s.store_name);
    });
    return [
      { value: "", label: t("filters.store_placeholder") },
      ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [t]);

  const agentOptions = useMemo<FilterOption[]>(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      if (s.agent_id && s.agent_name) seen.set(s.agent_id, s.agent_name);
    });
    return [
      { value: "", label: t("filters.agent_placeholder") },
      ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [t]);

  const workTypeOptions = useMemo<FilterOption[]>(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      seen.set(String(s.work_type_id), s.work_type_name);
    });
    return [
      { value: "", label: t("filters.work_type_placeholder") },
      ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [t]);

  const freelancerOptions = useMemo<FilterOption[]>(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      seen.set(String(s.freelancer_id), s.freelancer_name);
    });
    return [
      { value: "", label: t("filters.freelancer_placeholder") },
      ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [t]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openDetail = useCallback((service: Service) => {
    setDetailService(service);
    setSheetOpen(true);
  }, []);

  const handleConfirm = useCallback(
    async (service: Service) => {
      setIsSubmitting(true);
      try {
        const res = await confirmService(service.id);
        if (res.success) {
          toast.success(t("toasts.confirmed"));
          void mutate();
          setSheetOpen(false);
        } else {
          toast.error(res.error?.message ?? t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [t, mutate],
  );

  const handleDisputeSubmit = useCallback(
    async (id: string, reason: string) => {
      setIsSubmitting(true);
      try {
        const res = await disputeService(id, reason);
        if (res.success) {
          toast.success(t("toasts.disputed"));
          void mutate();
          setSheetOpen(false);
        } else {
          toast.error(res.error?.message ?? t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [t, mutate],
  );

  const handleAdjustSubmit = useCallback(
    async (id: string, newAmount: number, reason: string) => {
      setIsSubmitting(true);
      try {
        const res = await adjustServiceAmount(id, newAmount, reason);
        if (res.success) {
          toast.success(t("toasts.adjusted"));
          void mutate();
          setDetailService((prev) =>
            prev?.id === id ? { ...prev, total_amount: newAmount } : prev,
          );
        } else {
          toast.error(res.error?.message ?? t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [t, mutate],
  );

  const handleSendToLegal = useCallback(
    async (report: NoShowReport) => {
      setIsSubmitting(true);
      try {
        const res = await updateNoShowStatus(report.id, "IN_LEGAL");
        if (res.success) {
          toast.success(t("toasts.legal_sent"));
          void globalMutate(SWR_NO_SHOWS_KEY);
          setSheetOpen(false);
        } else {
          toast.error(res.error?.message ?? t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [t],
  );

  return {
    // data
    services: data?.data ?? [],
    total: data?.total ?? 0,
    data,
    isLoading,
    error,
    mutate,

    noShowMap,

    // filter options
    storeOptions,
    agentOptions,
    workTypeOptions,
    freelancerOptions,

    // dialog/sheet state
    detailService,
    setDetailService,
    sheetOpen,
    setSheetOpen,
    adjustService,
    setAdjustService,
    adjustOpen,
    setAdjustOpen,
    disputeTargetService,
    setDisputeTargetService,
    disputeOpen,
    setDisputeOpen,
    isSubmitting,

    // actions
    openDetail,
    handleConfirm,
    handleDisputeSubmit,
    handleAdjustSubmit,
    handleSendToLegal,
  };
}
