import { TrendingUp, TrendingDown, Minus, Flame } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { getInitials } from "./_shared";

export function TrendIcon({
  trend,
  positions,
}: {
  trend: "up" | "down" | "stable";
  positions: number;
}) {
  if (trend === "up")
    return (
      <span className="flex items-center gap-0.5 text-success text-xs font-medium">
        <TrendingUp className="size-3.5" />
        {positions > 0 && `+${positions}`}
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-xs font-medium">
        <TrendingDown className="size-3.5" />
        {positions > 0 && `−${positions}`}
      </span>
    );
  return (
    <span className="flex items-center text-muted-foreground text-xs">
      <Minus className="size-3.5" />
    </span>
  );
}

export function StreakBadge({ days }: { days?: number }) {
  if (!days || days <= 7) return null;
  const display = days >= 30 ? "30+" : String(days);
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <Flame className="size-3.5" />
      {display}
    </span>
  );
}

export function AvatarGroupRow({
  members,
  total,
}: {
  members: Array<{ user_id: number; user_name: string }>;
  total: number;
}) {
  const visible = members.slice(0, 4);
  const extra = total - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <Avatar
          key={m.user_id}
          className="size-6 border-2 border-background"
          style={{ marginLeft: i > 0 ? -8 : 0 }}
        >
          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
            {getInitials(m.user_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}
