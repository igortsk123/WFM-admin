import { useMemo, useState } from "react";
import type { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { UserCell } from "@/components/shared/user-cell";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { PlanFactByUser, PlanFactReportData } from "@/lib/api/reports";

import { calcDeltaPct, formatDeltaPct, getDeltaHoursClass } from "./_shared";

const PAGE_SIZE = 10;

export function UsersTab({
  data,
  t,
  storeOptions,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
  storeOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [storeFilter, setStoreFilter] = useState<string>("");
  const [search] = useState<string>("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let users = data.by_user as (PlanFactByUser & { deltaPct: number; deltaHours: number })[];
    users = users.map((u) => ({
      ...u,
      deltaPct: calcDeltaPct(u.planned_hours, u.actual_hours),
      deltaHours: u.actual_hours - u.planned_hours,
    }));
    if (storeFilter) {
      const storeName = storeOptions.find((s) => s.value === storeFilter)?.label ?? "";
      users = users.filter((u) => u.store_name.includes(storeName.split(",")[0]));
    }
    if (search) {
      users = users.filter((u) =>
        u.user_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return users;
  }, [data.by_user, storeFilter, search, storeOptions]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const nameParts = (name: string) => {
    const parts = name.split(" ");
    return {
      last_name: parts[0] ?? "—",
      first_name: parts[1] ?? "—",
      middle_name: parts[2],
    };
  };

  return (
    <div className="space-y-4">
      {/* Sub-toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-48">
          <Combobox
            options={[{ value: "", label: t("toolbar.all_stores") }, ...storeOptions.slice(1)]}
            value={storeFilter}
            onValueChange={(v) => {
              setStoreFilter(v);
              setPage(1);
            }}
            placeholder={t("toolbar.store_placeholder")}
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={t("empty.no_data_title")}
          description={t("empty.no_data_subtitle")}
          className="py-10"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">{t("users_tab.col_user")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("users_tab.col_store")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("users_tab.col_position")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_planned")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_actual")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_delta")}</TableHead>
                    <TableHead className="text-right">{t("users_tab.col_delta_pct")}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t("users_tab.col_tasks_plan")}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t("users_tab.col_tasks_fact")}</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">{t("users_tab.col_on_time")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((user) => {
                    const parts = nameParts(user.user_name);
                    const userObj = {
                      ...parts,
                      position_name: user.position,
                    };
                    return (
                      <TableRow
                        key={user.user_id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={(e) => {
                          const path = ADMIN_ROUTES.employeeDetail(String(user.user_id));
                          if (e.metaKey || e.ctrlKey) {
                            window.open(path, "_blank");
                          } else {
                            router.push(path as never);
                          }
                        }}
                      >
                        <TableCell>
                          <UserCell user={userObj} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell max-w-[160px] truncate">
                          {user.store_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {user.position}
                        </TableCell>
                        <TableCell className="text-right text-sm">{user.planned_hours}</TableCell>
                        <TableCell className="text-right text-sm">{user.actual_hours}</TableCell>
                        <TableCell className={cn("text-right text-sm", getDeltaHoursClass(user.deltaPct))}>
                          {user.deltaHours > 0 ? `+${user.deltaHours}` : user.deltaHours}
                        </TableCell>
                        <TableCell className={cn("text-right text-sm", getDeltaHoursClass(user.deltaPct))}>
                          {formatDeltaPct(user.deltaPct)}
                        </TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{user.total_planned}</TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{user.total_completed}</TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell">
                          {user.on_time_rate}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)}{" "}
                  из {filtered.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
