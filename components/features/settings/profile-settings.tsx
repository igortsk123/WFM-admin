"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  User,
  Lock,
  Bell,
  Palette,
  LogOut,
  Shield,
  Building2,
  ChevronRight,
  CheckCircle2,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Clock,
  Monitor,
  Sun,
  Moon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/contexts/auth-context";
import {
  updateProfile,
  changePassword,
  setupTotp,
  disableTotp,
  updateUserLocale,
} from "@/lib/api/auth";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";
import type { FunctionalRole } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type Section =
  | "profile"
  | "security"
  | "notifications"
  | "assignments"
  | "appearance"
  | "organizations";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getSectionsForRole(role: FunctionalRole): Section[] {
  switch (role) {
    case "AGENT":
      return ["profile", "notifications", "appearance"];
    case "PLATFORM_ADMIN":
      return ["profile", "security", "notifications", "assignments", "appearance", "organizations"];
    default:
      return ["profile", "security", "notifications", "assignments", "appearance"];
  }
}

const TIMEZONES = [
  "Europe/Moscow",
  "Europe/London",
  "Asia/Tomsk",
  "Asia/Novosibirsk",
  "Asia/Yekaterinburg",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Vladivostok",
];

// Notification categories relevant per role
const AGENT_NOTIFICATION_CATEGORIES = [
  "FREELANCE_PAYOUT_DONE",
  "FREELANCE_NO_SHOW",
] as const;

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// ── Save bar ──────────────────────────────────────────────────────

interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
}

