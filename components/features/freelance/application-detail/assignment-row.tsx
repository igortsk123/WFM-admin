"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FreelancerAssignment } from "@/lib/types";

export function AssignmentRow({
  assignment,
  onRemove,
}: {
  assignment: FreelancerAssignment;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.assignment_card");

  const statusKey = `assignment_status_${assignment.status}` as Parameters<typeof t>[0];

  const statusClass: Record<FreelancerAssignment["status"], string> = {
    SCHEDULED: "bg-info/10 text-info",
    CHECKED_IN: "bg-warning/10 text-warning",
    WORKING: "bg-warning/10 text-warning",
    DONE: "bg-success/10 text-success",
    NO_SHOW: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {assignment.freelancer_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {assignment.freelancer_phone}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${statusClass[assignment.status]}`}
        >
          {t(statusKey)}
        </span>
        {assignment.status === "SCHEDULED" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(assignment.id)}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">{t("remove_assignment")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
