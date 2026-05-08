import type { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiPerformer } from "@/lib/api/reports";

import { LeaderboardTable } from "./leaderboard-table";

interface LeaderboardsSectionProps {
  t: ReturnType<typeof useTranslations>;
  topPerformers: KpiPerformer[];
  needsSupport: KpiPerformer[];
}

export function LeaderboardsSection({
  t,
  topPerformers,
  needsSupport,
}: LeaderboardsSectionProps) {
  return (
    <section aria-label={t("sections.leaderboards")}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {t("leaderboards.top_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <LeaderboardTable
                performers={topPerformers.slice(0, 10)}
                type="top"
                t={t}
              />
            </div>
          </CardContent>
        </Card>

        {/* Needs support */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {t("leaderboards.support_title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("leaderboards.support_hint")}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <LeaderboardTable
                performers={needsSupport}
                type="support"
                t={t}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
