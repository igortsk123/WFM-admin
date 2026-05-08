"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Plus, ListChecks } from "lucide-react";

import { removeAssignment } from "@/lib/api/freelance-assignments";
import type { FreelancerAssignment } from "@/lib/types";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDate } from "@/lib/utils/format";

import { AssignmentRow } from "./assignment-row";
import { AssignSheet } from "./assign-sheet";
import type { ApplicationDetailData } from "./types";

export function AssignmentSidebar({
  app,
  assignments,
  onRefresh,
}: {
  app: ApplicationDetailData;
  assignments: FreelancerAssignment[];
  onRefresh: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.assignment_card");
  const tToast = useTranslations("screen.freelanceApplicationDetail.toasts");
  const router = useRouter();
  const locale = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [removingId, setRemovingId] = useState<string | null>(null);

  const approvedHours = app.approved_hours ?? app.requested_hours;
  const plannedDate = new Date(app.planned_date);

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const res = await removeAssignment(id);
      if (res.success) {
        toast.success(tToast("assignment_removed"));
        onRefresh();
      } else {
        toast.error(res.error?.message ?? tToast("error"));
      }
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {t("approved_summary", {
              hours: approvedHours,
              date: formatDate(plannedDate, locale as "ru" | "en"),
            })}
          </p>

          {assignments.length === 0 ? (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {t("no_assignee_warning")}
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {assignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="size-3.5" />
              {t("assign_cta")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-full gap-1.5"
              onClick={() =>
                router.push(
                  `${ADMIN_ROUTES.taskNew}?freelance_application_id=${app.id}`
                )
              }
            >
              <ListChecks className="size-3.5" />
              {t("create_tasks_cta")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AssignSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applicationId={app.id}
        paymentMode={undefined}
        onSuccess={onRefresh}
      />
    </>
  );
}
