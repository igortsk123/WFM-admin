"use client";

import { useTranslations } from "next-intl";
import { UserCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const t = useTranslations("nav");
  const tRole = useTranslations("role");
  const { impersonatingUser, exitImpersonation, isImpersonating } = useAuth();

  if (!isImpersonating || !impersonatingUser) {
    return null;
  }

  const handleExit = () => {
    exitImpersonation();
    toast.success(t("returned_to_account"));
  };

  const userName = `${impersonatingUser.last_name} ${impersonatingUser.first_name[0]}.${
    impersonatingUser.middle_name ? ` ${impersonatingUser.middle_name[0]}.` : ""
  }`;

  const roleName = tRole(impersonatingUser.role, {
    defaultValue: impersonatingUser.role,
  });

  const storeName =
    impersonatingUser.stores.length > 0
      ? impersonatingUser.stores[0].name
      : impersonatingUser.organization.name;

  return (
    <div className="sticky top-0 z-50 flex h-10 items-center justify-between gap-4 border-b border-warning/30 bg-warning/10 px-4">
      <div className="flex items-center gap-2 text-sm">
        <UserCircle className="size-4 text-warning" />
        <span>
          {t("impersonating_as", { name: "" })}
          <strong className="font-medium">{userName}</strong>
          <span className="text-muted-foreground">
            {" "}
            ({roleName}, {storeName})
          </span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="h-7 gap-1.5 text-warning hover:text-warning hover:bg-warning/20"
      >
        <LogOut className="size-3.5" />
        {t("exit_impersonation")}
      </Button>
    </div>
  );
}
