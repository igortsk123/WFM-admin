"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  Sparkles,
  Target,
  Gift,
  Lightbulb,
  Store,
  Network,
  RotateCcw,
  MessageSquare,
  Info,
  ChevronDown,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils/format";
import type {
  AISuggestion,
  AISuggestionType,
  Store as StoreType,
  Locale,
} from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface SuggestionDetailSheetProps {
  suggestion: AISuggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (edits?: Record<string, unknown>) => void;
  onReject: () => void;
  onAskAi: () => void;
  canTakeAction?: boolean;
  isReadOnly?: boolean;
  locale?: Locale;
  stores?: StoreType[];
}

// Form schema for task suggestion
const taskFormSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  store_id: z.number().optional(),
  zone_id: z.number().optional(),
  work_type_id: z.number().optional(),
  planned_minutes: z.number().min(5).max(480).optional(),
  time_start: z.string().optional(),
  time_end: z.string().optional(),
  requires_photo: z.boolean().optional(),
  manager_comment: z.string().optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  bonus_points: z.number().min(0).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const TYPE_ICONS: Record<AISuggestionType, typeof Sparkles> = {
  TASK_SUGGESTION: Sparkles,
  GOAL_SUGGESTION: Target,
  BONUS_TASK_SUGGESTION: Gift,
  INSIGHT: Lightbulb,
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function SuggestionDetailSheet({
  suggestion,
  open,
  onOpenChange,
  onAccept,
  onReject,
  onAskAi,
  canTakeAction = true,
  isReadOnly = false,
  locale = "ru",
  stores = [],
}: SuggestionDetailSheetProps) {
  const t = useTranslations("screen.aiSuggestions");
  const tCommon = useTranslations("common");

  const [isRelatedDataOpen, setIsRelatedDataOpen] = React.useState(false);

  // Initialize form with proposed_payload values
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      planned_minutes: 30,
      requires_photo: false,
      manager_comment: "",
    },
  });

  // Reset form when suggestion changes
  React.useEffect(() => {
    if (suggestion?.proposed_payload) {
      const payload = suggestion.proposed_payload as Record<string, unknown>;
      form.reset({
        title: (payload.title as string) || suggestion.title,
        description: suggestion.description,
        store_id: payload.store_id as number,
        zone_id: payload.zone_id as number,
        work_type_id: payload.work_type_id as number,
        planned_minutes: payload.planned_minutes as number,
        time_start: payload.time_start as string,
        time_end: payload.time_end as string,
        requires_photo: (payload.requires_photo as boolean) ?? false,
        manager_comment: "",
        discount_percent: payload.discount_percent as number,
        bonus_points: payload.bonus_points as number,
      });
    }
  }, [suggestion, form]);

  // Track if form has been edited
  const formValues = form.watch();
  const originalPayload = suggestion?.proposed_payload as Record<string, unknown> | undefined;
  
  const hasEdits = React.useMemo(() => {
    if (!originalPayload) return false;
    return (
      formValues.title !== (originalPayload.title || suggestion?.title) ||
      formValues.planned_minutes !== originalPayload.planned_minutes ||
      formValues.requires_photo !== (originalPayload.requires_photo ?? false) ||
      formValues.discount_percent !== originalPayload.discount_percent ||
      (formValues.manager_comment && formValues.manager_comment.length > 0)
    );
  }, [formValues, originalPayload, suggestion?.title]);

  // Reset to original AI proposal
  const handleReset = () => {
    if (suggestion?.proposed_payload) {
      const payload = suggestion.proposed_payload as Record<string, unknown>;
      form.reset({
        title: (payload.title as string) || suggestion.title,
        description: suggestion.description,
        store_id: payload.store_id as number,
        zone_id: payload.zone_id as number,
        work_type_id: payload.work_type_id as number,
        planned_minutes: payload.planned_minutes as number,
        time_start: payload.time_start as string,
        time_end: payload.time_end as string,
        requires_photo: (payload.requires_photo as boolean) ?? false,
        manager_comment: "",
        discount_percent: payload.discount_percent as number,
        bonus_points: payload.bonus_points as number,
      });
    }
  };

  // Handle accept
  const handleAccept = (data: TaskFormValues) => {
    if (hasEdits) {
      onAccept(data);
    } else {
      onAccept();
    }
  };

  if (!suggestion) return null;

  const TypeIcon = TYPE_ICONS[suggestion.type];
  const isInsight = suggestion.type === "INSIGHT";
  const isPending = suggestion.status === "PENDING" || suggestion.status === "EDITED";
  const showForm = !isInsight && isPending;

  // Get related data from context_data
  const contextData = suggestion.context_data;
  const chartData = contextData?.chart_data;
  const relatedSkus = contextData?.related_skus as string[] | undefined;
  const anomalyMetric = contextData?.anomaly_metric;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0"
        showCloseButton={true}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <TypeIcon className="size-3" aria-hidden="true" />
              {t(`type.${suggestion.type}` as Parameters<typeof t>[0])}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelative(new Date(suggestion.created_at), locale)}
            </span>
          </div>
          <SheetTitle className="text-lg leading-snug text-left">
            {suggestion.title}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Read-only banner */}
            {isReadOnly && isPending && (
              <Alert>
                <Info className="size-4" />
                <AlertDescription>{t("read_only.banner")}</AlertDescription>
              </Alert>
            )}

            {/* AI remembered banner */}
            {suggestion.status === "EDITED" && (
              <Alert className="bg-info/10 border-info/20">
                <Sparkles className="size-4 text-info" />
                <AlertDescription className="text-info">
                  {t("detail.ai_remembered")}
                </AlertDescription>
              </Alert>
            )}

            {/* Rationale section */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-2">
                {t("detail.rationale_section")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {suggestion.rationale}
              </p>
            </section>

            <Separator />

            {/* Form section (for task/goal/bonus) */}
            {showForm && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("detail.proposed_section")}
                  </h3>
                  {hasEdits && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                        {t("detail.changed_indicator")}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleReset}
                      >
                        <RotateCcw className="size-3" />
                        {t("actions.reset_to_original")}
                      </Button>
                    </div>
                  )}
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleAccept)}
                    className="space-y-4"
                  >
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("detail.form.title")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isReadOnly || !canTakeAction}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Store select */}
                    {stores.length > 0 && (
                      <FormField
                        control={form.control}
                        name="store_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("detail.form.store")}</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(v) => field.onChange(parseInt(v))}
                              disabled={isReadOnly || !canTakeAction}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {stores.map((store) => (
                                  <SelectItem
                                    key={store.id}
                                    value={store.id.toString()}
                                  >
                                    {store.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Duration */}
                    <FormField
                      control={form.control}
                      name="planned_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("detail.form.duration")}</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={5}
                                max={480}
                                className="w-24"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                disabled={isReadOnly || !canTakeAction}
                              />
                              <span className="text-sm text-muted-foreground">
                                {tCommon("time")}
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Discount percent (if applicable) */}
                    {originalPayload?.discount_percent !== undefined && (
                      <FormField
                        control={form.control}
                        name="discount_percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("detail.form.discount_percent")}</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="w-24"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseInt(e.target.value) || 0)
                                  }
                                  disabled={isReadOnly || !canTakeAction}
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Bonus points (if applicable) */}
                    {originalPayload?.bonus_points !== undefined && (
                      <FormField
                        control={form.control}
                        name="bonus_points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("detail.form.bonus_points")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                className="w-32"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                disabled={isReadOnly || !canTakeAction}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Requires photo */}
                    <FormField
                      control={form.control}
                      name="requires_photo"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel className="mb-0">
                            {t("detail.form.requires_photo")}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isReadOnly || !canTakeAction}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Manager comment */}
                    <FormField
                      control={form.control}
                      name="manager_comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("detail.form.manager_comment")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={2}
                              disabled={isReadOnly || !canTakeAction}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </section>
            )}

            {/* INSIGHT: just show description */}
            {isInsight && (
              <section>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  {t("detail.proposed_section")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {suggestion.description}
                </p>
              </section>
            )}

            <Separator />

            {/* Data sources */}
            {anomalyMetric && (
              <section>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  {t("detail.data_sources_section")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Database className="size-3" />
                    {anomalyMetric}
                  </Badge>
                </div>
              </section>
            )}

            {/* Related data (collapsible) */}
            {(chartData || relatedSkus) && (
              <Collapsible open={isRelatedDataOpen} onOpenChange={setIsRelatedDataOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-9 px-0 hover:bg-transparent"
                  >
                    <span className="text-sm font-medium">
                      {t("detail.related_data_section")}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        isRelatedDataOpen && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {/* Chart data summary */}
                  {Boolean(chartData) && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="text-xs font-medium text-foreground mb-1">
                        {(chartData as { label?: string }).label}
                      </p>
                      {(chartData as { norm?: number }).norm !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Норма: {(chartData as { norm: number }).norm}
                        </p>
                      )}
                      {(chartData as { value?: number }).value !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Текущее: {(chartData as { value: number }).value}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Related SKUs */}
                  {relatedSkus && relatedSkus.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        SKU:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {relatedSkus.slice(0, 5).map((sku, i) => (
                          <li key={i}>{sku}</li>
                        ))}
                        {relatedSkus.length > 5 && (
                          <li className="text-muted-foreground/70">
                            +{relatedSkus.length - 5} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        {isPending && (
          <SheetFooter className="px-6 py-4 border-t flex-col gap-2 sm:flex-col">
            {isInsight ? (
              <div className="flex gap-2 w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="flex-1"
                      onClick={() => onAccept()}
                      disabled={!canTakeAction || isReadOnly}
                    >
                      {t("actions.helpful")}
                    </Button>
                  </TooltipTrigger>
                  {isReadOnly && (
                    <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={onReject}
                      disabled={!canTakeAction || isReadOnly}
                    >
                      {t("actions.not_helpful")}
                    </Button>
                  </TooltipTrigger>
                  {isReadOnly && (
                    <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                  )}
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="flex gap-2 w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={cn(
                          "flex-1",
                          !hasEdits && "bg-success hover:bg-success/90 text-success-foreground"
                        )}
                        onClick={form.handleSubmit(handleAccept)}
                        disabled={!canTakeAction || isReadOnly}
                      >
                        {hasEdits ? t("actions.accept_with_edits") : t("actions.accept")}
                      </Button>
                    </TooltipTrigger>
                    {isReadOnly && (
                      <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                    )}
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={onReject}
                        disabled={!canTakeAction || isReadOnly}
                      >
                        {t("actions.reject")}
                      </Button>
                    </TooltipTrigger>
                    {isReadOnly && (
                      <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                    )}
                  </Tooltip>
                </div>
                <Button
                  variant="ghost"
                  className="w-full gap-1.5"
                  onClick={onAskAi}
                >
                  <MessageSquare className="size-4" />
                  {t("actions.ask_ai")}
                </Button>
              </>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
