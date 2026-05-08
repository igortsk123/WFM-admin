"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ADMIN_ROUTES } from "@/lib/constants/routes";

export function NotificationsTab() {
  const t = useTranslations("screen.profile");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.notifications.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("sections.notifications.description")}
          </p>
          <Button variant="outline" onClick={() => router.push(ADMIN_ROUTES.notifications)}>
            <Bell className="mr-2 size-4" />
            {t("sections.notifications.go_to_notifications")}
            <ChevronRight className="ml-2 size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
