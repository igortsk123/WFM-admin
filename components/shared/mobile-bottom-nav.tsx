"use client"

import { useTranslations } from "next-intl"
import { LayoutDashboard, CheckSquare, Target, Bell, User } from "lucide-react"
import { usePathname } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  key: string
  href: string
  icon: React.ElementType
  navKey: keyof ReturnType<typeof useTranslations<"nav">>
  showBadge?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, navKey: "dashboard" },
  { key: "tasks", href: "/tasks", icon: CheckSquare, navKey: "tasks" },
  { key: "goals", href: "/goals", icon: Target, navKey: "goals" },
  { key: "notifications", href: "/notifications", icon: Bell, navKey: "notifications", showBadge: true },
  { key: "profile", href: "/settings/profile", icon: User, navKey: "settings" },
]

interface MobileBottomNavProps {
  unreadCount?: number
}

export function MobileBottomNav({ unreadCount = 0 }: MobileBottomNavProps) {
  const t = useTranslations("nav")
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 md:hidden"
    >
      <ul className="flex h-full">
        {NAV_ITEMS.map(({ key, href, icon: Icon, navKey, showBadge }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 relative",
                  "min-h-[44px] transition-colors",
                  isActive
                    ? "text-primary border-t-2 border-primary -mt-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden="true" />
                  {showBadge && unreadCount > 0 && (
                    <Badge
                      className="absolute -top-1.5 -right-1.5 size-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0"
                      aria-label={`${unreadCount} unread`}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-tight">{t(navKey as never)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
