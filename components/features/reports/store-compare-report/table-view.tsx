"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { StoreComparisonRow } from "@/lib/api/reports";

import { Sparkline } from "./sparkline";
import {
  type T,
  type SortField,
  type SortDir,
  QUADRANT_BADGE,
  extractCity,
  mockEmployees,
  mockTasksDone,
  getQuintileClass,
} from "./_shared";

interface TableViewProps {
  stores: StoreComparisonRow[];
  t: T;
}

export function TableView({ stores, t }: TableViewProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allCompletion = stores.map((s) => s.completion_rate);
  const allReturn = stores.map((s) => s.return_rate);
  const allOnTime = stores.map((s) => s.on_time_rate);
  const allHours = stores.map((s) => s.hours_diff_pct);
  const allFot = stores.map((s) => s.fot_diff_pct);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (sortDir === "none") return [...stores].sort((a, b) => a.rank - b.rank);
    return [...stores].sort((a, b) => {
      const av = a[sortField] as number | string;
      const bv = b[sortField] as number | string;
      const diff =
        typeof av === "string"
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [stores, sortField, sortDir]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="size-3 opacity-40" />;
    if (sortDir === "asc") return <ChevronUp className="size-3" />;
    if (sortDir === "desc") return <ChevronDown className="size-3" />;
    return <ChevronsUpDown className="size-3 opacity-40" />;
  }

  function SortableHead({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <TableHead
        className={cn("cursor-pointer select-none whitespace-nowrap", className)}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <SortIcon field={field} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hint alert */}
      <Alert className="border-info/20 bg-info/5">
        <AlertCircle className="size-4 text-info" />
        <AlertDescription className="text-sm text-info">
          {t("hint_alert")}
        </AlertDescription>
      </Alert>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortableHead field="rank" className="w-10 pl-4">
                {t("table.columns.rank")}
              </SortableHead>
              <SortableHead
                field="store_name"
                className="min-w-[200px] sticky left-0 bg-muted/30 z-10"
              >
                {t("table.columns.store")}
              </SortableHead>
              <TableHead className="whitespace-nowrap">{t("table.columns.city")}</TableHead>
              <TableHead className="whitespace-nowrap text-right">
                {t("table.columns.employees")}
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                {t("table.columns.tasks_done")}
              </TableHead>
              <SortableHead field="completion_rate" className="whitespace-nowrap text-right">
                {t("table.columns.completion_rate")}
              </SortableHead>
              <SortableHead field="return_rate" className="whitespace-nowrap text-right">
                {t("table.columns.return_rate")}
              </SortableHead>
              <SortableHead field="on_time_rate" className="whitespace-nowrap text-right">
                {t("table.columns.on_time_rate")}
              </SortableHead>
              <SortableHead field="hours_diff_pct" className="whitespace-nowrap text-right">
                {t("table.columns.hours_diff_pct")}
              </SortableHead>
              <SortableHead field="fot_diff_pct" className="whitespace-nowrap text-right">
                {t("table.columns.fot_diff_pct")}
              </SortableHead>
              <TableHead className="whitespace-nowrap">{t("table.columns.trend")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("table.columns.quadrant")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => {
              const city = extractCity(row.store_name);
              const employees = mockEmployees(row.store_id);
              const tasksDone = mockTasksDone(row);

              return (
                <TableRow
                  key={row.store_id}
                  className="cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={(e) => {
                    const path = ADMIN_ROUTES.storeDetail(String(row.store_id));
                    if (e.metaKey || e.ctrlKey) window.open(path, "_blank");
                    else router.push(path as never);
                  }}
                >
                  <TableCell className="pl-4 text-muted-foreground font-mono text-xs">
                    {row.rank}
                  </TableCell>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium max-w-[220px]">
                    <Link
                      href={ADMIN_ROUTES.storeDetail(String(row.store_id))}
                      className="hover:text-primary transition-colors line-clamp-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.store_name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {row.store_external_code}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {city}
                  </TableCell>
                  <TableCell className="text-right text-sm">{employees}</TableCell>
                  <TableCell className="text-right text-sm">{tasksDone}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium rounded-sm",
                      getQuintileClass(row.completion_rate, allCompletion),
                    )}
                  >
                    {row.completion_rate}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium",
                      getQuintileClass(row.return_rate, allReturn, true),
                    )}
                  >
                    {row.return_rate}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm font-medium",
                      getQuintileClass(row.on_time_rate, allOnTime),
                    )}
                  >
                    {row.on_time_rate}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm",
                      getQuintileClass(row.hours_diff_pct, allHours),
                    )}
                  >
                    {row.hours_diff_pct > 0 ? "+" : ""}
                    {row.hours_diff_pct}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm",
                      getQuintileClass(row.fot_diff_pct, allFot),
                    )}
                  >
                    {row.fot_diff_pct > 0 ? "+" : ""}
                    {row.fot_diff_pct}%
                  </TableCell>
                  <TableCell>
                    <Sparkline data={row.sparkline_completion} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs whitespace-nowrap", QUADRANT_BADGE[row.quadrant])}
                    >
                      {t(`comparison_badge.${row.quadrant}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((row) => (
          <Card
            key={row.store_id}
            className="cursor-pointer"
            onClick={() =>
              router.push(ADMIN_ROUTES.storeDetail(String(row.store_id)) as never)
            }
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm leading-snug">{row.store_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {row.store_external_code}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs shrink-0", QUADRANT_BADGE[row.quadrant])}
                >
                  {t(`comparison_badge.${row.quadrant}`)}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">{t("table.columns.completion_rate")}</p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      getQuintileClass(row.completion_rate, allCompletion),
                    )}
                  >
                    {row.completion_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("table.columns.return_rate")}</p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      getQuintileClass(row.return_rate, allReturn, true),
                    )}
                  >
                    {row.return_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("table.columns.on_time_rate")}</p>
                  <p className="font-semibold text-sm">{row.on_time_rate}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Sparkline data={row.sparkline_completion} />
                <span className="text-xs text-muted-foreground">#{row.rank}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
