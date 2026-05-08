"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import {
  approveApplicationFull,
  approveApplicationPartial,
  rejectApplication,
  replaceWithBonus,
  approveMixed,
} from "@/lib/api/freelance-applications";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  type ApplicationDetailData,
  type DecisionVariant,
  type SimulationResult,
  HOURLY_RATE,
} from "./types";

export function DecisionSidebar({
  app,
  simulation,
  simulatedHours: _simulatedHours,
  onRefresh,
}: {
  app: ApplicationDetailData;
  simulation: SimulationResult | null;
  simulatedHours: number;
  onRefresh: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.decision_card");
  const router = useRouter();

  const [variant, setVariant] = useState<DecisionVariant>(null);
  const [partialHours, setPartialHours] = useState(app.requested_hours - 0.5);
  const [rejectReason, setRejectReason] = useState("");
  const [mixedFreelance, setMixedFreelance] = useState(
    Math.ceil(app.requested_hours / 2)
  );
  const [mixedBonus, setMixedBonus] = useState(
    Math.floor(app.requested_hours / 2)
  );
  const [comment, setComment] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fullFreelanceCost = app.requested_hours * HOURLY_RATE;
  const bonusCost = fullFreelanceCost * 0.5;
  const bonusSavings = Math.round(fullFreelanceCost - bonusCost);

  const mixedFreelanceCost = mixedFreelance * HOURLY_RATE;
  const mixedBonusCost = mixedBonus * HOURLY_RATE * 0.5;
  const mixedTotal = mixedFreelanceCost + mixedBonusCost;
  const mixedSavings = Math.round(fullFreelanceCost - mixedTotal);

  const isBlocked =
    app.source === "INTERNAL" &&
    simulation?.blocked === true &&
    (variant === "FULL" || variant === "PARTIAL");

  const commentRequired = variant === "REJECT";
  const commentValid =
    !commentRequired || (comment.trim().length >= 10);

  const rejectValid =
    variant !== "REJECT" || rejectReason.trim().length >= 10;

  const partialValid =
    variant !== "PARTIAL" ||
    (partialHours > 0 && partialHours < app.requested_hours);

  const mixedValid =
    variant !== "MIXED" ||
    mixedFreelance + mixedBonus === app.requested_hours;

  const canSubmit =
    variant !== null &&
    !isBlocked &&
    rejectValid &&
    partialValid &&
    mixedValid &&
    commentValid;

  function decisionLabel(): string {
    switch (variant) {
      case "FULL":
        return t("option_full");
      case "PARTIAL":
        return `${t("option_partial")} — ${partialHours} ч`;
      case "REJECT":
        return t("option_reject");
      case "BONUS":
        return t("option_bonus");
      case "MIXED":
        return `${t("option_mixed")} (${mixedFreelance}+${mixedBonus} ч)`;
      default:
        return "";
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      let result;
      const finalComment = comment.trim() || undefined;
      const rejectComment = rejectReason.trim();

      if (variant === "FULL") {
        result = await approveApplicationFull(app.id, finalComment);
      } else if (variant === "PARTIAL") {
        result = await approveApplicationPartial(
          app.id,
          partialHours,
          finalComment
        );
      } else if (variant === "REJECT") {
        result = await rejectApplication(app.id, rejectComment);
      } else if (variant === "BONUS") {
        result = await replaceWithBonus(
          app.id,
          finalComment ?? t("option_bonus")
        );
      } else if (variant === "MIXED") {
        result = await approveMixed(
          app.id,
          mixedFreelance,
          mixedBonus,
          finalComment ?? t("option_mixed")
        );
      }

      if (result?.success) {
        if (
          (variant === "BONUS" || variant === "MIXED") &&
          result.id
        ) {
          toast.success(t("confirm_dialog_ok"), {
            description: `${t("confirm_dialog_ok")} — ${decisionLabel()}`,
            action: {
              label: "Перейти к бонусу",
              onClick: () =>
                router.push(
                  `${ADMIN_ROUTES.bonusTasks}?budget_id=${result.id}`
                ),
            },
          });
        } else {
          toast.success(t("confirm_dialog_ok"));
        }
        if (result.warning) {
          toast.info(result.warning);
        }
        setConfirmOpen(false);
        onRefresh();
      } else if (result?.error?.code === "BUDGET_EXCEEDED") {
        toast.error(result.error.message);
      } else {
        toast.error(result?.error?.message ?? "Ошибка");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RadioGroup
            value={variant ?? ""}
            onValueChange={(v) => setVariant(v as DecisionVariant)}
            className="flex flex-col gap-2"
          >
            {(
              [
                ["FULL", t("option_full")],
                ["PARTIAL", t("option_partial")],
                ["REJECT", t("option_reject")],
                ["BONUS", t("option_bonus")],
                ["MIXED", t("option_mixed")],
              ] as [DecisionVariant, string][]
            ).map(([value, label]) => (
              <div
                key={value as string}
                className="flex items-start gap-2.5 rounded-md border border-border p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setVariant(value)}
              >
                <RadioGroupItem
                  value={value as string}
                  id={`option-${value}`}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`option-${value}`}
                  className="text-sm leading-snug cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* PARTIAL: hours input */}
          {variant === "PARTIAL" && (
            <div className="flex flex-col gap-1.5 pl-1">
              <Label className="text-xs">{t("partial_hours_label")}</Label>
              <Input
                type="number"
                min={0.5}
                max={app.requested_hours - 0.5}
                step={0.5}
                value={partialHours}
                onChange={(e) => setPartialHours(Number(e.target.value))}
                className="h-8 text-sm"
              />
              {!partialValid && (
                <p className="text-xs text-destructive">
                  0 &lt; часов &lt; {app.requested_hours}
                </p>
              )}
            </div>
          )}

          {/* REJECT: reason */}
          {variant === "REJECT" && (
            <div className="flex flex-col gap-1.5 pl-1">
              <Label className="text-xs">{t("reject_reason_label")}</Label>
              <Textarea
                placeholder={t("reject_reason_hint")}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
              {rejectReason.length > 0 && rejectReason.length < 10 && (
                <p className="text-xs text-destructive">
                  {t("reject_reason_hint")}
                </p>
              )}
            </div>
          )}

          {/* BONUS info */}
          {variant === "BONUS" && (
            <div className="rounded-md bg-info/10 px-3 py-2.5 text-xs text-foreground pl-1">
              <p>
                {t("bonus_info", { hours: app.requested_hours })}
              </p>
              <p className="mt-1 font-medium text-success">
                {t("bonus_savings", {
                  savings: bonusSavings.toLocaleString("ru"),
                })}
              </p>
            </div>
          )}

          {/* MIXED: two inputs */}
          {variant === "MIXED" && (
            <div className="flex flex-col gap-2.5 pl-1">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <Label className="text-xs">
                    {t("mixed_freelance_label")}
                  </Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={app.requested_hours - 0.5}
                    step={0.5}
                    value={mixedFreelance}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMixedFreelance(v);
                      setMixedBonus(app.requested_hours - v);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <Label className="text-xs">{t("mixed_bonus_label")}</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={app.requested_hours - 0.5}
                    step={0.5}
                    value={mixedBonus}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMixedBonus(v);
                      setMixedFreelance(app.requested_hours - v);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {!mixedValid ? (
                <p className="text-xs text-destructive">
                  {t("mixed_sum_hint", { total: app.requested_hours })}
                </p>
              ) : (
                <p className="text-xs text-success">
                  {t("mixed_savings", {
                    savings: mixedSavings.toLocaleString("ru"),
                  })}
                </p>
              )}
            </div>
          )}

          {/* Comment */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              {t("comment_label")}{" "}
              <span className="text-muted-foreground">
                ({commentRequired ? t("comment_required") : t("comment_optional")})
              </span>
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Budget blocked alert */}
          {isBlocked && simulation?.blocked_reason && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {simulation.blocked_reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <Button
                    className="w-full"
                    disabled={!canSubmit || submitting}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {t("submit_label")}
                  </Button>
                </span>
              </TooltipTrigger>
              {isBlocked && (
                <TooltipContent>
                  <p>{t("submit_blocked_tooltip")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_dialog_desc", { decision: decisionLabel() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {t("confirm_dialog_ok")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
