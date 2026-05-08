import { Badge } from "@/components/ui/badge"

interface ContractBadgeProps {
  signedAt?: string | null
}

export function ContractBadge({ signedAt }: ContractBadgeProps) {
  if (signedAt) {
    return (
      <Badge className="bg-success/10 text-success border-0 text-xs font-medium">
        Подписан
      </Badge>
    )
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-0 text-xs font-medium">
      Не подписан
    </Badge>
  )
}
