"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, ListChecks } from "lucide-react";

import type { FreelancerAssignment } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { AssignSheet } from "./assign-sheet";
import type { ApplicationDetailData } from "./types";

export function ExternalSidebar({
  app,
  assignments,
  onRefresh,
}: {
  app: ApplicationDetailData;
  assignments: FreelancerAssignment[];
  onRefresh: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.external_block");
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Card>
        <CardContent className="pt-5 flex flex-col gap-3">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("desc")}</p>
          {app.external_ref && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs">
              <span className="text-muted-foreground">{t("ref_label")}: </span>
              <span className="font-mono font-medium text-foreground">
                {app.external_ref}
              </span>
            </div>
          )}
          {assignments.length === 0 ? (
            <Button size="sm" onClick={() => setSheetOpen(true)} className="w-full gap-1.5">
              <Plus className="size-3.5" />
              Назначить исполнителя
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() =>
                router.push(
                  `${ADMIN_ROUTES.taskNew}?freelance_application_id=${app.id}`
                )
              }
            >
              <ListChecks className="size-3.5" />
              Создать задачи на смену
            </Button>
          )}
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
