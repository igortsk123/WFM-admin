"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createZone,
  updateZone,
  deleteZone,
  type ZoneWithCounts,
} from "@/lib/api/taxonomy";

import {
  zoneFormSchema,
  type ZoneFormValues,
  type ZonesTab,
} from "./_shared";

interface UseZoneFormParams {
  activeTab: ZonesTab;
  selectedStoreId: string;
  mutateGlobal: () => void;
  mutateStore: () => void;
}

export function useZoneForm({
  activeTab,
  selectedStoreId,
  mutateGlobal,
  mutateStore,
}: UseZoneFormParams) {
  const t = useTranslations("screen.zones");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneWithCounts | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ZoneWithCounts | null>(
    null
  );
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      scope: "GLOBAL",
      store_id: "",
      icon: "store",
      active: true,
    },
  });

  function openCreate() {
    setEditingZone(null);
    form.reset({
      code: "",
      name: "",
      description: "",
      scope:
        activeTab === "by_store" && selectedStoreId ? "STORE" : "GLOBAL",
      store_id: selectedStoreId || "",
      icon: "store",
      active: true,
    });
    setDialogOpen(true);
  }

  function openEdit(zone: ZoneWithCounts) {
    setEditingZone(zone);
    form.reset({
      code: zone.code,
      name: zone.name,
      description: "",
      scope: zone.store_id ? "STORE" : "GLOBAL",
      store_id: zone.store_id ? String(zone.store_id) : "",
      icon: zone.icon,
      active: zone.approved,
    });
    setDialogOpen(true);
  }

  function handleDeleteRequest(zone: ZoneWithCounts) {
    setDeleteTarget(zone);
    setDeleteAlertOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await deleteZone(deleteTarget.id);
    if (res.success) {
      toast.success(t("toasts.deleted"));
      mutateGlobal();
      mutateStore();
    } else if (res.error?.code === "HAS_DEPENDENCIES") {
      toast.error(t("toasts.in_use_warning"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  function handleSubmit(values: ZoneFormValues) {
    startTransition(async () => {
      const payload = {
        code: values.code,
        name: values.name,
        icon: values.icon,
        store_id: values.scope === "STORE" ? Number(values.store_id) : null,
        approved: values.active,
      };

      const res = editingZone
        ? await updateZone(editingZone.id, payload)
        : await createZone(payload);

      if (res.success) {
        toast.success(
          editingZone ? t("toasts.updated") : t("toasts.created")
        );
        setDialogOpen(false);
        mutateGlobal();
        mutateStore();
      } else {
        toast.error(t("toasts.error"));
      }
    });
  }

  return {
    form,
    dialogOpen,
    setDialogOpen,
    editingZone,
    deleteTarget,
    deleteAlertOpen,
    setDeleteAlertOpen,
    isPending,
    openCreate,
    openEdit,
    handleDeleteRequest,
    handleDelete,
    handleSubmit,
  };
}
