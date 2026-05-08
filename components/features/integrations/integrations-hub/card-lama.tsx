"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Database, RefreshCw } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { syncLamaForce, getIntegrationsStatus } from "@/lib/api/integrations";
import type { IntegrationsStatus } from "@/lib/api/integrations";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

import { LamaStatusBadge, StatItem, type LamaHealth } from "./_shared";

interface LamaCardProps {
  status: IntegrationsStatus;
  lamaHealth: LamaHealth;
  lamaLastSync: string;
  onStatusUpdate: (status: IntegrationsStatus) => void;
}

export function LamaCard({ status, lamaHealth, lamaLastSync, onStatusUpdate }: LamaCardProps) {
  const t = useTranslations("screen.integrations");
  const [syncing, setSyncing] = React.useState(false);

  async function handleLamaSync() {
    setSyncing(true);
    try {
      await syncLamaForce();
      toast.success(t("toasts.lama_synced"));
      const res = await getIntegrationsStatus();
      onStatusUpdate(res.data);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Database className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{t("cards.lama.title")}</p>
              <p className="text-xs text-muted-foreground leading-snug">{t("cards.lama.description")}</p>
            </div>
          </div>
          <LamaStatusBadge health={lamaHealth} t={t} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <StatItem label={t("cards.lama.stat_users")} value={status.lama.users_synced_count ?? 47} />
          <StatItem label={t("cards.lama.stat_stores")} value={status.lama.stores_synced_count ?? 8} />
          <StatItem label={t("cards.lama.stat_shifts")} value={status.lama.shifts_synced_count} />
          <StatItem
            label={t("cards.lama.stat_last_sync")}
            value={lamaLastSync}
          />
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t border-border pt-3">
        <Button asChild size="sm">
          <Link href={ADMIN_ROUTES.integrations + "/lama"}>{t("cards.lama.open")}</Link>
        </Button>
        <Button variant="outline" size="sm" disabled={syncing} onClick={handleLamaSync} className="gap-2">
          <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
          {t("cards.lama.sync_now")}
        </Button>
      </CardFooter>
    </Card>
  );
}
