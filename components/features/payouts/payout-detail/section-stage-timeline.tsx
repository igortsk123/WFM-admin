import { useTranslations } from "next-intl";
import { Calendar, Calculator, CheckCircle2, Wallet } from "lucide-react";

import type { PayoutPeriodStatus } from "@/lib/api/payouts";
import { cn } from "@/lib/utils";

interface StageTimelineProps {
  currentStatus: PayoutPeriodStatus;
}

export function StageTimeline({ currentStatus }: StageTimelineProps) {
  const t = useTranslations("screen.payoutDetail.stages");

  const stages = [
    { key: "created", icon: Calendar, status: "OPEN" as const },
    { key: "calculating", icon: Calculator, status: "CALCULATING" as const },
    { key: "ready", icon: CheckCircle2, status: "READY" as const },
    { key: "paid", icon: Wallet, status: "PAID" as const },
  ];

  const currentIndex = stages.findIndex((s) => s.status === currentStatus);

  return (
    <div className="flex items-center justify-between overflow-x-auto py-2 px-1">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "bg-success border-success text-success-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground",
                  isPending && "bg-muted border-border text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCompleted && "text-success",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {t(stage.key as Parameters<typeof t>[0])}
              </span>
            </div>

            {idx < stages.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  idx < currentIndex ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
