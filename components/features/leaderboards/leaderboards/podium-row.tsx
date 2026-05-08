import { Crown, Medal } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/api/leaderboards";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

import { getInitials, getShortName } from "./_shared";

function PodiumCard({
  entry,
  place,
  onClick,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  onClick?: () => void;
}) {
  const isFirst = place === 1;
  const isSecond = place === 2;

  const cardClass = isFirst
    ? "bg-warning/10 border-warning/30 h-40"
    : isSecond
    ? "bg-muted/50 border-muted-foreground/30 h-32"
    : "bg-warning/5 border-warning/20 h-28";

  const avatarSize = isFirst ? "size-14" : "size-10";
  const scoreClass = isFirst ? "text-3xl" : isSecond ? "text-xl" : "text-lg";

  return (
    <Card
      className={`relative flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-md transition-shadow border ${cardClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        {isFirst ? (
          <Crown className="size-4 text-warning" />
        ) : (
          <Medal
            className={`size-3.5 ${isSecond ? "text-muted-foreground" : "text-warning/60"}`}
          />
        )}
      </div>
      <Avatar className={`${avatarSize} mt-4`}>
        <AvatarFallback
          className={`text-sm font-semibold ${
            isFirst
              ? "bg-warning/20 text-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {getInitials(entry.entity_name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-center leading-tight px-1 truncate w-full text-center">
        {getShortName(entry.entity_name)}
      </span>
      <span className={`${scoreClass} font-bold text-foreground`}>
        {entry.points.toLocaleString("ru-RU")}
      </span>
    </Card>
  );
}

export function PodiumRow({
  entries,
  onItemClick,
}: {
  entries: LeaderboardEntry[];
  onItemClick?: (e: LeaderboardEntry) => void;
}) {
  if (entries.length < 3) return null;
  // Render order: 2nd | 1st | 3rd
  const display = [entries[1], entries[0], entries[2]] as const;
  const places = [2, 1, 3] as const;

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {display.map((entry, i) => (
        <PodiumCard
          key={entry.entity_id}
          entry={entry}
          place={places[i]}
          onClick={() => onItemClick?.(entry)}
        />
      ))}
    </div>
  );
}
