"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  Globe,
  Store,
  Box,
  ShoppingCart,
  Truck,
  Coffee,
  Refrigerator,
  MapPin,
  Tag,
  Wrench,
  Lightbulb,
  Sparkles,
  Building,
  SearchX,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  getZones,
  createZone,
  updateZone,
  deleteZone,
  type ZoneWithCounts,
} from "@/lib/api/taxonomy";
import { getStores } from "@/lib/api/stores";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import useSWR from "swr";

// ─── Icon registry ─────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { value: "store", label: "Store", Icon: Store },
  { value: "map-pin", label: "MapPin", Icon: MapPin },
  { value: "shopping-cart", label: "ShoppingCart", Icon: ShoppingCart },
  { value: "truck", label: "Truck", Icon: Truck },
  { value: "coffee", label: "Coffee", Icon: Coffee },
  { value: "box", label: "Box", Icon: Box },
  { value: "tag", label: "Tag", Icon: Tag },
  { value: "wrench", label: "Wrench", Icon: Wrench },
  { value: "refrigerator", label: "Refrigerator", Icon: Refrigerator },
  { value: "lightbulb", label: "Lightbulb", Icon: Lightbulb },
  { value: "sparkles", label: "Sparkles", Icon: Sparkles },
  { value: "building", label: "Building", Icon: Building },
] as const;

function ZoneIcon({ icon, className = "size-5" }: { icon: string; className?: string }) {
  const found = ICON_OPTIONS.find((o) => o.value === icon);
  if (!found) return <Box className={className} />;
  const { Icon } = found;
  return <Icon className={className} />;
}

// ─── Zod schema ────────────────────────────────────────────────────────────────

const zoneFormSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[A-Z0-9_]+$/, "Только заглавные буквы, цифры и _"),
    name: z.string().min(1).max(60),
    description: z.string().max(300).optional(),
    scope: z.enum(["GLOBAL", "STORE"]),
    store_id: z.string().optional(),
    icon: z.string().min(1),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "STORE" && !data.store_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите магазин",
        path: ["store_id"],
      });
    }
  });

type ZoneFormValues = z.infer<typeof zoneFormSchema>;

// ─── SWR fetchers ──────────────────────────────────────────────────────────────

const SWR_KEY_GLOBAL = "zones-global";
const SWR_KEY_STORE = (storeId?: string) => `zones-store-${storeId ?? "all"}`;

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function ZonesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Zone card ────────────────────────────────────────────────────────────────

interface ZoneCardProps {
  zone: ZoneWithCounts;
  showStoreBadge?: boolean;
  onEdit: (zone: ZoneWithCounts) => void;
  onDelete: (zone: ZoneWithCounts) => void;
}

