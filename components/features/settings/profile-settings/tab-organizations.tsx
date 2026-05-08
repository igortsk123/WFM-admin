"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { CurrentUser } from "@/lib/api/auth";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

interface OrganizationsTabProps {
  user: CurrentUser;
}

export function OrganizationsTab({ user }: OrganizationsTabProps) {
  const t = useTranslations("screen.profile");
  const orgs = MOCK_ORGANIZATIONS;
  const currentOrgId = user.organization_id;

  function handleSwitchOrg(orgId: string) {
    const orgName = orgs.find((o) => o.id === orgId)?.name ?? orgId;
    toast.success(`${t("toasts.org_switched")} — ${orgName}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base">{t("platform_admin.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("platform_admin.description")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => {
              const isCurrent = org.id === currentOrgId;
              return (
                <div
                  key={org.id}
                  className={cn(
                    "relative flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                    isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  {isCurrent && (
                    <Badge className="absolute right-3 top-3 text-[11px] px-1.5 py-0 bg-primary text-primary-foreground">
                      {t("platform_admin.current_org_label")}
                    </Badge>
                  )}
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="size-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold leading-tight">{org.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0">
                        {org.payment_mode === "NOMINAL_ACCOUNT"
                          ? t("platform_admin.payment_mode_nominal")
                          : t("platform_admin.payment_mode_client_direct")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-1.5 py-0",
                          org.freelance_module_enabled
                            ? "border-success/40 text-success bg-success/5"
                            : "text-muted-foreground"
                        )}
                      >
                        {org.freelance_module_enabled
                          ? t("platform_admin.freelance_enabled")
                          : t("platform_admin.freelance_disabled")}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant={isCurrent ? "secondary" : "outline"}
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => handleSwitchOrg(org.id)}
                    disabled={isCurrent}
                  >
                    {t("platform_admin.switch_to_org")}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
