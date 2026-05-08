"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionPill } from "@/components/shared";
import type { Permission } from "@/lib/types";
import type { Agent } from "@/lib/types";
import type { StoreWithStats, PositionWithCounts } from "@/lib/api";
import type { WizardValues } from "./_shared";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

interface SummaryCardProps {
  t: (key: string) => string;
  s1Watch: {
    last_name?: string;
    first_name?: string;
    middle_name?: string;
    phone?: string;
    email?: string;
    employee_type?: WizardValues["employee_type"];
  };
  s2Watch: {
    store_id?: number;
    position_id?: number;
    rank?: number;
    hired_at?: Date;
  };
  s3Watch: { permissions?: Permission[] };
  s4Watch: { invite_method?: WizardValues["invite_method"] };
  masterValues: Partial<WizardValues>;
  stores: StoreWithStats[];
  positions: PositionWithCounts[];
  agents: Agent[];
  isNominalAccount: boolean;
}

export function SummaryCard({
  t,
  s1Watch,
  s2Watch,
  s3Watch,
  s4Watch,
  masterValues,
  stores,
  positions,
  agents,
  isNominalAccount,
}: SummaryCardProps) {
  const summaryFio = [s1Watch.last_name, s1Watch.first_name, s1Watch.middle_name]
    .filter(Boolean)
    .join(" ");
  const summaryStore = stores.find((s) => s.id === s2Watch.store_id)?.name;
  const summaryPosition = positions.find((p) => p.id === s2Watch.position_id)?.name;
  const summaryPerms = (s3Watch.permissions ?? []) as Permission[];

  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          {t("step4.summary_title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <dl className="space-y-2 text-sm">
          <SummaryRow label={t("summary.fio")} value={summaryFio || t("summary.not_set")} />
          <SummaryRow label={t("summary.phone")} value={s1Watch.phone || t("summary.not_set")} />
          <SummaryRow label={t("summary.email")} value={s1Watch.email || t("summary.not_set")} />
          <SummaryRow
            label={t("summary.employment")}
            value={
              s1Watch.employee_type === "FREELANCE"
                ? t("step1.employment_freelance")
                : t("step1.employment_staff")
            }
          />
          <SummaryRow label={t("summary.store")} value={summaryStore || t("summary.not_set")} />
          <SummaryRow label={t("summary.position")} value={summaryPosition || t("summary.not_set")} />
          <SummaryRow label={t("summary.rank")} value={s2Watch.rank ? String(s2Watch.rank) : "1"} />
          <SummaryRow
            label={t("summary.hired_at")}
            value={
              s2Watch.hired_at
                ? format(s2Watch.hired_at, "d MMM yyyy", { locale: ru })
                : t("summary.not_set")
            }
          />
          <div>
            <dt className="text-muted-foreground">{t("summary.permissions")}</dt>
            <dd className="mt-1">
              {summaryPerms.length === 0 ? (
                <span className="text-muted-foreground text-xs">{t("summary.permissions_none")}</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {summaryPerms.map((p) => (
                    <PermissionPill key={p} permission={p} />
                  ))}
                </div>
              )}
            </dd>
          </div>
          {s1Watch.employee_type === "FREELANCE" && isNominalAccount && (
            <SummaryRow
              label={t("summary.agent")}
              value={
                masterValues.agent_id
                  ? (agents.find((a) => a.id === masterValues.agent_id)?.name ?? t("summary.not_set"))
                  : t("step2.agent_none")
              }
            />
          )}
          {s1Watch.employee_type === "FREELANCE" && (
            <SummaryRow
              label={t("summary.oferta_channel")}
              value={
                masterValues.oferta_channel === "SMS"
                  ? t("step1.oferta_sms")
                  : masterValues.oferta_channel === "TELEGRAM"
                  ? t("step1.oferta_telegram")
                  : t("step1.oferta_email")
              }
            />
          )}
          <SummaryRow
            label={t("summary.invite_method")}
            value={
              s4Watch.invite_method === "EMAIL"
                ? t("step4.method_email")
                : s4Watch.invite_method === "TELEGRAM"
                ? "Telegram"
                : s4Watch.invite_method === "MAX"
                ? "Max"
                : s4Watch.invite_method === "WHATSAPP"
                ? "WhatsApp"
                : t("step4.method_none")
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}
