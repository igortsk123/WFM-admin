"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserCell } from "@/components/shared/user-cell";

import type { PayoutRow } from "@/lib/api/payouts";

import {
  BONUS_TASK_POINTS,
  formatCurrency,
  isAnomalyRow,
  userFromName,
} from "./_shared";

interface EmployeeSheetProps {
  row: PayoutRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeSheet({ row, open, onOpenChange }: EmployeeSheetProps) {
  const t = useTranslations("screen.payoutDetail.table");

  if (!row) return null;

  const user = userFromName(row.user_name);
  const hasAnomaly = isAnomalyRow(row);
  // Mock anomaly description — backend will provide structured anomaly data.
  const anomalyText = hasAnomaly ? "На 80% выше среднего по магазину" : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("drawer_title")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-4">
          <div className="space-y-6">
            {/* Employee info */}
            <div className="flex items-center gap-3">
              <UserCell user={user} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Магазин</span>
                <p className="font-medium">{row.store_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Задач выполнено</span>
                <p className="font-medium">{row.tasks_completed}</p>
              </div>
            </div>

            <Separator />

            {/* Bonus tasks section */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("bonus_tasks_section")}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                  <span>Bonus tasks выполнено</span>
                  <span className="font-medium">{row.bonus_tasks_completed}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                  <span>Очков за bonus tasks</span>
                  <span className="font-medium">
                    {row.bonus_tasks_completed * BONUS_TASK_POINTS}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Calculation section */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("calculation_section")}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <span>Очков всего</span>
                  <span className="font-medium">{row.points_earned}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <span>Стоимость очка</span>
                  <span className="font-medium">1 ₽</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
                  <span className="font-medium">Итого к выплате</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(row.rub_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Anomalies section */}
            {hasAnomaly && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">{t("anomaly_section")}</h4>
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertDescription>{anomalyText}</AlertDescription>
                  </Alert>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