function SaveBar({ dirty, saving, onSave, onCancel, t }: SaveBarProps) {
  if (!dirty) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("save_bar.dirty_message")}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            {t("save_bar.cancel")}
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "..." : t("save_bar.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Profile section ───────────────────────────────────────────────

interface ProfileSectionProps {
  t: ReturnType<typeof useTranslations>;
  isAgent: boolean;
}

function ProfileSection({ t, isAgent }: ProfileSectionProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = React.useState(user.first_name);
  const [lastName, setLastName] = React.useState(user.last_name);
  const [middleName, setMiddleName] = React.useState(user.middle_name ?? "");
  const [phone, setPhone] = React.useState(user.phone);
  const [email, setEmail] = React.useState(user.email ?? "");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  function handleChange<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (val: T) => {
      setter(val);
      setDirty(true);
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone,
      });
      if (res.success) {
        toast.success(t("toasts.saved" as Parameters<typeof t>[0]));
        setDirty(false);
      } else {
        toast.error(res.error?.message ?? t("toasts.error" as Parameters<typeof t>[0]));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setMiddleName(user.middle_name ?? "");
    setPhone(user.phone);
    setEmail(user.email ?? "");
    setDirty(false);
  }

  return (
    <div className="space-y-6">
      {isAgent && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {t("agent_specific.simplified_hint" as Parameters<typeof t>[0])}
          </p>
        </div>
      )}

      {/* Avatar */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.profile.avatar_card" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Camera className="size-4" />
                {t("sections.profile.avatar_upload" as Parameters<typeof t>[0])}
              </Button>
              {user.avatar_url && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="size-4" />
                  {t("sections.profile.avatar_remove" as Parameters<typeof t>[0])}
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("sections.profile.avatar_helper" as Parameters<typeof t>[0])}
          </p>
        </CardContent>
      </Card>

      {/* Personal data */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.profile.personal_card" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="prof-last-name">
                {t("sections.profile.last_name" as Parameters<typeof t>[0])}
              </Label>
              <Input
                id="prof-last-name"
                value={lastName}
                onChange={(e) => handleChange(setLastName)(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-first-name">
                {t("sections.profile.first_name" as Parameters<typeof t>[0])}
              </Label>
              <Input
                id="prof-first-name"
                value={firstName}
                onChange={(e) => handleChange(setFirstName)(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-middle-name">
                {t("sections.profile.middle_name" as Parameters<typeof t>[0])}
              </Label>
              <Input
                id="prof-middle-name"
                value={middleName}
                onChange={(e) => handleChange(setMiddleName)(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-phone">
                {t("sections.profile.phone" as Parameters<typeof t>[0])}
              </Label>
              <Input
                id="prof-phone"
                type="tel"
                value={phone}
                placeholder={t("sections.profile.phone_placeholder" as Parameters<typeof t>[0])}
                onChange={(e) => handleChange(setPhone)(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-email">
                {t("sections.profile.email" as Parameters<typeof t>[0])}
              </Label>
              <Input
                id="prof-email"
                type="email"
                value={email}
                disabled
                className="bg-muted/50"
                onChange={(e) => handleChange(setEmail)(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("sections.profile.email_locked_hint" as Parameters<typeof t>[0])}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
        t={t}
      />
    </div>
  );
}

// ── Security section ──────────────────────────────────────────────

function SecuritySection({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { user } = useAuth();
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [pwdSaving, setPwdSaving] = React.useState(false);
  const [totpLoading, setTotpLoading] = React.useState(false);

  async function handleChangePassword() {
    if (newPwd !== confirmPwd) {
      toast.error(t("validation.password_mismatch" as Parameters<typeof t>[0]));
      return;
    }
    if (newPwd.length < 8) {
      toast.error(t("validation.password_min" as Parameters<typeof t>[0]));
      return;
    }
    setPwdSaving(true);
    try {
      const res = await changePassword(currentPwd, newPwd);
      if (res.success) {
        toast.success(t("toasts.password_changed" as Parameters<typeof t>[0]));
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        toast.error(res.error?.message ?? t("toasts.error" as Parameters<typeof t>[0]));
      }
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleToggleTotp() {
    setTotpLoading(true);
    try {
      if (user.totp_enabled) {
        const res = await disableTotp("000000");
        if (res.success) toast.success(t("toasts.totp_disabled" as Parameters<typeof t>[0]));
      } else {
        await setupTotp();
        toast.success(t("toasts.totp_enabled" as Parameters<typeof t>[0]));
      }
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Password */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.security.password_card" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sec-current-pwd">
              {t("sections.security.current_password" as Parameters<typeof t>[0])}
            </Label>
            <div className="relative">
              <Input
                id="sec-current-pwd"
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sec-new-pwd">
                {t("sections.security.new_password" as Parameters<typeof t>[0])}
              </Label>
              <div className="relative">
                <Input
                  id="sec-new-pwd"
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-confirm-pwd">
                {t("sections.security.confirm_password" as Parameters<typeof t>[0])}
              </Label>
              <div className="relative">
                <Input
                  id="sec-confirm-pwd"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
            >
              {t("sections.security.password_change" as Parameters<typeof t>[0])}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TOTP */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.security.totp_card" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  user.totp_enabled
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Shield className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {user.totp_enabled
                    ? t("sections.security.totp_enabled" as Parameters<typeof t>[0])
                    : t("sections.security.totp_disabled" as Parameters<typeof t>[0])}
                </p>
                {user.totp_enabled && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {t("toasts.totp_enabled" as Parameters<typeof t>[0])}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={user.totp_enabled ? "outline" : "default"}
              size="sm"
              onClick={handleToggleTotp}
              disabled={totpLoading}
            >
              {user.totp_enabled
                ? t("sections.security.totp_disable" as Parameters<typeof t>[0])
                : t("sections.security.totp_setup" as Parameters<typeof t>[0])}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.security.sessions_card" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { device: "Chrome / Windows — Текущая", location: "Томск, Россия", current: true },
            { device: "Safari / iPhone 15 Pro", location: "Томск, Россия", current: false },
          ].map((session, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{session.device}</p>
                  {session.current && (
                    <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                      {t("sections.security.session_current" as Parameters<typeof t>[0])}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{session.location}</p>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  {t("sections.security.session_revoke" as Parameters<typeof t>[0])}
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full">
            {t("sections.security.session_revoke_all" as Parameters<typeof t>[0])}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Notifications section ─────────────────────────────────────────

function NotificationsSection({
  t,
  isAgent,
}: {
  t: ReturnType<typeof useTranslations>;
  isAgent: boolean;
}) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.notifications.title" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAgent && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {t("agent_specific.agent_notifications_hint" as Parameters<typeof t>[0])}
              </p>
            </div>
          )}

          {isAgent ? (
            <div className="space-y-3">
              {AGENT_NOTIFICATION_CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{cat === "FREELANCE_PAYOUT_DONE" ? "Выплаты исполнителям" : "Невыходы исполнителей"}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat === "FREELANCE_PAYOUT_DONE"
                        ? "Уведомления о проведённых выплатах"
                        : "Уведомления о невыходах исполнителей"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("sections.notifications.description" as Parameters<typeof t>[0])}
            </p>
          )}

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push("/notifications" as never)}
          >
            <Bell className="size-4" />
            {t("sections.notifications.go_to_notifications" as Parameters<typeof t>[0])}
            <ChevronRight className="size-4 ml-auto" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Assignments section ───────────────────────────────────────────

function AssignmentsSection({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.assignments.title" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("sections.assignments.description" as Parameters<typeof t>[0])}
          </p>
          {user.stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("sections.assignments.no_assignments" as Parameters<typeof t>[0])}
            </p>
          ) : (
            <div className="space-y-2">
              {user.stores.map((store, i) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.address}, {store.city}</p>
                  </div>
                  {i === 0 && (
                    <Badge variant="secondary" className="text-[11px] shrink-0">
                      {t("sections.assignments.active_label" as Parameters<typeof t>[0])}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Appearance section ────────────────────────────────────────────

function AppearanceSection({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { user } = useAuth();
  const locale = useLocale();
  const [language, setLanguage] = React.useState<string>(user.preferred_locale ?? locale ?? "ru");
  const [timezone, setTimezone] = React.useState<string>(
    user.preferred_timezone ?? "Europe/Moscow"
  );
  const [theme, setTheme] = React.useState<string>("system");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserLocale(language as "ru" | "en");
      await updateProfile({ preferred_timezone: timezone });
      toast.success(t("toasts.saved" as Parameters<typeof t>[0]));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.appearance.title" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Language */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Globe className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("sections.appearance.language" as Parameters<typeof t>[0])}
                </Label>
              </div>
            </div>
            <Select
              value={language}
              onValueChange={(v) => {
                setLanguage(v);
                setDirty(true);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">
                  {t("sections.appearance.language_ru" as Parameters<typeof t>[0])}
                </SelectItem>
                <SelectItem value="en">
                  {t("sections.appearance.language_en" as Parameters<typeof t>[0])}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Timezone */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Clock className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("sections.appearance.timezone" as Parameters<typeof t>[0])}
                </Label>
              </div>
            </div>
            <Select
              value={timezone}
              onValueChange={(v) => {
                setTimezone(v);
                setDirty(true);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Theme */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Monitor className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("sections.appearance.theme" as Parameters<typeof t>[0])}
                </Label>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[
                { value: "light", icon: Sun, label: t("sections.appearance.theme_light" as Parameters<typeof t>[0]) },
                { value: "dark", icon: Moon, label: t("sections.appearance.theme_dark" as Parameters<typeof t>[0]) },
                { value: "system", icon: Monitor, label: t("sections.appearance.theme_system" as Parameters<typeof t>[0]) },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTheme(value);
                    setDirty(true);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    theme === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                  )}
                  aria-pressed={theme === value}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onCancel={() => {
          setLanguage(user.preferred_locale ?? "ru");
          setTimezone(user.preferred_timezone ?? "Europe/Moscow");
          setTheme("system");
          setDirty(false);
        }}
        t={t}
      />
    </div>
  );
}

// ── Appearance section (Agent) ────────────────────────────────────

function AppearanceSectionAgent({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { user } = useAuth();
  const locale = useLocale();
  const [language, setLanguage] = React.useState<string>(user.preferred_locale ?? locale ?? "ru");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserLocale(language as "ru" | "en");
      toast.success(t("toasts.saved" as Parameters<typeof t>[0]));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sections.appearance.title" as Parameters<typeof t>[0])}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Globe className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t("sections.appearance.language" as Parameters<typeof t>[0])}
                </Label>
              </div>
            </div>
            <Select
              value={language}
              onValueChange={(v) => {
                setLanguage(v);
                setDirty(true);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">
                  {t("sections.appearance.language_ru" as Parameters<typeof t>[0])}
                </SelectItem>
                <SelectItem value="en">
                  {t("sections.appearance.language_en" as Parameters<typeof t>[0])}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onCancel={() => {
          setLanguage(user.preferred_locale ?? "ru");
          setDirty(false);
        }}
        t={t}
      />
    </div>
  );
}

// ── Platform Admin: Organizations section ────────────────────────

function OrganizationsSection({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { user } = useAuth();
  const orgs = MOCK_ORGANIZATIONS;

  function handleSwitchOrg(orgId: string) {
    // Mock: switch scope to target org — for M0 just shows a toast
    const orgName = orgs.find((o) => o.id === orgId)?.name ?? orgId;
    toast.success(t("toasts.org_switched" as Parameters<typeof t>[0]) + ` — ${orgName}`);
    // In real: would call an API to switch tenant scope then reload
    console.log(`[v0] PLATFORM_ADMIN switching to org: ${orgId}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {t("platform_admin.title" as Parameters<typeof t>[0])}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("platform_admin.description" as Parameters<typeof t>[0])}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => {
              const isCurrent = org.id === user.organization.id;
              return (
                <div
                  key={org.id}
                  className={cn(
                    "relative flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                    isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-border/80",
                  )}
                >
                  {isCurrent && (
                    <Badge
                      className="absolute right-3 top-3 text-[11px] px-1.5 py-0 bg-primary text-primary-foreground"
                    >
                      {t("platform_admin.current_org_label" as Parameters<typeof t>[0])}
                    </Badge>
                  )}

                  {/* Org icon */}
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="size-5" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold leading-tight">{org.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge
                        variant="outline"
                        className="text-[11px] px-1.5 py-0"
                      >
                        {org.payment_mode === "NOMINAL_ACCOUNT"
                          ? t("platform_admin.payment_mode_nominal" as Parameters<typeof t>[0])
                          : t("platform_admin.payment_mode_client_direct" as Parameters<typeof t>[0])}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-1.5 py-0",
                          org.freelance_module_enabled
                            ? "border-success/40 text-success bg-success/5"
                            : "text-muted-foreground",
                        )}
                      >
                        {org.freelance_module_enabled
                          ? t("platform_admin.freelance_enabled" as Parameters<typeof t>[0])
                          : t("platform_admin.freelance_disabled" as Parameters<typeof t>[0])}
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
                    {t("platform_admin.switch_to_org" as Parameters<typeof t>[0])}
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

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ProfileSettings() {
  const t = useTranslations("screen.profile");
  const { user } = useAuth();
  const router = useRouter();

  const role = user.role;
  const isAgent = role === "AGENT";

  const sections = getSectionsForRole(role);
  const [activeSection, setActiveSection] = React.useState<Section>(sections[0]);

  // Section icon map
  const SECTION_ICONS: Record<Section, React.ElementType> = {
    profile: User,
    security: Lock,
    notifications: Bell,
    assignments: Building2,
    appearance: Palette,
    organizations: Building2,
  };

  // Section labels from t keys
  const SECTION_LABEL_KEYS: Record<Section, string> = {
    profile: "sidebar.profile",
    security: "sidebar.security",
    notifications: "sidebar.notifications",
    assignments: "sidebar.assignments",
    appearance: "sidebar.appearance",
    organizations: "platform_admin.title",
  };

  function handleLogout() {
    toast.success(t("toasts.logged_out" as Parameters<typeof t>[0]));
    router.push("/login" as never);
  }

  function renderSection() {
    switch (activeSection) {
      case "profile":
        return <ProfileSection t={t} isAgent={isAgent} />;
      case "security":
        return <SecuritySection t={t} />;
      case "notifications":
        return <NotificationsSection t={t} isAgent={isAgent} />;
      case "assignments":
        return <AssignmentsSection t={t} />;
      case "appearance":
        return isAgent
          ? <AppearanceSectionAgent t={t} />
          : <AppearanceSection t={t} />;
      case "organizations":
        return <OrganizationsSection t={t} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
          {t("page_title" as Parameters<typeof t>[0])}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("page_subtitle" as Parameters<typeof t>[0])}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* ── Sidebar nav ── */}
        <nav className="flex flex-row flex-wrap gap-1 lg:flex-col" aria-label="Profile sections">
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section];
            const labelKey = SECTION_LABEL_KEYS[section];
            const label = section === "organizations"
              ? t("platform_admin.title" as Parameters<typeof t>[0])
              : t(labelKey as Parameters<typeof t>[0]);

            return (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                  activeSection === section
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={activeSection === section ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}

          <Separator className="my-1 hidden lg:block" />

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive text-left"
          >
            <LogOut className="size-4 shrink-0" />
            <span>{t("sidebar.logout" as Parameters<typeof t>[0])}</span>
          </button>
        </nav>

        {/* ── Section content ── */}
        <div className="min-w-0 pb-20">{renderSection()}</div>
      </div>
    </div>
  );
}
