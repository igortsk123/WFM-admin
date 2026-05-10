"use client";

import { useTranslations, useLocale } from "next-intl";

import { MetadataCard, WorkTypeBadge, type MetadataItem } from "@/components/shared";
import { formatDate, formatRelative } from "@/lib/utils/format";

import type { ApplicationDetailData } from "./types";

export function ParamsCard({ app }: { app: ApplicationDetailData }) {
  const tParams = useTranslations("screen.freelanceApplicationDetail.params_card");
  const locale = useLocale();

  const items: MetadataItem[] = [
    {
      label: tParams("planned_date"),
      value: (
        <>
          {formatDate(new Date(app.planned_date), locale as "ru" | "en")}
          <span className="ml-1 text-xs text-muted-foreground">
            ({formatRelative(new Date(app.planned_date), locale as "ru" | "en")})
          </span>
        </>
      ),
    },
    {
      label: tParams("hours_requested"),
      value: (
        <>
          {app.requested_hours} {tParams("hours_unit")}
          {app.status === "APPROVED_PARTIAL" && app.approved_hours != null && (
            <span className="ml-1.5 text-xs text-muted-foreground line-through">
              {app.requested_hours} {tParams("hours_unit")}
            </span>
          )}
        </>
      ),
    },
  ];

  if (app.approved_hours != null && app.status !== "APPROVED_FULL") {
    items.push({
      label: tParams("hours_approved"),
      value: `${app.approved_hours} ${tParams("hours_unit")}`,
      valueClassName: "text-success",
    });
  }

  items.push({
    label: tParams("work_type"),
    value: (
      <WorkTypeBadge
        workType={{ id: app.work_type_id, name: app.work_type_name }}
        size="sm"
      />
    ),
  });

  items.push({
    label: tParams("location"),
    value: app.store_name,
    span: 2,
  });

  items.push({
    label: tParams("comment"),
    value: app.comment || tParams("no_comment"),
    span: 2,
  });

  return <MetadataCard title={tParams("title")} items={items} columns={2} />;
}
