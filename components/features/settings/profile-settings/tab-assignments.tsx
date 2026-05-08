"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { getMyAssignments } from "@/lib/api/users";
import type { Assignment } from "@/lib/types";

interface AssignmentsTabProps {
  userId: number;
}

export function AssignmentsTab({ userId }: AssignmentsTabProps) {
  const t = useTranslations("screen.profile");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    setLoadingAssignments(true);
    getMyAssignments(userId).then((res) => {
      setAssignments(res.data);
      setLoadingAssignments(false);
    });
  }, [userId]);

  const activeAssignment = assignments.find((a) => a.active);

  return (
    <div className="space-y-6">
      {loadingAssignments && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      )}
      {/* Current assignment */}
      {!loadingAssignments && activeAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.assignments.description")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Briefcase className="size-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {activeAssignment.position_name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeAssignment.store_name}
                </p>
                <div className="mt-2">
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    {activeAssignment.rank.name}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All assignments list */}
      {!loadingAssignments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.assignments.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("sections.assignments.no_assignments")}</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3",
                      a.active && "border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{a.position_name}</span>
                        {a.active && (
                          <Badge className="bg-success/10 text-success border-success/20 text-[11px]">
                            {t("sections.assignments.active_label")}
                          </Badge>
                        )}
                        {!a.active && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[11px]">
                            {t("sections.assignments.archived_label")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.store_name}</p>
                      <p className="text-xs text-muted-foreground">{a.rank.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
