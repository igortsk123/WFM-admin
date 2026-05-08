import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createChallenge,
  type ChallengeGoalType,
  type CreateChallengeData,
} from "@/lib/api/leaderboards";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { T } from "./_shared";

export function CreateChallengeDialog({
  open,
  onOpenChange,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  t: T;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<CreateChallengeData>>({
    participants_scope: "ALL_STORE_EMPLOYEES",
    goal_type: "TASKS_COUNT",
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reset = () => {
    setForm({ participants_scope: "ALL_STORE_EMPLOYEES", goal_type: "TASKS_COUNT" });
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = () => {
    if (!form.title || !startDate || !endDate) return;
    startTransition(async () => {
      try {
        await createChallenge({
          title: form.title!,
          description: form.description ?? "",
          period_start: startDate,
          period_end: endDate,
          goal_type: form.goal_type!,
          goal_value: Number(form.goal_value ?? 0),
          work_type_ids: [],
          zone_ids: [],
          participants_scope: form.participants_scope!,
          reward_text: form.reward_text ?? "",
        });
        toast.success(t("toasts.challenge_created"));
        onSuccess();
        onOpenChange(false);
        reset();
      } catch {
        toast.error(t("toasts.error"));
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("create_dialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ch-title">{t("create_dialog.title_label")}</Label>
            <Input
              id="ch-title"
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Чистая полка апреля"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-description">{t("create_dialog.description_label")}</Label>
            <Textarea
              id="ch-description"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ch-start">{t("create_dialog.period_label")} (начало)</Label>
              <Input
                id="ch-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-end">{t("create_dialog.period_label")} (конец)</Label>
              <Input
                id="ch-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ch-goal-type">{t("create_dialog.goal_type_label")}</Label>
              <Select
                value={form.goal_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, goal_type: v as ChallengeGoalType }))
                }
              >
                <SelectTrigger id="ch-goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["TASKS_COUNT", "HOURS", "COMPLETION_RATE", "NO_REJECTS"] as const
                  ).map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`create_dialog.goal_type_options.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-goal-value">{t("create_dialog.goal_value_label")}</Label>
              <Input
                id="ch-goal-value"
                type="number"
                min={0}
                value={form.goal_value ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, goal_value: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-participants">{t("create_dialog.participants_label")}</Label>
            <Select
              value={form.participants_scope}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  participants_scope: v as CreateChallengeData["participants_scope"],
                }))
              }
            >
              <SelectTrigger id="ch-participants">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["ALL_STORE_EMPLOYEES", "BY_POSITION", "SPECIFIC_USERS"] as const
                ).map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`create_dialog.participants_options.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-reward">{t("create_dialog.reward_label")}</Label>
            <Input
              id="ch-reward"
              value={form.reward_text ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reward_text: e.target.value }))}
              placeholder="Бонус 1 500 ₽ + Badge «Чистюля»"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !form.title || !startDate || !endDate}
          >
            {isPending ? "Создание..." : t("create_dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
