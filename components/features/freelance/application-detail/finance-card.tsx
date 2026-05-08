"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

import { BudgetUsageRow } from "./budget-usage-row";
import {
  type ApplicationDetailData,
  type SimulationResult,
  HOURLY_RATE,
} from "./types";

export function FinanceCard({
  app,
  isExternal,
  simulation,
  simHours,
  simLoading,
  onSimHoursChange,
}: {
  app: ApplicationDetailData;
  isExternal: boolean;
  simulation: SimulationResult | null;
  simHours: number;
  simLoading: boolean;
  onSimHoursChange: (v: number) => void;
}) {
  const tFinance = useTranslations("screen.freelanceApplicationDetail.finance_card");

  const monthUsage = app.budget_usage.find((u) => u.period === "MONTH");
  const estimatedCost = app.requested_hours * HOURLY_RATE;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{tFinance("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Banners */}
        {isExternal && (
          <div className="flex items-start gap-2 rounded-md bg-info/10 px-3 py-2.5 text-xs text-foreground">
            <Info className="size-3.5 mt-0.5 shrink-0 text-info" />
            {tFinance("external_banner")}
          </div>
        )}

        {/* Cost */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            {tFinance("cost_label")}
          </span>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              {estimatedCost.toLocaleString("ru")} ₽
            </p>
            <p className="text-xs text-muted-foreground">
              {tFinance("cost_breakdown", {
                hours: app.requested_hours,
                rate: HOURLY_RATE,
              })}
            </p>
          </div>
        </div>

        <Separator />

        {/* Budget usage */}
        {monthUsage ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {tFinance("budget_usage_title", {
                period: tFinance("period_MONTH"),
              })}
            </p>
            <BudgetUsageRow
              usage={monthUsage}
              periodLabel={tFinance("period_MONTH")}
              simulatedActual={
                simulation
                  ? simulation.after_approval.actual_amount
                  : undefined
              }
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Данные бюджета недоступны
          </p>
        )}

        <Separator />

        {/* Simulator */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            {tFinance("simulator_title")}
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{tFinance("simulator_hours_label")}</span>
              <span className="font-medium text-foreground">
                {simHours} ч
              </span>
            </div>
            <Slider
              min={0}
              max={app.requested_hours}
              step={0.5}
              value={[simHours]}
              onValueChange={([v]) => onSimHoursChange(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{app.requested_hours} ч</span>
            </div>
          </div>

          {simLoading && (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          )}

          {!simLoading && simulation && (
            <div className="rounded-md bg-muted/60 px-3 py-2.5 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tFinance("simulator_new_cost")}
                </span>
                <span className="font-medium text-foreground">
                  {simulation.cost.toLocaleString("ru")} ₽
                </span>
              </div>
              {simulation.after_approval.overspend > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tFinance("simulator_overspend_after")}
                  </span>
                  <span className="font-medium text-destructive">
                    +{simulation.after_approval.overspend.toLocaleString("ru")} ₽
                    {" "}(+{simulation.after_approval.overspend_pct}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Blocked alert (INTERNAL only) */}
          {!isExternal && simulation?.blocked && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {tFinance("simulator_blocked_alert", {
                  period: tFinance("period_MONTH"),
                  pct: simulation.after_approval.overspend_pct,
                })}
                {" "}
                {tFinance("simulator_blocked_details", {
                  actual: simulation.after_approval.actual_amount.toLocaleString("ru"),
                  limit: simulation.after_approval.limit_amount.toLocaleString("ru"),
                })}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
