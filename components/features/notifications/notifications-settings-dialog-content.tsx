"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getPreferences,
  updatePreferences,
} from "@/lib/api/notifications";
import type { NotificationCategory } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface NotificationsSettingsDialogContentProps {
  onOpenChange: (open: boolean) => void;
}

// Simplified preferences for this UI — maps to NotificationPreferences
interface UIPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  category_email: Record<string, boolean>;
  category_push: Record<string, boolean>;
  category_in_app: Record<string, boolean>;
}

const SETTINGS_CATEGORIES: NotificationCategory[] = [
  "TASK_REVIEW",
  "TASK_REJECTED",
  "TASK_STATE_CHANGED",
  "GENERIC",
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function NotificationsSettingsDialogContent({
  onOpenChange,
}: NotificationsSettingsDialogContentProps) {
  const t = useTranslations("screen.notifications");
  const tCat = useTranslations("screen.notifications.category");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState<UIPreferences>({
    push_enabled: true,
    email_enabled: true,
    in_app_enabled: true,
    category_email: Object.fromEntries(SETTINGS_CATEGORIES.map((c) => [c, true])),
    category_push: Object.fromEntries(SETTINGS_CATEGORIES.map((c) => [c, true])),
    category_in_app: Object.fromEntries(SETTINGS_CATEGORIES.map((c) => [c, true])),
  });

  React.useEffect(() => {
    getPreferences().then((res) => {
      if (res.data) {
        const blocked = res.data.blocked_categories ?? [];
        setPrefs((prev) => ({
          ...prev,
          push_enabled: res.data.push_enabled,
          category_push: Object.fromEntries(
            SETTINGS_CATEGORIES.map((c) => [c, !blocked.includes(c)])
          ),
          category_email: Object.fromEntries(
            SETTINGS_CATEGORIES.map((c) => [c, !blocked.includes(c)])
          ),
          category_in_app: Object.fromEntries(
            SETTINGS_CATEGORIES.map((c) => [c, true])
          ),
        }));
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const blockedCategories = SETTINGS_CATEGORIES.filter(
        (c) => !prefs.category_in_app[c]
      ) as NotificationCategory[];
      await updatePreferences({
        push_enabled: prefs.push_enabled,
        blocked_categories: blockedCategories,
      });
      toast.success(t("toasts.preferences_saved"));
      onOpenChange(false);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(key: keyof UIPreferences, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategoryChannel(
    channel: "category_email" | "category_push" | "category_in_app",
    category: string,
    value: boolean
  ) {
    setPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [category]: value },
    }));
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t("preferences_sheet.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("preferences_sheet.title")}
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <div className="space-y-4 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="channels" className="mt-1">
          <TabsList className="w-full">
            <TabsTrigger value="channels" className="flex-1">
              Каналы
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-1">
              Категории
            </TabsTrigger>
          </TabsList>

          {/* ── Channels tab ─────────────────────────────────── */}
          <TabsContent value="channels" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="pref-push" className="text-sm font-medium">
                  {t("preferences_sheet.push_enabled_label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("preferences_sheet.push_enabled_hint")}
                </p>
              </div>
              <Switch
                id="pref-push"
                checked={prefs.push_enabled}
                onCheckedChange={(v) => toggleChannel("push_enabled", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="pref-email" className="text-sm font-medium">
                  Email
                </Label>
                <p className="text-xs text-muted-foreground">
                  Получать уведомления по электронной почте
                </p>
              </div>
              <Switch
                id="pref-email"
                checked={prefs.email_enabled}
                onCheckedChange={(v) => toggleChannel("email_enabled", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="pref-inapp" className="text-sm font-medium">
                  В приложении
                </Label>
                <p className="text-xs text-muted-foreground">
                  Уведомления внутри WFM Admin
                </p>
              </div>
              <Switch
                id="pref-inapp"
                checked={prefs.in_app_enabled}
                onCheckedChange={(v) => toggleChannel("in_app_enabled", v)}
              />
            </div>
          </TabsContent>

          {/* ── Categories tab ───────────────────────────────── */}
          <TabsContent value="categories" className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t("preferences_sheet.categories_section_hint")}
            </p>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                        Категория
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
                        Email
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
                        Push
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
                        В приложении
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SETTINGS_CATEGORIES.map((cat, i) => (
                      <React.Fragment key={cat}>
                        <tr className="bg-card">
                          <td className="py-3 px-4 font-medium text-foreground">
                            {tCat(cat as Parameters<typeof tCat>[0])}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Switch
                              checked={prefs.category_email[cat] ?? true}
                              onCheckedChange={(v) =>
                                toggleCategoryChannel("category_email", cat, v)
                              }
                              aria-label={`Email — ${tCat(cat as Parameters<typeof tCat>[0])}`}
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Switch
                              checked={prefs.category_push[cat] ?? true}
                              onCheckedChange={(v) =>
                                toggleCategoryChannel("category_push", cat, v)
                              }
                              aria-label={`Push — ${tCat(cat as Parameters<typeof tCat>[0])}`}
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Switch
                              checked={prefs.category_in_app[cat] ?? true}
                              onCheckedChange={(v) =>
                                toggleCategoryChannel("category_in_app", cat, v)
                              }
                              aria-label={`In-app — ${tCat(cat as Parameters<typeof tCat>[0])}`}
                            />
                          </td>
                        </tr>
                        {i < SETTINGS_CATEGORIES.length - 1 && (
                          <tr>
                            <td colSpan={4}>
                              <Separator />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {SETTINGS_CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <p className="text-sm font-medium">
                    {tCat(cat as Parameters<typeof tCat>[0])}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <Switch
                      checked={prefs.category_email[cat] ?? true}
                      onCheckedChange={(v) =>
                        toggleCategoryChannel("category_email", cat, v)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Push</span>
                    <Switch
                      checked={prefs.category_push[cat] ?? true}
                      onCheckedChange={(v) =>
                        toggleCategoryChannel("category_push", cat, v)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      В приложении
                    </span>
                    <Switch
                      checked={prefs.category_in_app[cat] ?? true}
                      onCheckedChange={(v) =>
                        toggleCategoryChannel("category_in_app", cat, v)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <DialogFooter className="mt-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          {t("preferences_sheet.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Сохранение..." : t("preferences_sheet.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
