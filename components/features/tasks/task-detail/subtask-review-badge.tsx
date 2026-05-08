import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OperationReviewState } from "@/lib/types"

interface SubtaskReviewBadgeProps {
  state: OperationReviewState
}

export function SubtaskReviewBadge({ state }: SubtaskReviewBadgeProps) {
  const styles: Record<OperationReviewState, string> = {
    PENDING: "bg-warning/10 text-warning border-warning/20",
    ACCEPTED: "bg-success/10 text-success border-success/20",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  }
  const labels: Record<OperationReviewState, string> = {
    PENDING: "На проверке",
    ACCEPTED: "Принята",
    REJECTED: "Отклонена",
  }
  return (
    <Badge className={cn("text-xs", styles[state])}>
      {labels[state]}
    </Badge>
  )
}
