import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/api/leaderboards";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getInitials, PAGE_SIZE, type T } from "./_shared";
import { StreakBadge, TrendIcon } from "./indicators";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  mode: "users" | "stores";
  t: T;
  onRowClick: (entry: LeaderboardEntry) => void;
}

export function LeaderboardTable({ entries, mode, t, onRowClick }: LeaderboardTableProps) {
  const [page, setPage] = useState(1);
  const tableEntries = entries.slice(3);
  const totalPages = Math.max(1, Math.ceil(tableEntries.length / PAGE_SIZE));
  const pageEntries = tableEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const colKeys = mode === "users" ? t.raw("users_tab.columns") : t.raw("stores_tab.columns");

  return (
    <Card>
      {mode === "users" && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("users_tab.table_title")}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{colKeys.rank}</TableHead>
                <TableHead>{mode === "users" ? colKeys.user : colKeys.store}</TableHead>
                {mode === "stores" && <TableHead>{colKeys.city}</TableHead>}
                <TableHead className="text-right">{colKeys.score}</TableHead>
                {mode === "stores" && (
                  <TableHead className="text-right">{colKeys.employees}</TableHead>
                )}
                <TableHead className="w-20 text-center">
                  {mode === "users" ? colKeys.streak : colKeys.streak_weeks}
                </TableHead>
                <TableHead className="w-16 text-center">{colKeys.trend}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageEntries.map((entry) => (
                <TableRow
                  key={entry.entity_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(entry)}
                >
                  <TableCell>
                    <span
                      className={`text-base font-semibold ${
                        entry.rank <= 3 ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {getInitials(entry.entity_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{entry.entity_name}</span>
                    </div>
                  </TableCell>
                  {mode === "stores" && (
                    <TableCell className="text-sm text-muted-foreground">Томск</TableCell>
                  )}
                  <TableCell className="text-right font-semibold text-base">
                    {entry.points.toLocaleString("ru-RU")}
                  </TableCell>
                  {mode === "stores" && (
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {entry.tasks_completed}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <StreakBadge />
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendIcon trend={entry.trend} positions={entry.trend_positions} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {pageEntries.map((entry) => (
            <div
              key={entry.entity_id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 min-h-[56px]"
              onClick={() => onRowClick(entry)}
            >
              <span
                className={`w-7 text-sm font-semibold shrink-0 ${
                  entry.rank <= 3 ? "text-success" : "text-muted-foreground"
                }`}
              >
                {entry.rank}
              </span>
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {getInitials(entry.entity_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.entity_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StreakBadge />
                <span className="text-sm font-semibold">
                  {entry.points.toLocaleString("ru-RU")}
                </span>
                <TrendIcon trend={entry.trend} positions={entry.trend_positions} />
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 p-3 border-t">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
