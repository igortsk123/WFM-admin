"use client";

import { useTranslations } from "next-intl";

import type { BudgetLimit, BudgetUsage } from "@/lib/types";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { LimitRow } from "./columns";
import { MobileCard } from "./mobile-card";

interface LimitsTableProps {
  limits: BudgetLimit[];
  usagesMap: Map<string, BudgetUsage>;
  isClientDirect: boolean;
  canWrite: boolean;
  locale: string;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

export function LimitsTable({
  limits,
  usagesMap,
  isClientDirect,
  canWrite,
  locale,
  onEdit,
  onTerminate,
  onHistory,
}: LimitsTableProps) {
  const t = useTranslations("screen.freelanceBudgetLimits");

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.object")}</TableHead>
              <TableHead>{t("table.period")}</TableHead>
              <TableHead>{t("table.limit")}</TableHead>
              <TableHead>{t("table.valid_from")}</TableHead>
              <TableHead>{t("table.valid_to")}</TableHead>
              <TableHead>{t("table.set_by")}</TableHead>
              <TableHead>{t("table.usage")}</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {limits.map((limit) => (
              <LimitRow
                key={limit.id}
                limit={limit}
                usage={
                  usagesMap.get(`${limit.store_id}:${limit.period}`) ?? null
                }
                isClientDirect={isClientDirect}
                canWrite={canWrite}
                locale={locale}
                onEdit={onEdit}
                onTerminate={onTerminate}
                onHistory={onHistory}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {limits.map((limit) => (
          <MobileCard
            key={limit.id}
            limit={limit}
            usage={usagesMap.get(`${limit.store_id}:${limit.period}`) ?? null}
            isClientDirect={isClientDirect}
            canWrite={canWrite}
            locale={locale}
            onEdit={onEdit}
            onTerminate={onTerminate}
            onHistory={onHistory}
          />
        ))}
      </div>
    </>
  );
}
