"use client";

import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { useAuth } from "@/lib/contexts/auth-context";

const ALL = "all";

export interface StoreOption {
  value: string;
  label: string;
}

/**
 * Unified store-context хук.
 *
 * Управляет фильтром по магазину единообразно через URL `?store=N`.
 * Дефолт = "all" (все магазины текущего org-scope из auth.user.stores).
 *
 * Использование:
 *   const { storeId, setStoreId, storeOptions, isAll } = useStoreContext();
 *   // storeId: number | null  (null = all)
 *   // setStoreId("123") — переключить, persist в URL
 *
 * Преимущества над local-state фильтрами:
 *   - URL share-able (можно скинуть ссылку на «магазин 200»)
 *   - При смене org через topbar (page reload) URL сохраняется,
 *     но если store не в новом org-scope — fallback на ALL.
 *   - Один источник истины — все экраны в session помнят выбор.
 */
export function useStoreContext() {
  const { user } = useAuth();
  const [storeIdParam, setStoreIdParam] = useQueryState(
    "store",
    parseAsString.withDefault(ALL),
  );

  const storeOptions = useMemo<StoreOption[]>(
    () => [
      { value: ALL, label: "Все магазины" },
      ...user.stores.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [user.stores],
  );

  // Validate: если URL ?store=N но N нет в текущем scope — сбрасываем на ALL
  const isValidScope = useMemo(() => {
    if (storeIdParam === ALL) return true;
    return user.stores.some((s) => String(s.id) === storeIdParam);
  }, [storeIdParam, user.stores]);

  const effectiveParam = isValidScope ? storeIdParam : ALL;
  const storeId: number | null =
    effectiveParam === ALL ? null : Number(effectiveParam);

  return {
    /** Number store id или null (= все). */
    storeId,
    /** Raw string для Combobox value. */
    storeIdParam: effectiveParam,
    /** Setter — persist в URL. */
    setStoreId: setStoreIdParam,
    /** Опции для Combobox с "Все магазины" первым. */
    storeOptions,
    /** True если выбрано "все магазины". */
    isAll: effectiveParam === ALL,
  };
}
