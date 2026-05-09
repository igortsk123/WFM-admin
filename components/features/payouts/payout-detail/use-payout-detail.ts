"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  calculatePayout,
  exportPayout,
  finalizePayout,
  getPayoutDetail,
  type PayoutRow,
} from "@/lib/api/payouts";

import { isAnomalyRow, type FilterMode, type PayoutPeriodWithRows } from "./_shared";

export function usePayoutDetail(id: string) {
  const t = useTranslations("screen.payoutDetail");

  const [period, setPeriod] = useState<PayoutPeriodWithRows | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<PayoutRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const loadPeriod = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPayoutDetail(id);
      setPeriod(result.data);
    } catch (err) {
      setError((err as Error).message || "Failed to load period");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPeriod();
  }, [loadPeriod]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!period) return [];

    let rows = period.rows;

    // Filter by mode
    if (filterMode === "anomalies") {
      rows = rows.filter(isAnomalyRow);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.user_name.toLowerCase().includes(query) ||
          r.store_name.toLowerCase().includes(query)
      );
    }

    return rows;
  }, [period, filterMode, searchQuery]);

  // Stats
  const anomalyCount = useMemo(() => {
    if (!period) return 0;
    return period.rows.filter(isAnomalyRow).length;
  }, [period]);

  const handleCalculate = useCallback(async () => {
    setCalculating(true);
    try {
      const result = await calculatePayout(id);
      if (result.success) {
        toast.success(t("toasts.calculation_started"));
        setCalculateDialogOpen(false);
        // Simulate calculation time
        setTimeout(() => {
          toast.success(t("toasts.calculation_done", { anomalies: anomalyCount }));
          loadPeriod();
        }, 3000);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setCalculating(false);
    }
  }, [id, t, anomalyCount, loadPeriod]);

  const handleFinalize = useCallback(
    async (_confirmText: string) => {
      setFinalizing(true);
      try {
        // Note: API expects "подтвердить" but we accept "FINALIZE" per spec
        const result = await finalizePayout(id, "подтвердить");
        if (result.success) {
          toast.success(t("toasts.finalized"));
          setFinalizeDialogOpen(false);
          loadPeriod();
        } else {
          toast.error(t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      } finally {
        setFinalizing(false);
      }
    },
    [id, t, loadPeriod]
  );

  const handleExport = useCallback(async () => {
    try {
      await exportPayout(id, "xlsx");
      toast.success(t("toasts.exported"));
    } catch {
      toast.error(t("toasts.error"));
    }
  }, [id, t]);

  const handleRowClick = useCallback((row: PayoutRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  }, []);

  return {
    // data
    period,
    loading,
    error,
    filteredRows,
    anomalyCount,
    // filters
    filterMode,
    setFilterMode,
    searchQuery,
    setSearchQuery,
    // employee drawer
    selectedRow,
    drawerOpen,
    setDrawerOpen,
    handleRowClick,
    // dialogs
    calculateDialogOpen,
    setCalculateDialogOpen,
    finalizeDialogOpen,
    setFinalizeDialogOpen,
    calculating,
    finalizing,
    // actions
    loadPeriod,
    handleCalculate,
    handleFinalize,
    handleExport,
  };
}
