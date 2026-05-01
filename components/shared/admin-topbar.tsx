"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
  UserCircle,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";
import type { FunctionalRole, Store, Organization } from "@/lib/types";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LanguageSwitcher } from "./language-switcher";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// SCOPE SWITCHER
// ═══════════════════════════════════════════════════════════════════

interface ScopeSwitcherProps {
  role: FunctionalRole;
  stores: Store[];
  organization: Organization;
}

function ScopeSwitcher({ role, stores, organization }: ScopeSwitcherProps) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<string | null>(null);

  // Determine scope type based on role
  const getScopeOptions = () => {
    switch (role) {
      case "NETWORK_OPS":
      case "OPERATOR":
      case "HR_MANAGER":
      case "PLATFORM_ADMIN":
        // Organization picker
        return {
          type: "organization" as const,
          label: organization.name,
          options: MOCK_ORGANIZATIONS.map((org) => ({
            value: org.id,
            label: org.name,
          })),
        };
      case "REGIONAL":
        // Region picker
        const regions = [...new Set(stores.map((s) => s.region))];
        return {
          type: "region" as const,
          label: regions[0] || "Region",
          options: regions.map((region) => ({
            value: region,
            label: region,
          })),
        };
      case "SUPERVISOR":
        // Store picker with "All my" option
        return {
          type: "store" as const,
          label: selectedScope
            ? stores.find((s) => s.id.toString() === selectedScope)?.name ||
              t("scope_all_my")
            : t("scope_all_my"),
          options: [
            { value: "all", label: t("scope_all_my") },
            ...stores.map((store) => ({
              value: store.id.toString(),
              label: store.name,
            })),
          ],
        };
      case "STORE_DIRECTOR":
        // Single store — disabled
        return {
          type: "store" as const,
          label: stores[0]?.name || "Store",
          options: [],
          disabled: true,
        };
      default:
        return null;
    }
  };

  const scopeConfig = getScopeOptions();

  if (!scopeConfig) {
    return null;
  }

  if (scopeConfig.disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
        <span className="text-sm font-medium truncate max-w-[200px]">
          {scopeConfig.label}
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-auto justify-between gap-2 h-9"
        >
          <span className="truncate max-w-[180px] text-sm">
            {scopeConfig.label}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${scopeConfig.type}...`} />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup>
              {scopeConfig.options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(value) => {
                    setSelectedScope(value === selectedScope ? null : value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      selectedScope === option.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS DROPDOWN
// ═══════════════════════════════════════════════════════════════════

function NotificationsDropdown() {
  const t = useTranslations("notification");
  const tNav = useTranslations("nav");
  const { unreadNotificationsCount } = useAuth();

  // Mock notifications
  const mockNotifications = [
    {
      id: "1",
      title: "Новая задача на проверке",
      body: "Задача «Выкладка молочной продукции» отправлена на проверку",
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Предложение ИИ",
      body: "Рекомендуем создать задачу на переоценку товаров",
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "3",
      title: "Цель достигнута",
      body: "Цель «Снижение OOS на 5%» выполнена на 102%",
      is_read: true,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="size-5" />
          {unreadNotificationsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
            </Badge>
          )}
          <span className="sr-only">{t("titlePlural")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t("titlePlural")}</span>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
            {t("markAllAsRead")}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockNotifications.slice(0, 5).map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex flex-col items-start gap-1 p-3 cursor-pointer"
          >
            <div className="flex items-start gap-2 w-full">
              {!notification.is_read && (
                <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    !notification.is_read && "font-semibold"
                  )}
                >
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.body}
                </p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={ADMIN_ROUTES.notifications}
            className="flex items-center justify-center text-sm font-medium"
          >
            {tNav("view_all")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════════
// USER MENU
// ═══════════════════════════════════════════════════════════════════

function UserMenu() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tRole = useTranslations("role");
  const { user } = useAuth();
  const router = useRouter();

  const canImpersonate =
    user.role === "NETWORK_OPS" ||
    user.role === "HR_MANAGER" ||
    user.role === "PLATFORM_ADMIN";

  const initials = `${user.first_name[0]}${user.last_name[0]}`;
  const fullName = `${user.last_name} ${user.first_name}${
    user.middle_name ? ` ${user.middle_name}` : ""
  }`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="size-9">
            <AvatarImage src={user.avatar_url} alt={fullName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            <p className="text-xs text-muted-foreground">
              {tRole(user.role, { defaultValue: user.role })}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ADMIN_ROUTES.settingsProfile}>
            <User className="mr-2 size-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        {canImpersonate && (
          <DropdownMenuItem onSelect={() => router.push(ADMIN_ROUTES.employees)}>
            <UserCircle className="mr-2 size-4" />
            {tNav("view_as_user")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN TOPBAR
// ═══════════════════════════════════════════════════════════════════

export function AdminTopBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6">
      {/* Left: Sidebar trigger */}
      <SidebarTrigger className="-ml-1" />

      {/* Center: Scope switcher (hidden on small screens) */}
      <div className="hidden sm:flex flex-1 items-center justify-center">
        <ScopeSwitcher
          role={user.role}
          stores={user.stores}
          organization={user.organization}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Language switcher - compact on mobile, full on desktop */}
        <LanguageSwitcher variant="compact" className="sm:hidden" />
        <LanguageSwitcher variant="full" className="hidden sm:flex" />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
