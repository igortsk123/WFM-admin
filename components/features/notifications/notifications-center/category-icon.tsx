import * as React from "react";
import {
  Bell,
  Inbox,
  XCircle,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

import type { NotificationCategory } from "@/lib/types";

interface CategoryIconProps {
  category: NotificationCategory;
}

export function CategoryIcon({ category }: CategoryIconProps): React.ReactElement {
  switch (category) {
    case "TASK_REVIEW":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-info/10 text-info">
          <Inbox className="size-4" />
        </span>
      );
    case "TASK_REJECTED":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <XCircle className="size-4" />
        </span>
      );
    case "TASK_STATE_CHANGED":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-success/10 text-success">
          <CheckCircle2 className="size-4" />
        </span>
      );
    case "AI_SUGGESTION_NEW":
    case "AI_ANOMALY":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </span>
      );
    case "BONUS_AVAILABLE":
    case "GOAL_UPDATE":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-warning/10 text-warning">
          <AlertTriangle className="size-4" />
        </span>
      );
    default:
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Bell className="size-4" />
        </span>
      );
  }
}
