import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { FreelanceApplication } from "@/lib/types";

import { formatRelativeDate } from "./_shared";

export function PendingApplicationRow({ app }: { app: FreelanceApplication }) {
  return (
    <Link
      href={ADMIN_ROUTES.freelanceApplicationDetail(app.id)}
      className="flex items-start justify-between gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {app.store_name}
          </span>
          {app.urgent && (
            <Badge variant="destructive" className="shrink-0 text-xs h-5">
              Срочно
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{app.work_type_name}</span>
          <span>·</span>
          <span>{app.requested_hours} ч</span>
          <span>·</span>
          <span>{formatRelativeDate(app.planned_date)}</span>
        </div>
        <span className="text-xs text-muted-foreground">{app.created_by_name}</span>
      </div>
      <ChevronRight
        className="size-4 text-muted-foreground shrink-0 mt-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
