"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";

import type { LocalHint } from "./_shared";

interface HintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editHint?: LocalHint | null;
  defaultWorkTypeId?: number;
  defaultZoneId?: number;
  onSave: (data: { work_type_id: number; zone_id: number; text: string }) => Promise<void>;
}

export function HintDialog({
  open,
  onOpenChange,
  editHint,
  defaultWorkTypeId,
  defaultZoneId,
  onSave,
}: HintDialogProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const globalZones = MOCK_ZONES.filter((z) => z.approved && !z.store_id);
  const globalWorkTypes = MOCK_WORK_TYPES.filter((wt) => wt.id <= 13);

  const [workTypeId, setWorkTypeId] = React.useState<string>(
    editHint ? String(editHint.work_type_id) : defaultWorkTypeId ? String(defaultWorkTypeId) : ""
  );
  const [zoneId, setZoneId] = React.useState<string>(
    editHint ? String(editHint.zone_id) : defaultZoneId ? String(defaultZoneId) : ""
  );
  const [text, setText] = React.useState(editHint?.text ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setWorkTypeId(editHint ? String(editHint.work_type_id) : defaultWorkTypeId ? String(defaultWorkTypeId) : "");
      setZoneId(editHint ? String(editHint.zone_id) : defaultZoneId ? String(defaultZoneId) : "");
      setText(editHint?.text ?? "");
      setErrors({});
    }
  }, [open, editHint, defaultWorkTypeId, defaultZoneId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!workTypeId) e.work_type_id = tCommon("required");
    if (!zoneId) e.zone_id = tCommon("required");
    if (!text.trim()) e.text = tCommon("required");
    else if (text.trim().length < 5)
      e.text = tCommon("validation") ?? "Минимум 5 символов";
    else if (text.trim().length > 500)
      e.text = "Максимум 500 символов";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        work_type_id: Number(workTypeId),
        zone_id: Number(zoneId),
        text: text.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  const isEdit = !!editHint;
  const workTypeName = globalWorkTypes.find((wt) => wt.id === Number(workTypeId))?.name ?? "";
  const zoneName = globalZones.find((z) => z.id === Number(zoneId))?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("dialogs.edit_title") : t("dialogs.create_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Work type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-select">{t("dialogs.fields.work_type_id")}</Label>
            <Select
              value={workTypeId}
              onValueChange={setWorkTypeId}
              disabled={isEdit}
            >
              <SelectTrigger id="wt-select">
                <SelectValue placeholder="Выберите тип работы" />
              </SelectTrigger>
              <SelectContent>
                {globalWorkTypes.map((wt) => (
                  <SelectItem key={wt.id} value={String(wt.id)}>
                    {wt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.work_type_id && (
              <p className="text-xs text-destructive">{errors.work_type_id}</p>
            )}
          </div>

          {/* Zone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-select">{t("dialogs.fields.zone_id")}</Label>
            <Select
              value={zoneId}
              onValueChange={setZoneId}
              disabled={isEdit}
            >
              <SelectTrigger id="zone-select">
                <SelectValue placeholder="Выберите зону" />
              </SelectTrigger>
              <SelectContent>
                {globalZones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.zone_id && (
              <p className="text-xs text-destructive">{errors.zone_id}</p>
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hint-text">{t("dialogs.fields.text")}</Label>
            <Textarea
              id="hint-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("dialogs.fields.text_placeholder")}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between">
              {errors.text ? (
                <p className="text-xs text-destructive">{errors.text}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">{text.length} / 500</p>
            </div>
          </div>

          {/* Live preview */}
          {text.trim() && (
            <div className="rounded-lg bg-muted/30 border border-border p-3 flex gap-2">
              <Lightbulb className="size-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex flex-col gap-1">
                {workTypeName && zoneName && (
                  <p className="text-xs text-muted-foreground">
                    {workTypeName} / {zoneName}
                  </p>
                )}
                <p className="text-sm text-foreground leading-relaxed">{text}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {t("dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
