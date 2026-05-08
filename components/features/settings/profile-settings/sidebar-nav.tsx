"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User as UserIcon,
  Lock,
  Bell,
  Briefcase,
  Palette,
  LogOut,
  Building2,
  ChevronRight,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { Section } from "./_shared";

interface SidebarNavProps {
  activeSection: Section;
  onSelect: (s: Section) => void;
  onLogout: () => void;
  availableSections: Section[];
}

export function SidebarNav({
  activeSection,
  onSelect,
  onLogout,
  availableSections,
}: SidebarNavProps) {
  const t = useTranslations("screen.profile");
  const router = useRouter();

  const allItems: { id: Section; icon: React.ElementType; label: string; href?: string }[] = [
    { id: "profile", icon: UserIcon, label: t("sidebar.profile") },
    { id: "security", icon: Lock, label: t("sidebar.security") },
    {
      id: "notifications",
      icon: Bell,
      label: t("sidebar.notifications"),
      href: ADMIN_ROUTES.notifications,
    },
    { id: "assignments", icon: Briefcase, label: t("sidebar.assignments") },
    { id: "appearance", icon: Palette, label: t("sidebar.appearance") },
    { id: "organizations", icon: Building2, label: t("platform_admin.title") },
  ];
  const items = allItems.filter((it) => availableSections.includes(it.id));

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ id, icon: Icon, label, href }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            if (href) {
              router.push(href);
            } else {
              onSelect(id);
            }
          }}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left",
            activeSection === id && !href
              ? "bg-accent text-accent-foreground border-l-2 border-primary pl-[10px]"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
          {href && <ChevronRight className="ml-auto size-3.5 opacity-50" />}
        </button>
      ))}
      <Separator className="my-2" />
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
      >
        <LogOut className="size-4 shrink-0" />
        {t("sidebar.logout")}
      </button>
    </nav>
  );
}
