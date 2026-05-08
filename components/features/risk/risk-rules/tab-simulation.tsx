"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { simulateRisk, type RiskSimulationResult } from "@/lib/api/risk";

export function SimulationTab() {
  const t = useTranslations("screen.riskRules");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RiskSimulationResult | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-04-30");

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const res = await simulateRisk({ date_from: dateFrom, date_to: dateTo });
    setRunning(false);
    if (res.data) {
      setResult(res.data);
      toast.success(t("toasts.simulation_done"));
    } else {
      toast.error(t("toasts.error"));
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">{t("simulation_tab.card_title")}</CardTitle>
          <CardDescription className="text-sm">
            {t("simulation_tab.card_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                {t("simulation_tab.date_range_label")} — от
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                {t("simulation_tab.date_range_label")} — до
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={running}
            className="w-full sm:w-auto gap-2"
          >
            {running && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {running
              ? t("simulation_tab.running_hint")
              : t("simulation_tab.run_button")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("simulation_tab.result_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: t("simulation_tab.result_columns.tasks_total"),
                  value: result.tasks_total.toLocaleString("ru-RU"),
                },
                {
                  label: t("simulation_tab.result_columns.would_review"),
                  value: `${result.would_review.toLocaleString("ru-RU")} (${Math.round((result.would_review / result.tasks_total) * 100)}%)`,
                },
                {
                  label: t("simulation_tab.result_columns.hours_saved"),
                  value: `${result.hours_saved} ч`,
                },
                {
                  label: t("simulation_tab.result_columns.forecast_defect"),
                  value: `${result.forecast_defect_rate_pct}%`,
                },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground leading-snug">{item.label}</span>
                  <span className="text-lg font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
