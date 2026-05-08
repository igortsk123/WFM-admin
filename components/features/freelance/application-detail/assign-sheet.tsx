"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { createAssignment } from "@/lib/api/freelance-assignments";
import { getAgents } from "@/lib/api/freelance-agents";
import type { Agent } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AssignSheet({
  open,
  onOpenChange,
  applicationId,
  paymentMode,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string;
  paymentMode?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.assignment_card");
  const [phone, setPhone] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && paymentMode !== "CLIENT_DIRECT") {
      getAgents({ page_size: 50 })
        .then((r) => setAgents(r.data))
        .catch(() => {});
    }
  }, [open, paymentMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !scheduledStart || !scheduledEnd) return;
    setSubmitting(true);
    try {
      const res = await createAssignment(applicationId, {
        freelancer_phone: phone,
        agent_id: agentId || null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
      });
      if (res.success) {
        toast.success(t("sheet_submit"));
        onOpenChange(false);
        onSuccess();
        setPhone("");
        setAgentId("");
        setScheduledStart("");
        setScheduledEnd("");
      } else {
        toast.error(res.error?.message ?? t("sheet_cancel"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showNewHint = phone.length >= 10 && !phone.startsWith("+7");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("sheet_title")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("sheet_title")}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-phone">{t("sheet_phone_label")}</Label>
            <Input
              id="assign-phone"
              type="tel"
              placeholder={t("sheet_phone_placeholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {showNewHint && (
              <p className="text-xs text-muted-foreground">
                {t("sheet_phone_not_found")}
              </p>
            )}
          </div>

          {paymentMode !== "CLIENT_DIRECT" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-agent">
                {t("sheet_agent_label")}{" "}
                <span className="text-muted-foreground text-xs">
                  ({t("sheet_agent_optional")})
                </span>
              </Label>
              <select
                id="assign-agent"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t("sheet_agent_placeholder")}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-start">{t("sheet_start_label")}</Label>
            <Input
              id="assign-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-end">{t("sheet_end_label")}</Label>
            <Input
              id="assign-end"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              required
            />
          </div>

          <SheetFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("sheet_cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !phone || !scheduledStart || !scheduledEnd}>
              {t("sheet_submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
