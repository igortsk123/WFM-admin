import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface EntityBadgeItem {
  label: string
  variant?: "default" | "secondary" | "outline"
  className?: string
}

interface EntitySummaryCardProps {
  title: string
  subtitle?: string
  /** Status badge rendered with semantic colour */
  status?: {
    label: string
    className?: string
  }
  badges?: EntityBadgeItem[]
  avatar?: {
    src?: string
    fallback: string
  }
  link?: string
  className?: string
}

export function EntitySummaryCard({
  title,
  subtitle,
  status,
  badges = [],
  avatar,
  link,
  className,
}: EntitySummaryCardProps) {
  const inner = (
    <CardContent className="flex items-center gap-3 p-4">
      {avatar && (
        <Avatar className="size-10 shrink-0">
          {avatar.src && <AvatarImage src={avatar.src} alt={title} />}
          <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {title}
          </span>
          {status && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[11px] px-1.5 py-0", status.className)}
            >
              {status.label}
            </Badge>
          )}
        </div>

        {subtitle && (
          <span className="text-xs text-muted-foreground truncate">
            {subtitle}
          </span>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {badges.map((b, i) => (
              <Badge
                key={i}
                variant={b.variant ?? "secondary"}
                className={cn("text-[11px] px-1.5 py-0", b.className)}
              >
                {b.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {link && (
        <ChevronRight
          className="size-4 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
      )}
    </CardContent>
  )

  return (
    <Card
      className={cn(
        "rounded-xl overflow-hidden",
        link && "hover:bg-muted/40 transition-colors cursor-pointer",
        className
      )}
    >
      {link ? (
        <Link href={link} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </Card>
  )
}
