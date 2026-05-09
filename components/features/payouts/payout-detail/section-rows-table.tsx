"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCell } from "@/components/shared/user-cell";

import type { PayoutRow } from "@/lib/api/payouts";

import {
  formatCurrency,
  formatPoints,
  isAnomalyRow,
  userFromName,
} from "./_shared";

interface RowsTableProps {
  rows: PayoutRow[];
  onRowClick: (row: PayoutRow) => void;
}

export function RowsTable({ rows, onRowClick }: RowsTableProps) {
  const t = useTranslations("screen.payoutDetail.table.columns");

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">{t("user")}</TableHead>
                <TableHead>{t("store")}</TableHead>
                <TableHead className="text-right">{t("bonus_tasks")}</TableHead>
                <TableHead className="text-right">{t("points")}</TableHead>
                <TableHead className="text-right">{t("rate")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("anomalies")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const user = userFromName(row.user_name);
                const hasAnomaly = isAnomalyRow(row);

                return (
                  <TableRow
                    key={row.user_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick(row)}
                  >
                    <TableCell>
                      <UserCell user={user} />
                    </TableCell>
                    <TableCell className="text-sm">{row.store_name}</TableCell>
                    <TableCell className="text-right">{row.bonus_tasks_completed}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPoints(row.points_earned)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">1</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(row.rub_amount)}
                    </TableCell>
                    <TableCell>
                      {hasAnomaly && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          <AlertTriangle className="size-3 mr-1" />
                          1
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
