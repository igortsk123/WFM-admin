"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import type { AIHint } from "@/lib/api/ai-coach";

import { MOCK_METRICS_CHART, type HintFormState } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// PREVIEW DRAWER — mobile-style hint preview
// ═══════════════════════════════════════════════════════════════════

interface PreviewDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workTypeName: string;
  form: HintFormState;
}

export function PreviewDrawer({
  open,
  onOpenChange,
  workTypeName,
  form,
}: PreviewDrawerProps) {
  const t = useTranslations("screen.aiCoach.preview_drawer");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 pb-8 max-w-sm mx-auto space-y-4">
            {/* Mock mobile card */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Задача</p>
                <p className="text-sm font-semibold text-foreground">{workTypeName}</p>
              </div>
              <div className="p-4 space-y-4">
                {form.why && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("section_why")}
                    </p>
                    <p className="text-sm leading-relaxed">{form.why}</p>
                  </div>
                )}
                {(form.step1 || form.step2 || form.step3) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("section_steps")}
                    </p>
                    {[form.step1, form.step2, form.step3]
                      .filter(Boolean)
                      .map((step, i) => (
                        <div key={i} className="flex gap-2.5">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm">{step}</p>
                        </div>
                      ))}
                  </div>
                )}
                {(form.error1 || form.error2 || form.error3) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("section_errors")}
                    </p>
                    {[form.error1, form.error2, form.error3]
                      .filter(Boolean)
                      .map((err, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-destructive font-bold mt-0.5 shrink-0">×</span>
                          <p className="text-sm text-destructive">{err}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// METRICS TAB — KPI cards + helpful-rate trend chart
// ═══════════════════════════════════════════════════════════════════

interface MetricsTabProps {
  hints: AIHint[];
}

export function MetricsTab({ hints }: MetricsTabProps) {
  const t = useTranslations("screen.aiCoach");

  const cards: { label: string; value: string | number }[] = [
    {
      label: t("metrics_tab.stats.applications_30d"),
      value: hints[0]?.stats.impressions ?? 0,
    },
    {
      label: t("metrics_tab.stats.helpful"),
      value: hints[0]?.stats.applications ?? 0,
    },
    {
      label: t("metrics_tab.stats.helpful_rate"),
      value: hints[0]
        ? `${Math.round(hints[0].stats.helpful_rate * 100)}%`
        : "—",
    },
    { label: t("metrics_tab.stats.ai_feedback"), value: "4.3" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("metrics_tab.history_chart_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MOCK_METRICS_CHART} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                interval={14}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={[50, 100]}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={((value: number) => [`${value}%`, "Helpful rate"]) as never}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Alert>
        <Info className="size-4" />
        <AlertDescription className="text-xs">
          {t("metrics_tab.info_alert")}
        </AlertDescription>
      </Alert>
    </div>
  );
}
