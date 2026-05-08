"use client";

import { useTranslations, useLocale } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { WorkTypeBadge } from "@/components/shared";
import { formatDate, formatRelative } from "@/lib/utils/format";

import type { ApplicationDetailData } from "./types";

export function ParamsCard({ app }: { app: ApplicationDetailData }) {
  const tParams = useTranslations("screen.freelanceApplicationDetail.params_card");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{tParams("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {tParams("planned_date")}
            </dt>
            <dd className="font-medium text-foreground mt-0.5">
              {formatDate(new Date(app.planned_date), locale as "ru" | "en")}
              <span className="ml-1 text-xs text-muted-foreground">
                ({formatRelative(new Date(app.planned_date), locale as "ru" | "en")})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {tParams("hours_requested")}
            </dt>
            <dd className="font-medium text-foreground mt-0.5">
              {app.requested_hours} {tParams("hours_unit")}
              {app.status === "APPROVED_PARTIAL" &&
                app.approved_hours != null && (
                  <span className="ml-1.5 text-xs text-muted-foreground line-through">
                    {app.requested_hours} {tParams("hours_unit")}
                  </span>
                )}
            </dd>
          </div>
          {app.approved_hours != null &&
            app.status !== "APPROVED_FULL" && (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {tParams("hours_approved")}
                </dt>
                <dd className="font-medium text-success mt-0.5">
                  {app.approved_hours} {tParams("hours_unit")}
                </dd>
              </div>
            )}
          <div>
            <dt className="text-xs text-muted-foreground">
              {tParams("work_type")}
            </dt>
            <dd className="mt-0.5">
              <WorkTypeBadge
                workType={{
                  id: app.work_type_id,
                  name: app.work_type_name,
                }}
                size="sm"
              />
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">
              {tParams("location")}
            </dt>
            <dd className="font-medium text-foreground mt-0.5">
              {app.store_name}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">
              {tParams("comment")}
            </dt>
            <dd className="text-foreground mt-0.5">
              {app.comment || tParams("no_comment")}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
