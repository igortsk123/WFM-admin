"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { getLamaSyncLogs } from "@/lib/api/integrations";
import type { LamaSyncLog } from "@/lib/api/integrations";
import { formatDateTime } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";

import {
  formatDuration,
  SyncStatusBadge,
  SyncTypeBadge,
  type Translator,
} from "./_shared";

interface LogsTabProps {
  t: Translator;
  locale: Locale;
}

export function LogsTab({ t, locale }: LogsTabProps) {
  // useTransition — debounced search/filter как non-urgent.
  const [, startTransition] = React.useTransition();
  const [logs, setLogs] = React.useState<LamaSyncLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  const [drawerLog, setDrawerLog] = React.useState<LamaSyncLog | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getLamaSyncLogs({ search: search || undefined, status: statusFilter, page, page_size: PAGE_SIZE }).then((res) => {
      setLogs(res.data);
      setTotal(res.total);
      setLoading(false);
    });
  }, [search, statusFilter, page]);

  // Debounced search — debounce + startTransition двойная защита.
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setSearch(debouncedSearch);
        setPage(1);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            placeholder={t("lama_detail.logs_search")}
            className="pl-8 h-8 text-sm w-52"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            startTransition(() => {
              setStatusFilter(v);
              setPage(1);
            });
          }}
        >
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("lama_detail.logs_status_all")}</SelectItem>
            <SelectItem value="success">{t("lama_detail.logs_status_success")}</SelectItem>
            <SelectItem value="error">{t("lama_detail.logs_status_error")}</SelectItem>
            <SelectItem value="partial">Частично</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2 transition-opacity duration-200" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Логи не найдены</p>
        </div>
      ) : (
        <div className="animate-in fade-in">
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">{t("lama_detail.logs_col_time")}</TableHead>
                  <TableHead className="w-24">{t("lama_detail.logs_col_duration")}</TableHead>
                  <TableHead className="w-28">{t("lama_detail.logs_col_type")}</TableHead>
                  <TableHead className="w-28">{t("lama_detail.logs_col_status")}</TableHead>
                  <TableHead>{t("lama_detail.logs_col_records")}</TableHead>
                  <TableHead className="w-24">{t("lama_detail.logs_col_errors")}</TableHead>
                  <TableHead>{t("lama_detail.logs_col_initiator")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setDrawerLog(log)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(log.started_at), locale)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {log.duration_ms ? formatDuration(log.duration_ms) : "—"}
                    </TableCell>
                    <TableCell><SyncTypeBadge type={log.type} /></TableCell>
                    <TableCell><SyncStatusBadge status={log.status} /></TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {log.records_created !== undefined && log.records_updated !== undefined
                        ? `+${log.records_created} / ~${log.records_updated}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {(log.error_count ?? 0) > 0 ? (
                        <span className="text-sm text-destructive tabular-nums">{log.error_count}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.initiator_name ?? t("lama_detail.logs_initiator_schedule")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors space-y-1.5"
                onClick={() => setDrawerLog(log)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{formatDateTime(new Date(log.started_at), locale)}</span>
                  <div className="flex items-center gap-1.5">
                    <SyncTypeBadge type={log.type} />
                    <SyncStatusBadge status={log.status} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.duration_ms && <span>{formatDuration(log.duration_ms)}</span>}
                  {log.records_created !== undefined && <span>+{log.records_created} / ~{log.records_updated}</span>}
                  {(log.error_count ?? 0) > 0 && <span className="text-destructive">{log.error_count} ошибок</span>}
                  <span>{log.initiator_name ?? t("lama_detail.logs_initiator_schedule")}</span>
                </div>
                {log.error_message && (
                  <p className="text-xs text-destructive truncate">{log.error_message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} из {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log detail drawer */}
      <Sheet open={!!drawerLog} onOpenChange={(o) => { if (!o) setDrawerLog(null); }}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>{t("lama_detail.logs_drawer_title")}</SheetTitle>
          </SheetHeader>
          {drawerLog && (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Начало</p>
                  <p className="font-medium">{formatDateTime(new Date(drawerLog.started_at), locale)}</p>
                </div>
                {drawerLog.ended_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Окончание</p>
                    <p className="font-medium">{formatDateTime(new Date(drawerLog.ended_at), locale)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Тип</p>
                  <SyncTypeBadge type={drawerLog.type} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Статус</p>
                  <SyncStatusBadge status={drawerLog.status} />
                </div>
                {drawerLog.duration_ms && (
                  <div>
                    <p className="text-xs text-muted-foreground">Длительность</p>
                    <p className="font-medium">{formatDuration(drawerLog.duration_ms)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Инициатор</p>
                  <p className="font-medium">{drawerLog.initiator_name ?? t("lama_detail.logs_initiator_schedule")}</p>
                </div>
                {drawerLog.records_created !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Создано / Обновлено</p>
                    <p className="font-medium">+{drawerLog.records_created} / ~{drawerLog.records_updated}</p>
                  </div>
                )}
                {(drawerLog.error_count ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ошибок</p>
                    <p className="font-medium text-destructive">{drawerLog.error_count}</p>
                  </div>
                )}
              </div>

              {drawerLog.error_message && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1.5">{t("lama_detail.logs_drawer_errors")}</p>
                  <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive">{drawerLog.error_message}</p>
                    {drawerLog.error_details && (
                      <ul className="mt-2 space-y-0.5">
                        {drawerLog.error_details.map((d, i) => (
                          <li key={i} className="text-xs text-destructive/80 font-mono">{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {drawerLog.payload_json && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t("lama_detail.logs_drawer_payload")}</p>
                  <pre className="whitespace-pre-wrap text-xs font-mono bg-muted rounded-md p-3 overflow-x-auto">
                    {JSON.stringify(drawerLog.payload_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
