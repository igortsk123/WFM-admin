"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth-context";

const SESSION_KEY = "wfm-platform-admin-banner-dismissed";

/**
 * Sticky informational banner shown to PLATFORM_ADMIN users.
 * Rendered below the TopBar. Dismissible per session (sessionStorage).
 */
export function PlatformAdminBanner() {
  const t = useTranslations("screen.platform_admin_banner");
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    if (user.role !== "PLATFORM_ADMIN") return;
    const isDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    setDismissed(isDismissed);
  }, [user.role]);

  if (user.role !== "PLATFORM_ADMIN" || dismissed) {
    return null;
  }

  function handleDismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="banner"
      className="flex w-full items-center justify-between gap-3 bg-primary px-4 py-2 text-primary-foreground"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="size-4 shrink-0" />
        <span>{t("text")}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("dismiss")}
        onClick={handleDismiss}
        className="size-7 shrink-0 hover:bg-primary-foreground/10 text-primary-foreground"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
