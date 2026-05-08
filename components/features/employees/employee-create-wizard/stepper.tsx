"use client";

import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepMeta {
  number: number;
  label: string;
  sub: string;
  icon: LucideIcon;
}

interface StepperProps {
  steps: StepMeta[];
  currentStep: number;
  onStepClick: (n: number) => void;
}

export function VerticalStepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-32 space-y-1">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          return (
            <button
              key={step.number}
              disabled={!isCompleted}
              onClick={() => isCompleted && onStepClick(step.number)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                isCurrent && "bg-muted",
                isCompleted && "cursor-pointer hover:bg-muted/60",
                !isCompleted && !isCurrent && "cursor-default opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="size-4" /> : step.number}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">{step.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function HorizontalStepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto lg:hidden pb-1">
      {steps.map((step, i) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        return (
          <div key={step.number} className="flex items-center">
            <button
              disabled={!isCompleted}
              onClick={() => isCompleted && onStepClick(step.number)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 rounded-md min-w-[56px]",
                isCompleted && "cursor-pointer",
                !isCompleted && !isCurrent && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="size-3.5" /> : step.number}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium text-center leading-tight",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
