"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Copy,
  Monitor,
  Shield,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { RoleBadge } from "@/components/shared/role-badge";

import type { AuditEntry, FunctionalRole, Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { detectDeviceType, formatDateFull, getInitials } from "./_shared";
import { DiffTable } from "./diff-table";
import { EntityBadge } from "./entity-badge";

interface EventDetailPanelProps {
  entry: AuditEntry;
  onCopyId: () => void;
  onOpenEntity: () => void;
  locale: string;
  entityTypeLabel: (type: string) => string;
}

export function EventDetailPanel({
  entry,
  onCopyId,
  onOpenEntity,
  locale,
  entityTypeLabel,
}: EventDetailPanelProps) {
  const t = useTranslations("screen.audit");

  const [payloadOpen, setPayloadOpen] = React.useState(true);
  const deviceType = entry.device_type ?? detectDeviceType(entry.user_agent);

  const DeviceIcon =
    deviceType === "mobile"
      ? Smartphone
      : deviceType === "tablet"
      ? Tablet
      : Monitor;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">
            {formatDateFull(entry.occurred_at, locale)}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <EntityBadge
              type={entry.entity_type}
              label={entityTypeLabel(entry.entity_type)}
            />
            {entry.platform_action && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-info/10 text-info border-info/30 cursor-default"
                    >
                      <Shield className="size-3 mr-1" aria-hidden />
                      {t("platform_action.badge")}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{t("platform_action.tooltip")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[calc(100vh-14rem)] lg:max-h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-0 divide-y divide-border">
          {/* WHO */}
          <section className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail_sheet.actor_section")}
            </p>
            <div className="flex items-start gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="text-xs font-medium bg-accent text-accent-foreground">
                  {getInitials(entry.actor.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 min-w-0">
                <a
                  href={`/employees/${entry.actor.id}`}
                  className="text-sm font-medium text-foreground hover:underline truncate"
                >
                  {entry.actor.name}
                </a>
                {entry.actor.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.actor.email}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <RoleBadge role={entry.actor.role as FunctionalRole} size="sm" />
                  {entry.platform_action && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-info/20 text-info border-info/30"
                    >
                      <Shield className="size-3 mr-1" aria-hidden />
                      Beyond Violet
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* WHAT */}
          <section className="p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail_sheet.what_section")}
            </p>
            <p className="text-base font-medium text-foreground">
              {pickLocalized(entry.action_label, entry.action_label_en, locale as Locale)}
            </p>
            {entry.entity_url ? (
              <a
                href={entry.entity_url}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {pickLocalized(entry.entity_name, entry.entity_name_en, locale as Locale)}
                <ArrowUpRight className="size-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                {pickLocalized(entry.entity_name, entry.entity_name_en, locale as Locale)}
              </p>
            )}
          </section>

          {/* AMOUNT ADJUST — special inline display */}
          {entry.action === "service.amount_adjust" && (
            <section className="p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("detail_sheet.diff_section")}
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <span className="text-sm font-mono font-semibold text-destructive line-through">
                  {String(entry.payload.from_amount ?? "—")} ₽
                </span>
                <ArrowUpRight
                  className="size-3.5 text-muted-foreground rotate-90 shrink-0"
                  aria-hidden
                />
                <span className="text-sm font-mono font-semibold text-success">
                  {String(entry.payload.to_amount ?? "—")} ₽
                </span>
              </div>
              {Boolean(entry.payload.reason) && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t("diff_fields.reason")}:</span>{" "}
                  {String(entry.payload.reason)}
                </p>
              )}
            </section>
          )}

          {/* DIFF */}
          {entry.diff &&
            entry.diff.length > 0 &&
            entry.action !== "service.amount_adjust" && (
              <section className="p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail_sheet.diff_section")}
                </p>
                <DiffTable diff={entry.diff} />
              </section>
            )}

          {/* DIFF for amount_adjust — also show generic diff if present */}
          {entry.diff &&
            entry.diff.length > 0 &&
            entry.action === "service.amount_adjust" && (
              <section className="p-4 flex flex-col gap-3">
                <DiffTable diff={entry.diff} />
              </section>
            )}

          {/* PAYLOAD */}
          <section className="p-4 flex flex-col gap-2">
            <Collapsible open={payloadOpen} onOpenChange={setPayloadOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                {payloadOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                Payload (JSON)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-muted p-3 rounded max-h-96 overflow-auto">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* CONTEXT */}
          <section className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Контекст
            </p>
            <div className="flex flex-col gap-2">
              {entry.ip_address && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                    {t("detail_sheet.ip_label")}
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {entry.ip_address}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                  Устройство
                </span>
                <DeviceIcon
                  className="size-3.5 text-muted-foreground shrink-0"
                  aria-hidden
                />
              </div>
              {entry.user_agent && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                    {t("detail_sheet.user_agent_label")}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] cursor-default">
                          {entry.user_agent}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs break-all">
                        {entry.user_agent}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t">
        {entry.entity_url && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={onOpenEntity}
          >
            <ArrowUpRight className="size-4" />
            {t("row_actions.open_entity")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          onClick={onCopyId}
        >
          <Copy className="size-4" />
          {t("row_actions.copy_id")}
        </Button>
      </div>
    </div>
  );
}
