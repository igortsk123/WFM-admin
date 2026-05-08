import type { useTranslations } from "next-intl";
import { BarChart2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCell } from "@/components/shared/user-cell";
import { EmptyState } from "@/components/shared/empty-state";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { KpiPerformer } from "@/lib/api/reports";

import { getBestWorkType } from "./_shared";

interface LeaderboardTableProps {
  performers: KpiPerformer[];
  type: "top" | "support";
  t: ReturnType<typeof useTranslations>;
}

export function LeaderboardTable({
  performers,
  type,
  t,
}: LeaderboardTableProps) {
  const router = useRouter();

  if (performers.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title={t("empty.no_data_title")}
        description={t("empty.no_data_subtitle")}
        className="py-10"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">{t("leaderboards.col_rank")}</TableHead>
          <TableHead>{t("leaderboards.col_employee")}</TableHead>
          <TableHead className="hidden md:table-cell">
            {t("leaderboards.col_store")}
          </TableHead>
          {type === "top" ? (
            <>
              <TableHead className="text-right hidden sm:table-cell">
                {t("leaderboards.col_tasks")}
              </TableHead>
              <TableHead className="text-right">
                {t("leaderboards.col_completion")}
              </TableHead>
              <TableHead className="text-right">
                {t("leaderboards.col_score")}
              </TableHead>
            </>
          ) : (
            <>
              <TableHead className="text-right hidden sm:table-cell">
                {t("leaderboards.col_returns")}
              </TableHead>
              <TableHead className="text-right">
                {t("leaderboards.col_completion")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("leaderboards.col_strength")}
              </TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {performers.map((p, index) => {
          const rank = index + 1;
          const isTopThree = type === "top" && rank <= 3;
          const nameParts = p.user_name.split(" ");
          const user = {
            first_name: nameParts[1] ?? "—",
            last_name: nameParts[0] ?? "—",
            middle_name: nameParts[2],
            position_name: p.store_name,
          };

          return (
            <TableRow
              key={p.user_id}
              className={cn(
                "cursor-pointer hover:bg-accent/50 transition-colors",
                type === "support" && "bg-warning/5 hover:bg-warning/10"
              )}
              onClick={(e) => {
                const path = ADMIN_ROUTES.employeeDetail(String(p.user_id));
                if (e.metaKey || e.ctrlKey) {
                  window.open(path, "_blank");
                } else {
                  router.push(path as never);
                }
              }}
            >
              <TableCell>
                <span
                  className={cn(
                    "text-base font-semibold w-8 inline-block text-center",
                    isTopThree ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {rank}
                </span>
              </TableCell>
              <TableCell>
                <UserCell user={user} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[160px] truncate">
                {p.store_name}
              </TableCell>
              {type === "top" ? (
                <>
                  <TableCell className="text-right text-sm hidden sm:table-cell">
                    {p.tasks_completed}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {p.completion_rate}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-primary">
                      {p.rating.toFixed(1)}
                    </span>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-right text-sm hidden sm:table-cell">
                    <span className="text-warning font-medium">
                      {Math.round(
                        p.tasks_completed * ((100 - p.completion_rate) / 100)
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {p.completion_rate}%
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {getBestWorkType(p.user_id)}
                    </Badge>
                  </TableCell>
                </>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
