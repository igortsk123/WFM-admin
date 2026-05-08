import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
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
import type { Goal, GoalCategory } from "@/lib/types";

import { GOAL_CATEGORIES, type GoalsT, type CommonT } from "./_shared";

export function CreateGoalDialogContent({
  t,
  tCommon,
  onSubmit,
  onOpenChange,
}: {
  t: GoalsT;
  tCommon: CommonT;
  onSubmit: (data: Partial<Goal>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("CUSTOM");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title,
        description,
        category,
        target_value: parseFloat(targetValue) || 0,
        target_unit: targetUnit,
        period_start: periodStart,
        period_end: periodEnd,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t("manual_create.dialog_title")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t("manual_create.title_label")}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("manual_create.description_label")}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{t("manual_create.category_label")}</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`category.${cat}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetValue">{t("manual_create.target_value_label")}</Label>
            <Input
              id="targetValue"
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetUnit">{t("manual_create.target_unit_label")}</Label>
            <Input
              id="targetUnit"
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              placeholder="%"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periodStart">{t("manual_create.period_start_label")}</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodEnd">{t("manual_create.period_end_label")}</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "..." : t("manual_create.submit")}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
