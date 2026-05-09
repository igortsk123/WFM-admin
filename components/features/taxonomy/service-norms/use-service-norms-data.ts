"use client";

import * as React from "react";
import { toast } from "sonner";

import type { ServiceNorm } from "@/lib/types";
import {
  archiveServiceNorm,
  getServiceNorms,
} from "@/lib/api/freelance-norms";

import type { TFn } from "./_shared";

interface UseServiceNormsDataParams {
  isArchive: boolean;
  filterFormat: string;
  filterWorkType: string;
  t: TFn;
}

interface UseServiceNormsDataResult {
  norms: ServiceNorm[];
  loading: boolean;
  error: boolean;
  fetchData: () => Promise<void>;
  handleArchive: (id: string) => Promise<void>;
}

export function useServiceNormsData({
  isArchive,
  filterFormat,
  filterWorkType,
  t,
}: UseServiceNormsDataParams): UseServiceNormsDataResult {
  const [norms, setNorms] = React.useState<ServiceNorm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getServiceNorms({
        archived: isArchive,
        object_format: filterFormat || undefined,
        work_type_id: filterWorkType ? Number(filterWorkType) : undefined,
        page_size: 100,
      });
      setNorms(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isArchive, filterFormat, filterWorkType]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleArchive = React.useCallback(
    async (id: string) => {
      try {
        const result = await archiveServiceNorm(id);
        if (result.success) {
          toast.success(t("toasts.archived"));
          void fetchData();
        } else {
          toast.error(t("toasts.error"));
        }
      } catch {
        toast.error(t("toasts.error"));
      }
    },
    [fetchData, t]
  );

  return { norms, loading, error, fetchData, handleArchive };
}