function ZoneCard({ zone, showStoreBadge = false, onEdit, onDelete }: ZoneCardProps) {
  const t = useTranslations("screen.zones");
  const canDelete = zone.tasks_count === 0;

  return (
    <Card className="group relative flex flex-col cursor-pointer hover:border-primary transition-colors">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ZoneIcon icon={zone.icon} className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground leading-tight truncate">
              {zone.name}
            </p>
            <code className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
              {zone.code}
            </code>
          </div>
        </div>
        {!zone.approved && (
          <Badge variant="outline" className="text-warning border-warning mt-2 w-fit text-xs">
            {t("card.pending_approval")}
          </Badge>
        )}
        {showStoreBadge && zone.store_name && (
          <Badge variant="secondary" className="mt-2 w-fit text-xs">
            {zone.store_name}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3 flex flex-col gap-2 flex-1 justify-end">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {t("card.stores_count", { count: zone.stores_count })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("card.tasks_today", { count: zone.tasks_count })}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={t("dialogs.edit_title", { name: zone.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(zone);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("dialogs.fields.name")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-destructive hover:text-destructive"
                    aria-label={t("dialogs.delete_action")}
                    disabled={!canDelete}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canDelete) onDelete(zone);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!canDelete && (
                <TooltipContent>
                  {t("dialogs.delete_in_use_error", { count: zone.tasks_count })}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Zone form fields ─────────────────────────────────────────────────────────

function ZoneFormFields({ form, storeOptions, t }: {
  form: ReturnType<typeof useForm<ZoneFormValues>>;
  storeOptions: Array<{ value: string; label: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {

  const scopeValue = form.watch("scope");
  const iconValue = form.watch("icon");

  return (
    <div className="flex flex-col gap-4">
      {/* code */}
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.code")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="font-mono uppercase"
                placeholder="SALES_FLOOR"
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.name")}</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Торговый зал" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("dialogs.fields.description")}{" "}
              <span className="text-muted-foreground text-xs">(необязательно)</span>
            </FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* scope */}
      <FormField
        control={form.control}
        name="scope"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.scope")}</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="GLOBAL" id="scope-global" />
                  <Globe className="size-4 text-muted-foreground" />
                  <Label htmlFor="scope-global" className="cursor-pointer">
                    {t("dialogs.fields.scope_global")}
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="STORE" id="scope-store" />
                  <Store className="size-4 text-muted-foreground" />
                  <Label htmlFor="scope-store" className="cursor-pointer">
                    {t("dialogs.fields.scope_store")}
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* store_id — only visible when scope=STORE */}
      {scopeValue === "STORE" && (
        <FormField
          control={form.control}
          name="store_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dialogs.fields.store_id")}</FormLabel>
              <FormControl>
                <Combobox
                  options={storeOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("filters.store")}
                  searchPlaceholder="Поиск магазина..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* icon */}
      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.icon")}</FormLabel>
            <FormControl>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={`flex size-10 items-center justify-center rounded-md border transition-colors hover:border-primary ${
                      iconValue === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                    aria-label={value}
                    aria-pressed={iconValue === value}
                  >
                    <Icon className="size-5" />
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* active */}
      <FormField
        control={form.control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
            <FormLabel className="cursor-pointer">{t("dialogs.fields.active")}</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ZonesList() {
  const t = useTranslations("screen.zones");
  const [activeTab, setActiveTab] = useState<"global" | "by_store">("global");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [searchGlobal, setSearchGlobal] = useState("");
  const [searchStore, setSearchStore] = useState("");

  // Dialog / sheet state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneWithCounts | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ZoneWithCounts | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── SWR data ──────────────────────────────────────────────────────────────

  const useSWRStores = useSWR("stores-active", () =>
    getStores({ page_size: 100, archived: false, active: true })
  );

  const {
    data: globalData,
    error: globalError,
    isLoading: globalLoading,
    mutate: mutateGlobal,
  } = useSWR(SWR_KEY_GLOBAL, () => getZones({ scope: "GLOBAL", page_size: 100 }));

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

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredGlobal = useMemo(() => {
    const zones = globalData?.data ?? [];
    if (!searchGlobal) return zones;
    const q = searchGlobal.toLowerCase();
    return zones.filter(
      (z) => z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q)
    );
  }, [globalData, searchGlobal]);

  const filteredStore = useMemo(() => {
    const zones = storeData?.data ?? [];
    if (!searchStore) return zones;
    const q = searchStore.toLowerCase();
    return zones.filter(
      (z) => z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q)
    );
  }, [storeData, searchStore]);

  // ── Grouped by store for NETWORK_OPS view ─────────────────────────────────

  const groupedByStore = useMemo(() => {
    if (selectedStoreId) return null;
    const zones = filteredStore;
    const result: Record<string, { storeName: string; zones: ZoneWithCounts[] }> = {};
    for (const z of zones) {
      const storeKey = z.store_id ? String(z.store_id) : "global";
      const storeName = z.store_name ?? "Глобальные";
      if (!result[storeKey]) result[storeKey] = { storeName, zones: [] };
      result[storeKey].zones.push(z);
    }
    return result;
  }, [filteredStore, selectedStoreId]);

  // ── Store options for combobox ────────────────────────────────────────────

  const activeStores = useSWRStores.data?.data ?? [];

  const storeOptions = useMemo(
    () => [
      { value: "", label: t("filters.store_all") },
      ...activeStores.map((s) => ({
        value: String(s.id),
        label: `${s.name} (${s.external_code})`,
      })),
    ],
    [t, activeStores]
  );

  const formStoreOptions = useMemo(
    () =>
      activeStores.map((s) => ({
        value: String(s.id),
        label: `${s.name} (${s.external_code})`,
      })),
    [activeStores]
  );

  // ── Form ──────────────────────────────────────────────────────────────────

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
      scope: activeTab === "by_store" && selectedStoreId ? "STORE" : "GLOBAL",
      store_id: selectedStoreId || "",
      icon: "store",
      active: true,
    });
    // Use sheet on mobile, dialog on desktop — controlled by CSS is not possible here,
    // so we open dialog and let CSS handle sheet-only on mobile
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

      let res;
      if (editingZone) {
        res = await updateZone(editingZone.id, payload);
      } else {
        res = await createZone(payload);
      }

      if (res.success) {
        toast.success(editingZone ? t("toasts.updated") : t("toasts.created"));
        setDialogOpen(false);
        mutateGlobal();
        mutateStore();
      } else {
        toast.error(t("toasts.error"));
      }
    });
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const hasGlobalFilters = !!searchGlobal;
  const hasStoreFilters = !!searchStore || !!selectedStoreId;

  // ── Form dialog content ───────────────────────────────────────────────────

  const formTitle = editingZone
    ? t("dialogs.edit_title", { name: editingZone.name })
    : t("dialogs.create_title");

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <ZoneFormFields form={form} storeOptions={formStoreOptions} t={t} />
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isPending}
          >
            {t("dialogs.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "..." : t("dialogs.save")}
          </Button>
        </div>
      </form>
    </Form>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.taxonomy") },
          { label: t("breadcrumbs.zones") },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t("actions.create")}
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "global" | "by_store")}
        className="flex flex-col gap-4"
      >
        <div className="overflow-x-auto">
          <TabsList className="inline-flex">
            <TabsTrigger value="global">{t("tabs.global")}</TabsTrigger>
            <TabsTrigger value="by_store">{t("tabs.by_store")}</TabsTrigger>
          </TabsList>
        </div>

        {/* ── GLOBAL tab ───────────────────────────────────────────────────── */}
        <TabsContent value="global" className="mt-0 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("tabs_subtitle.global")}</p>

          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t("filters.search_placeholder")}
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
            />
            {hasGlobalFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchGlobal("")}
                className="w-fit"
              >
                {t("filters.clear_all")}
              </Button>
            )}
          </div>

          {/* Content */}
          {globalLoading ? (
            <ZonesGridSkeleton />
          ) : globalError ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center gap-2">
                Не удалось загрузить зоны.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mutateGlobal()}
                  className="h-auto p-0 underline"
                >
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredGlobal.length === 0 && hasGlobalFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("empty.filtered_title")}
              description=""
              action={{
                label: t("empty.filtered_reset"),
                onClick: () => setSearchGlobal(""),
              }}
            />
          ) : filteredGlobal.length === 0 ? (
            <EmptyState
              icon={Globe}
              title={t("empty.no_zones_global_title")}
              description={t("empty.no_zones_global_subtitle")}
              action={{ label: t("actions.create"), onClick: openCreate }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGlobal.map((zone) => (
                <AlertDialog
                  key={zone.id}
                  open={deleteAlertOpen && deleteTarget?.id === zone.id}
                  onOpenChange={(open) => {
                    if (!open) setDeleteAlertOpen(false);
                  }}
                >
                  <ZoneCard
                    zone={zone}
                    onEdit={openEdit}
                    onDelete={handleDeleteRequest}
                  />
                  <ConfirmDialog
                    title={t("dialogs.delete_confirm_title", { name: zone.name })}
                    message={t("dialogs.delete_confirm_warning")}
                    confirmLabel={t("dialogs.delete_action")}
                    variant="destructive"
                    onConfirm={handleDelete}
                    onOpenChange={(open) => setDeleteAlertOpen(open)}
                  />
                </AlertDialog>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── BY STORE tab ─────────────────────────────────────────────────── */}
        <TabsContent value="by_store" className="mt-0 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("tabs_subtitle.by_store")}</p>

          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              className="w-full sm:max-w-xs"
              placeholder={t("filters.search_placeholder")}
              value={searchStore}
              onChange={(e) => setSearchStore(e.target.value)}
            />
            <div className="w-full sm:w-64">
              <Combobox
                options={storeOptions}
                value={selectedStoreId}
                onValueChange={(v) => setSelectedStoreId(v)}
                placeholder={t("filters.store")}
                searchPlaceholder="Поиск магазина..."
              />
            </div>
            {hasStoreFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchStore("");
                  setSelectedStoreId("");
                }}
                className="w-fit"
              >
                {t("filters.clear_all")}
              </Button>
            )}
          </div>

          {/* Content */}
          {storeLoading ? (
            <ZonesGridSkeleton />
          ) : storeError ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center gap-2">
                Не удалось загрузить зоны.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mutateStore()}
                  className="h-auto p-0 underline"
                >
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredStore.length === 0 && hasStoreFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("empty.filtered_title")}
              description=""
              action={{
                label: t("empty.filtered_reset"),
                onClick: () => {
                  setSearchStore("");
                  setSelectedStoreId("");
                },
              }}
            />
          ) : filteredStore.length === 0 && selectedStoreId ? (
            <EmptyState
              icon={Store}
              title={t("empty.no_zones_store_title")}
              description={t("empty.no_zones_store_subtitle")}
              action={{ label: t("actions.create"), onClick: openCreate }}
            />
          ) : filteredStore.length === 0 ? (
            <EmptyState
              icon={Store}
              title={t("empty.no_store_selected_title")}
              description={t("empty.no_store_selected_subtitle")}
            />
          ) : selectedStoreId ? (
            /* Single store selected — flat grid */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStore.map((zone) => (
                <AlertDialog
                  key={zone.id}
                  open={deleteAlertOpen && deleteTarget?.id === zone.id}
                  onOpenChange={(open) => {
                    if (!open) setDeleteAlertOpen(false);
                  }}
                >
                  <ZoneCard
                    zone={zone}
                    showStoreBadge={!!zone.store_id}
                    onEdit={openEdit}
                    onDelete={handleDeleteRequest}
                  />
                  <ConfirmDialog
                    title={t("dialogs.delete_confirm_title", { name: zone.name })}
                    message={t("dialogs.delete_confirm_warning")}
                    confirmLabel={t("dialogs.delete_action")}
                    variant="destructive"
                    onConfirm={handleDelete}
                    onOpenChange={(open) => setDeleteAlertOpen(open)}
                  />
                </AlertDialog>
              ))}
            </div>
          ) : (
            /* No store selected — grouped view for NETWORK_OPS */
            <div className="flex flex-col gap-8">
              {groupedByStore &&
                Object.entries(groupedByStore).map(([storeKey, { storeName, zones }]) => (
                  <div key={storeKey} className="flex flex-col gap-3">
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Store className="size-4 text-muted-foreground" />
                        {storeName}
                        <Badge variant="secondary" className="text-xs">
                          {zones.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {zones.map((zone) => (
                        <AlertDialog
                          key={zone.id}
                          open={deleteAlertOpen && deleteTarget?.id === zone.id}
                          onOpenChange={(open) => {
                            if (!open) setDeleteAlertOpen(false);
                          }}
                        >
                          <ZoneCard
                            zone={zone}
                            showStoreBadge={!!zone.store_id}
                            onEdit={openEdit}
                            onDelete={handleDeleteRequest}
                          />
                          <ConfirmDialog
                            title={t("dialogs.delete_confirm_title", { name: zone.name })}
                            message={t("dialogs.delete_confirm_warning")}
                            confirmLabel={t("dialogs.delete_action")}
                            variant="destructive"
                            onConfirm={handleDelete}
                            onOpenChange={(open) => setDeleteAlertOpen(open)}
                          />
                        </AlertDialog>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add/Edit Dialog (md+) ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{formTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] pr-1">
            {formContent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
