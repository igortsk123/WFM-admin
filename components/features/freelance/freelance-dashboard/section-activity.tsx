"use client";

import { ChevronRight, Inbox, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { FreelanceApplication, FreelancerAssignment } from "@/lib/types";

import { MOCK_TODAY_ISO } from "./_shared";
import { PendingApplicationRow } from "./row-pending-application";
import { TodayAssignmentRow } from "./row-today-assignment";

interface ActivitySectionProps {
  pendingApps: FreelanceApplication[];
  pendingTotal: number;
  todayAssignments: FreelancerAssignment[];
}

export function ActivitySection({
  pendingApps,
  pendingTotal,
  todayAssignments,
}: ActivitySectionProps) {
  return (
    <section aria-label="Свежая активность">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Pending applications */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">На согласовании</CardTitle>
              {pendingTotal > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingTotal}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingApps.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState
                  icon={Inbox}
                  title="Нет заявок на согласовании"
                  description=""
                />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border" role="list">
                  {pendingApps.map((app) => (
                    <li key={app.id} role="listitem">
                      <PendingApplicationRow app={app} />
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border px-4 py-3">
                  <Link
                    href={`${ADMIN_ROUTES.freelanceApplications}?status=PENDING`}
                    className="flex items-center justify-between text-sm text-primary hover:underline"
                  >
                    <span>Все на согласовании ({pendingTotal})</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Today's assignments */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Сегодня на объектах</CardTitle>
              {todayAssignments.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {todayAssignments.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {todayAssignments.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState
                  icon={MapPin}
                  title="Сегодня нет выходов"
                  description="Нет запланированных исполнителей на сегодня."
                />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border" role="list">
                  {todayAssignments.map((a) => (
                    <li key={a.id} role="listitem">
                      <TodayAssignmentRow assignment={a} />
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border px-4 py-3">
                  <Link
                    href={`${ADMIN_ROUTES.freelanceServices}?date_from=${MOCK_TODAY_ISO}&date_to=${MOCK_TODAY_ISO}`}
                    className="flex items-center justify-between text-sm text-primary hover:underline"
                  >
                    <span>Все услуги сегодня</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
