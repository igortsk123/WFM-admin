import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
        className
      )}
    >
      <span
        className="flex size-16 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
      </span>

      <div className="flex flex-col gap-1 max-w-xs">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {action && (
        action.href ? (
          <Button asChild size="sm" className="mt-1">
            <a href={action.href}>
              {action.icon && <action.icon className="size-4" aria-hidden="true" />}
              {action.label}
            </a>
          </Button>
        ) : (
          <Button size="sm" onClick={action.onClick} className="mt-1">
            {action.icon && <action.icon className="size-4" aria-hidden="true" />}
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
