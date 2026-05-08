import { Badge } from "@/components/ui/badge";
import type { GoalCategory } from "@/lib/types";
import { CATEGORY_ICONS, type GoalsT } from "./_shared";

export function CategoryBadge({ category, t }: { category: GoalCategory; t: GoalsT }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="size-3" />
      {t(`category.${category}` as Parameters<typeof t>[0])}
    </Badge>
  );
}
