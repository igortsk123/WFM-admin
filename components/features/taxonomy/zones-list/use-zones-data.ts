"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { getZones, type ZoneWithCounts } from "@/lib/api/taxonomy";
import { getStores } from "@/lib/api/stores";

import { SWR_KEY_GLOBAL, SWR_KEY_STORE, type ZonesTab } from "./_shared";

interface UseZonesDataParams {
  activeTab: ZonesTab;
  selectedStoreId: string;
  searchGlobal: string;
  searchStore: string;
}

interface GroupedByStore {
  storeName: string;
  zones: ZoneWithCounts[];
}

export function useZonesData({
  activeTab,
  selectedStoreId,
  searchGlobal,
  searchStore,
}: UseZonesDataParams) {
  // ── SWR: active stores list (for combobox) ──────────────────────────
  const storesQuery = useSWR("stores-active", () =>
    getStores({ page_size: 100, archived: false, active: true })
  );

  // ── SWR: GLOBAL zones ───────────────────────────────────────────────
  const {
    data: globalData,
    error: globalError,
    isLoading: globalLoading,
    mutate: mutateGlobal,
  } = useSWR(SWR_KEY_GLOBAL, () =>
    getZones({ scope: "GLOBAL", page_size: 100 })
  );

  // ── SWR: STORE-scoped zones ─────────────────────────────────────────
  const {
    data: storeData,
    error: storeError,
    isLoading: storeLoading,
    mutate: mutateStore,
  } = useSWR(
    activeTab === "by_store" ? SWR_KEY_STORE(selectedStoreId) : null,
    () =>
      selectedStoreId
        ? getZones({ store_id: Number(selectedStoreId), page_size: 100 })
        : getZones({ scope: "STORE", page_size: 100 })
  );

  // ── Filtered: GLOBAL ────────────────────────────────────────────────
  const filteredGlobal = useMemo(() => {
    const zones = globalData?.data ?? [];
    if (!searchGlobal) return zones;
    const q = searchGlobal.toLowerCase();
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q)
    );
  }, [globalData, searchGlobal]);

  // ── Filtered: STORE ─────────────────────────────────────────────────
  const filteredStore = useMemo(() => {
    const zones = storeData?.data ?? [];
    if (!searchStore) return zones;
    const q = searchStore.toLowerCase();
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q)
    );
  }, [storeData, searchStore]);

  // ── Grouped (NETWORK_OPS view: no store selected) ───────────────────
  const groupedByStore = useMemo<Record<string, GroupedByStore> | null>(() => {
    if (selectedStoreId) return null;
    const zones = filteredStore;
    const result: Record<string, GroupedByStore> = {};
    for (const z of zones) {
      const storeKey = z.store_id ? String(z.store_id) : "global";
      const storeName = z.store_name ?? "Глобальные";
      if (!result[storeKey]) result[storeKey] = { storeName, zones: [] };
      result[storeKey].zones.push(z);
    }
    return result;
  }, [filteredStore, selectedStoreId]);

  const activeStores = storesQuery.data?.data ?? [];

  return {
    activeStores,
    globalLoading,
    globalError,
    storeLoading,
    storeError,
    filteredGlobal,
    filteredStore,
    groupedByStore,
    mutateGlobal,
    mutateStore,
  };
}
