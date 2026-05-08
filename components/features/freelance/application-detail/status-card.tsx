"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Info, Link2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { ApplicationStatusBadge } from "@/components/shared";

import type { ApplicationDetailData } from "./types";

export function StatusCard({
  app,
  isExternal,
}: {
  app: ApplicationDetailData;
  isExternal: boolean;
}) {
  const tHeader = useTranslations("screen.freelanceApplicationDetail.header");

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source badge */}
          <Badge variant="outline" className="gap-1 text-xs">
            {isExternal && <Link2 className="size-3" />}
            {isExternal
              ? tHeader("source_external")
              : tHeader("source_internal")}
          </Badge>
          <ApplicationStatusBadge status={app.status} />
        </div>

        {/* Alerts */}
        {app.urgent && (
          <Alert>
            <AlertTriangle className="size-4 text-warning" />
            <AlertTitle className="text-warning">
              {tHeader("urgent_alert_title")}
            </AlertTitle>
            <AlertDescription>
              {tHeader("urgent_alert_desc")}
            </AlertDescription>
          </Alert>
        )}
        {app.retroactive && (
          <Alert>
            <Info className="size-4 text-info" />
            <AlertTitle className="text-info">
              {tHeader("retroactive_alert_title")}
            </AlertTitle>
            <AlertDescription>
              {tHeader("retroactive_alert_desc")}
            </AlertDescription>
          </Alert>
        )}
        {isExternal && app.external_ref && (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>{tHeader("external_alert_title")}</AlertTitle>
            <AlertDescription>
              {tHeader("external_alert_desc", { ref: app.external_ref })}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
