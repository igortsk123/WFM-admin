"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/contexts/auth-context";
import type { FunctionalRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ALL_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "WORKER",
  "AGENT",
  "PLATFORM_ADMIN",
];

export function RoleSwitcher() {
  const t = useTranslations("role");
  const { user, switchRole } = useAuth();
  const [open, setOpen] = useState(false);

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleRoleChange = (role: FunctionalRole) => {
    switchRole(role);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-auto gap-2 rounded-full border-dashed border-primary/50 bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm hover:bg-background"
          >
            <span className="text-xs text-muted-foreground">DEV</span>
            <Badge variant="secondary" className="font-medium">
              {t(user.role as Parameters<typeof t>[0])}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          className="w-64"
          sideOffset={8}
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Switch Role</h4>
              <p className="text-xs text-muted-foreground">
                Dev-only role switcher for testing
              </p>
            </div>
            <RadioGroup
              value={user.role}
              onValueChange={(value) =>
                handleRoleChange(value as FunctionalRole)
              }
              className="space-y-2"
            >
              {ALL_ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <RadioGroupItem value={role} id={`role-${role}`} />
                  <Label
                    htmlFor={`role-${role}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {t(role as Parameters<typeof t>[0])}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
