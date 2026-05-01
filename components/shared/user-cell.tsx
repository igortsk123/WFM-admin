import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserCellUser {
  first_name: string
  last_name: string
  middle_name?: string
  avatar_url?: string
  position_name?: string
}

interface UserCellProps {
  user: UserCellUser
  className?: string
}

function getInitials(user: UserCellUser): string {
  return `${user.last_name.charAt(0)}${user.first_name.charAt(0)}`.toUpperCase()
}

function getFullName(user: UserCellUser): string {
  const parts = [user.last_name, user.first_name]
  if (user.middle_name) parts.push(user.middle_name)
  return parts.join(" ")
}

export function UserCell({ user, className }: UserCellProps) {
  const fullName = getFullName(user)

  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={user.avatar_url} alt={fullName} />
        <AvatarFallback className="text-xs font-medium bg-accent text-accent-foreground">
          {getInitials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-foreground truncate leading-tight">
          {fullName}
        </span>
        {user.position_name && (
          <span className="text-xs text-muted-foreground truncate leading-tight">
            {user.position_name}
          </span>
        )}
      </div>
    </div>
  )
}
