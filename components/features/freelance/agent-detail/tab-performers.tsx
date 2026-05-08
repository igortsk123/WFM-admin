"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { FreelancerStatus, User } from "@/lib/types";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { Button } from "@/components/ui/button";

import { formatDate, formatMoney, type AgentWithRoster } from "./_shared";

interface PerformersTabProps {
  agent: AgentWithRoster;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}

const FREELANCER_STATUSES: FreelancerStatus[] = [
  "ACTIVE",
  "NEW",
  "VERIFICATION",
  "BLOCKED",
  "ARCHIVED",
];

export function PerformersTab({ agent, t, locale }: PerformersTabProps) {
  const [statusFilter, setStatusFilter] = React.useState<FreelancerStatus | "ALL">("ALL");

  const freelancers = agent.freelancers.filter((f) =>
    statusFilter === "ALL" ? true : f.freelancer_status === statusFilter
  );

  // Derive per-freelancer 30d earnings from agent.earnings
  const earningsMap = React.useMemo(() => {
    const map = new Map<number, { services: number; amount: number }>();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const e of agent.earnings) {
      if (new Date(e.created_at).getTime() < cutoff) continue;
      const prev = map.get(e.freelancer_id) ?? { services: 0, amount: 0 };
      map.set(e.freelancer_id, {
        services: prev.services + 1,
        amount: prev.amount + e.gross_amount_base,
      });
    }
    return map;
  }, [agent.earnings]);

  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      header: t("performers_tab.col_name"),
      cell: ({ row }) => <UserCell user={row.original} />,
    },
    {
      id: "phone",
      header: t("performers_tab.col_phone"),
      cell: ({ row }) =>
        row.original.phone ? (
          <a
            href={`tel:${row.original.phone}`}
            className="text-sm text-primary hover:underline underline-offset-2 whitespace-nowrap"
          >
            {row.original.phone}
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "status",
      header: t("performers_tab.col_status"),
      cell: ({ row }) => (
        <FreelancerStatusBadge status={row.original.freelancer_status ?? "NEW"} />
      ),
    },
    {
      id: "hired_at",
      header: t("performers_tab.col_added_at"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(row.original.hired_at, locale)}
        </span>
      ),
    },
    {
      id: "services_30d",
      header: t("performers_tab.col_services_30d"),
      cell: ({ row }) => (
        <span className="text-sm">
          {earningsMap.get(row.original.id)?.services ?? 0}
        </span>
      ),
    },
    {
      id: "earned_30d",
      header: t("performers_tab.col_earned_30d"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatMoney(earningsMap.get(row.original.id)?.amount ?? 0, locale)}
        </span>
      ),
    },
    {
      id: "open",
      header: "",
      cell: ({ row }) => (
        <Link
          href={ADMIN_ROUTES.employeeDetail(String(row.original.id))}
          className="text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap"
        >
          {t("performers_tab.col_open")}
          <ExternalLink className="inline-block ml-1 size-3" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={statusFilter === "ALL" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setStatusFilter("ALL")}
        >
          Все
        </Button>
        {FREELANCER_STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            <FreelancerStatusBadge status={s} />
          </Button>
        ))}
      </div>

      <DataTableShell
        columns={columns}
        data={freelancers}
        emptyMessage={{
          title: t("performers_tab.empty_title"),
          description: t("performers_tab.empty_description"),
        }}
      />
    </div>
  );
}
