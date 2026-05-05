"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { NotificationCategory } from "@/lib/types";
import {
  getPreferences,
  updatePreferences,
} from "@/lib/api/notifications";
import { CATEGORY_CONFIG } from "./notification-category-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type CategoryGroup = "tasks" | "freelance" | "ai" | "other";

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as NotificationCategory[];

function groupedCategories(): Record<CategoryGroup, NotificationCategory[]> {
  const groups: Record<CategoryGroup, NotificationCategory[]> = {
    tasks: [],
    freelance: [],
    ai: [],
    other: [],
  };
  for (const cat of ALL_CATEGORIES) {
    groups[CATEGORY_CONFIG[cat].group].push(cat);
  }
  return groups;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface NotificationPreferencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesSheet({
  open,
  onOpenChange,
}: NotificationPreferencesSheetProps) {
  const t = useTranslations("screen.notifications");
  const tCat = useTranslations("screen.notifications.category");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  /** Set of categories that are BLOCKED (disabled) */
  const [blocked, setBlocked] = useState<Set<NotificationCategory>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getPreferences()
      .then((res) => {
        if (res.data) {
          setPushEnabled(res.data.push_enabled);
          setBlocked(new Set(res.data.blocked_categories));
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleToggleCategory = (cat: NotificationCategory) => {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        push_enabled: pushEnabled,
        blocked_categories: Array.from(blocked),
      });
      toast.success(t("toasts.preferences_saved"));
      onOpenChange(false);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  };

  const groups = groupedCategories();
  const groupLabels: Record<CategoryGroup, string> = {
    tasks: t("filters.category_group_tasks"),
    freelance: t("filters.category_group_freelance"),
    ai: t("filters.category_group_ai"),
    other: t("filters.category_group_other"),
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("preferences_sheet.title")}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 space-y-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mt-4 space-y-6">
            {/* Push toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label
                  htmlFor="push-enabled"
                  className="text-sm font-medium"
                >
                  {t("preferences_sheet.push_enabled_label")}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("preferences_sheet.push_enabled_hint")}
                </p>
              </div>
              <Switch
                id="push-enabled"
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
              />
            </div>

            <Separator />

            {/* Per-category toggles */}
            <div>
              <p className="text-sm font-medium mb-0.5">
                {t("preferences_sheet.categories_section")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("preferences_sheet.categories_section_hint")}
              </p>

              <div className="space-y-5">
                {(["tasks", "freelance", "ai", "other"] as CategoryGroup[]).map(
                  (groupKey) => (
                    <div key={groupKey}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {groupLabels[groupKey]}
                      </p>
                      <div className="space-y-2">
                        {groups[groupKey].map((cat) => {
                          const Icon = CATEGORY_CONFIG[cat].icon;
                          const enabled = !blocked.has(cat);
                          return (
                            <div
                              key={cat}
                              className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="size-4 shrink-0 text-muted-foreground" />
                                <Label
                                  htmlFor={`cat-${cat}`}
                                  className="text-sm cursor-pointer truncate"
                                >
                                  {tCat(cat)}
                                </Label>
                              </div>
                              <Switch
                                id={`cat-${cat}`}
                                checked={enabled}
                                onCheckedChange={() => handleToggleCategory(cat)}
                                className="shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="mt-4 gap-2 flex-row justify-end">
          <SheetClose asChild>
            <Button variant="outline" disabled={saving}>
              {t("preferences_sheet.cancel")}
            </Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("preferences_sheet.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
