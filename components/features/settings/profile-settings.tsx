"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  User as UserIcon,
  Lock,
  Bell,
  Briefcase,
  Palette,
  LogOut,
  Upload,
  Trash2,
  Monitor,
  Smartphone,
  Tablet,
  Sun,
  Globe,
  QrCode,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import {
  getCurrentUser,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  updateUserLocale,
  setupTotp,
  verifyTotp,
  disableTotp,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
} from "@/lib/api/auth";
import { getMyAssignments } from "@/lib/api/users";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { CurrentUser, ActiveSession } from "@/lib/api/auth";
import type { Assignment, FunctionalRole } from "@/lib/types";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

// ─── TIMEZONES ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: "Asia/Tomsk", label: "Томск (UTC+7)" },
  { value: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск (UTC+7)" },
  { value: "Europe/Moscow", label: "Москва (UTC+3)" },
  { value: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { value: "Europe/Samara", label: "Самара (UTC+4)" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
  { value: "Asia/Omsk", label: "Омск (UTC+6)" },
  { value: "Asia/Irkutsk", label: "Иркутск (UTC+8)" },
  { value: "Asia/Vladivostok", label: "Владивосток (UTC+10)" },
  { value: "Europe/London", label: "Лондон (UTC+0/+1)" },
  { value: "Europe/Berlin", label: "Берлин (UTC+1/+2)" },
  { value: "America/New_York", label: "Нью-Йорк (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "Лос-Анджелес (UTC-8/-7)" },
  { value: "UTC", label: "UTC" },
];

// ─── SECTION TYPE ─────────────────────────────────────────────────────────────

type Section =
  | "profile"
  | "security"
  | "notifications"
  | "assignments"
  | "appearance"
  | "organizations";

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

// ─── PROFILE FORM SCHEMA ──────────────────────────────────────────────────────

const profileFormSchema = z.object({
  last_name: z.string().min(2, "Минимум 2 символа").max(60, "Максимум 60 символов"),
  first_name: z.string().min(2, "Минимум 2 символа").max(60, "Максимум 60 символов"),
  middle_name: z.string().max(60, "Максимум 60 символов").optional(),
  phone: z
    .string()
    .regex(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, "Введите телефон в формате +7 (XXX) XXX-XX-XX"),
  date_of_birth: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  let result = "+7";
  if (digits.length > 1) result += ` (${digits.slice(1, 4)}`;
  if (digits.length >= 4) result += `)`;
  if (digits.length > 4) result += ` ${digits.slice(4, 7)}`;
  if (digits.length > 7) result += `-${digits.slice(7, 9)}`;
  if (digits.length > 9) result += `-${digits.slice(9, 11)}`;
  return result;
}

function getInitials(user: CurrentUser): string {
  return `${user.last_name[0] ?? ""}${user.first_name[0] ?? ""}`.toUpperCase();
}

function formatDate(isoDate: string | undefined, locale: string): string {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

function formatDateTime(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

// ─── INNER SIDEBAR NAV ────────────────────────────────────────────────────────

interface SidebarNavProps {
  activeSection: Section;
  onSelect: (s: Section) => void;
  onLogout: () => void;
  availableSections: Section[];
}

function SidebarNav({ activeSection, onSelect, onLogout, availableSections }: SidebarNavProps) {
  const t = useTranslations("screen.profile");
  const router = useRouter();

  const allItems: { id: Section; icon: React.ElementType; label: string; href?: string }[] = [
    { id: "profile", icon: UserIcon, label: t("sidebar.profile") },
    { id: "security", icon: Lock, label: t("sidebar.security") },
    { id: "notifications", icon: Bell, label: t("sidebar.notifications"), href: ADMIN_ROUTES.notifications },
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

// ─── PROFILE SECTION ──────────────────────────────────────────────────────────

interface ProfileSectionProps {
  user: CurrentUser;
  locale: string;
  onUserUpdate: (data: Partial<CurrentUser>) => void;
}

function ProfileSection({ user, locale, onUserUpdate }: ProfileSectionProps) {
  const t = useTranslations("screen.profile");
  const tCommon = useTranslations("common");
  const tEmployee = useTranslations("employeeType");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    user.hired_at ? new Date(user.hired_at) : undefined
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      last_name: user.last_name,
      first_name: user.first_name,
      middle_name: user.middle_name ?? "",
      phone: user.phone,
      date_of_birth: undefined,
    },
  });

  const isDirty = form.formState.isDirty;
  const [saving, setSaving] = useState(false);

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    const result = await updateProfile({
      first_name: values.first_name,
      last_name: values.last_name,
      middle_name: values.middle_name,
      phone: values.phone,
      date_of_birth: values.date_of_birth,
    });
    setSaving(false);
    if (result.success) {
      onUserUpdate({
        first_name: values.first_name,
        last_name: values.last_name,
        middle_name: values.middle_name,
        phone: values.phone,
      });
      form.reset(values);
      toast.success(t("toasts.saved"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("validation.avatar_too_large"));
      return;
    }
    setAvatarUploading(true);
    try {
      const res = await uploadAvatar(file.name, file.size);
      onUserUpdate({ avatar_url: res.data.url });
      toast.success(t("toasts.avatar_uploaded"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarRemoving(true);
    const res = await removeAvatar();
    setAvatarRemoving(false);
    if (res.success) {
      onUserUpdate({ avatar_url: undefined });
      toast.success(t("toasts.avatar_removed"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.profile.avatar_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="size-24 shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} alt={`${user.first_name} ${user.last_name}`} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? (
                    <Spinner className="mr-2 size-4" />
                  ) : (
                    <Upload className="mr-2 size-4" />
                  )}
                  {t("sections.profile.avatar_upload")}
                </Button>
                {user.avatar_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarRemove}
                    disabled={avatarRemoving}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {avatarRemoving ? <Spinner className="mr-2 size-4" /> : <Trash2 className="mr-2 size-4" />}
                    {t("sections.profile.avatar_remove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("sections.profile.avatar_helper")}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal data card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.profile.personal_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sections.profile.last_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={60} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sections.profile.first_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={60} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="middle_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("sections.profile.middle_name")}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({tCommon("optional")})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={60} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sections.profile.phone")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+7 (999) 999-99-99"
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email — read-only */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">
                  {t("sections.profile.email")}
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Input
                          value={user.email ?? "—"}
                          readOnly
                          disabled
                          className="cursor-not-allowed opacity-60"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("sections.profile.email_locked_hint")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Date of birth */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">
                  {t("sections.profile.date_of_birth")}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({tCommon("optional")})
                  </span>
                </label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-[240px] justify-start font-normal">
                      {selectedDate
                        ? formatDate(selectedDate.toISOString(), locale)
                        : <span className="text-muted-foreground">{tCommon("date")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-auto">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        setSelectedDate(d);
                        form.setValue("date_of_birth", d?.toISOString().split("T")[0], { shouldDirty: true });
                        setDatePickerOpen(false);
                      }}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={1950}
                      toYear={2010}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Employee type — read-only */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">
                  {t("sections.profile.employee_type")}
                </label>
                <div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    {user.type === "STAFF" ? tEmployee("staff") : tEmployee("freelance")}
                  </Badge>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg md:bottom-4 md:left-auto md:right-6 md:rounded-lg md:border md:shadow-xl md:max-w-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <p className="flex-1 text-sm text-muted-foreground truncate">
              {t("save_bar.dirty_message")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => form.reset()}
              disabled={saving}
            >
              {t("save_bar.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? <Spinner className="mr-2 size-4" /> : null}
              {t("save_bar.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECURITY SECTION ─────────────────────────────────────────────────────────

interface SecuritySectionProps {
  user: CurrentUser;
  onUserUpdate: (data: Partial<CurrentUser>) => void;
}

function SecuritySection({ user, onUserUpdate }: SecuritySectionProps) {
  const t = useTranslations("screen.profile");

  // Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  useEffect(() => {
    setSessionsLoading(true);
    getActiveSessions().then((res) => {
      setSessions(res.data);
      setSessionsLoading(false);
    });
  }, []);

  async function handleRevokeSession(id: string) {
    setRevokingSessionId(id);
    const res = await terminateSession(id);
    setRevokingSessionId(null);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success(t("toasts.session_revoked"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    const res = await terminateAllOtherSessions();
    setRevokingAll(false);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.is_current));
      toast.success(t("toasts.session_revoked"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  // TOTP
  const [totpEnabled, setTotpEnabled] = useState(user.totp_enabled ?? false);
  const [totpSetupOpen, setTotpSetupOpen] = useState(false);
  const [totpDisableOpen, setTotpDisableOpen] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qr_url: string; backup_codes: string[] } | null>(null);
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpDisableLoading, setTotpDisableLoading] = useState(false);
  const [totpSetupStep, setTotpSetupStep] = useState<"qr" | "verify" | "backup">("qr");

  async function handleOpenTotpSetup() {
    setTotpSetupOpen(true);
    setTotpSetupStep("qr");
    const res = await setupTotp();
    setTotpSetupData(res.data);
  }

  async function handleVerifyTotpSetup() {
    if (totpSetupCode.length !== 6) return;
    setTotpSetupLoading(true);
    const res = await verifyTotp(user.id, totpSetupCode);
    setTotpSetupLoading(false);
    if (res.data) {
      setTotpSetupStep("backup");
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleDisableTotp() {
    if (totpDisableCode.length !== 6) return;
    setTotpDisableLoading(true);
    const res = await disableTotp(totpDisableCode);
    setTotpDisableLoading(false);
    if (res.success) {
      setTotpEnabled(false);
      onUserUpdate({ totp_enabled: false });
      setTotpDisableOpen(false);
      setTotpDisableCode("");
      toast.success(t("toasts.totp_disabled"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  function DeviceIcon({ type }: { type: "desktop" | "mobile" | "tablet" }) {
    if (type === "mobile") return <Smartphone className="size-5 text-muted-foreground" />;
    if (type === "tablet") return <Tablet className="size-5 text-muted-foreground" />;
    return <Monitor className="size-5 text-muted-foreground" />;
  }

  const nonCurrentSessions = sessions.filter((s) => !s.is_current);

  return (
    <div className="space-y-6">
      {/* Password card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.security.password_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertDescription>
              {t("sections.security.password_sso_hint")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* TOTP card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.security.totp_card")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {totpEnabled ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    {t("sections.security.totp_enabled")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    {t("sections.security.totp_disabled")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("sections.security.totp_hint")}
              </p>
            </div>
            {totpEnabled ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setTotpDisableOpen(true)}
              >
                {t("sections.security.totp_disable")}
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={handleOpenTotpSetup}>
                <QrCode className="mr-2 size-4" />
                {t("sections.security.totp_setup")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.security.sessions_card")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <DeviceIcon type={session.device_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{session.device_name}</span>
                      {session.is_current && (
                        <Badge className="bg-success/10 text-success border-success/20 text-[11px]">
                          {t("sections.security.session_current")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.ip} · {session.city} · {formatDateTime(session.last_activity_at, "ru")}
                    </p>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      aria-label={t("sections.security.session_revoke")}
                    >
                      {revokingSessionId === session.id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {nonCurrentSessions.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setRevokeAllOpen(true)}
                    disabled={revokingAll}
                  >
                    {revokingAll && <Spinner className="mr-2 size-4" />}
                    {t("sections.security.session_revoke_all")}
                  </Button>
                  <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
                    <ConfirmDialog
                      title={t("sections.security.session_revoke_all_confirm_title")}
                      message={t("sections.security.session_revoke_all_confirm_message")}
                      confirmLabel={t("sections.security.session_revoke")}
                      variant="destructive"
                      onConfirm={handleRevokeAll}
                      onOpenChange={setRevokeAllOpen}
                    />
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* TOTP Setup Dialog */}
      <Dialog open={totpSetupOpen} onOpenChange={setTotpSetupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sections.security.totp_setup_title")}</DialogTitle>
            <DialogDescription>
              {t("sections.security.totp_setup_description")}
            </DialogDescription>
          </DialogHeader>

          {totpSetupStep === "qr" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {totpSetupData ? (
                  <div className="rounded-lg border bg-muted p-4 text-center space-y-2">
                    <QrCode className="size-16 mx-auto text-primary" />
                    <p className="text-xs font-mono bg-card rounded px-2 py-1 border">
                      {totpSetupData.secret}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("sections.security.totp_setup_secret_hint")}
                    </p>
                  </div>
                ) : (
                  <Skeleton className="size-36 rounded-lg" />
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t("sections.security.totp_setup_scan_hint")}
              </p>
              <Button
                className="w-full"
                onClick={() => setTotpSetupStep("verify")}
                disabled={!totpSetupData}
              >
                {t("sections.security.totp_setup_next")}
              </Button>
            </div>
          )}

          {totpSetupStep === "verify" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t("sections.security.totp_setup_enter_code")}
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpSetupCode}
                  onChange={setTotpSetupCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyTotpSetup}
                disabled={totpSetupCode.length !== 6 || totpSetupLoading}
              >
                {totpSetupLoading && <Spinner className="mr-2 size-4" />}
                {t("sections.security.totp_setup_confirm")}
              </Button>
            </div>
          )}

          {totpSetupStep === "backup" && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  {t("sections.security.totp_backup_warning")}
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                {totpSetupData?.backup_codes.map((code) => (
                  <code key={code} className="text-xs bg-muted rounded px-2 py-1 font-mono text-center">
                    {code}
                  </code>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setTotpEnabled(true);
                  onUserUpdate({ totp_enabled: true });
                  setTotpSetupOpen(false);
                  setTotpSetupCode("");
                  setTotpSetupStep("qr");
                  toast.success(t("toasts.totp_enabled"));
                }}
              >
                {t("sections.security.totp_backup_done")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TOTP Disable AlertDialog */}
      <AlertDialog open={totpDisableOpen} onOpenChange={setTotpDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sections.security.totp_disable_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sections.security.totp_disable_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={totpDisableCode}
              onChange={setTotpDisableCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setTotpDisableOpen(false); setTotpDisableCode(""); }}>
              {t("save_bar.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableTotp}
              disabled={totpDisableCode.length !== 6 || totpDisableLoading}
            >
              {totpDisableLoading && <Spinner className="mr-2 size-4" />}
              {t("sections.security.totp_disable")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── NOTIFICATIONS SECTION ────────────────────────────────────────────────────

function NotificationsSection() {
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

// ─── ASSIGNMENTS SECTION ──────────────────────────────────────────────────────

interface AssignmentsSectionProps {
  userId: number;
}

function AssignmentsSection({ userId }: AssignmentsSectionProps) {
  const t = useTranslations("screen.profile");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    setLoadingAssignments(true);
    getMyAssignments(userId).then((res) => {
      setAssignments(res.data);
      setLoadingAssignments(false);
    });
  }, [userId]);

  const activeAssignment = assignments.find((a) => a.active);

  return (
    <div className="space-y-6">
      {loadingAssignments && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      )}
      {/* Current assignment */}
      {!loadingAssignments && activeAssignment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sections.assignments.description")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Briefcase className="size-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {activeAssignment.position_name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeAssignment.store_name}
                </p>
                <div className="mt-2">
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    {activeAssignment.rank.name}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All assignments list */}
      {!loadingAssignments && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.assignments.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sections.assignments.no_assignments")}</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    a.active && "border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{a.position_name}</span>
                      {a.active && (
                        <Badge className="bg-success/10 text-success border-success/20 text-[11px]">
                          {t("sections.assignments.active_label")}
                        </Badge>
                      )}
                      {!a.active && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[11px]">
                          {t("sections.assignments.archived_label")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.store_name}</p>
                    <p className="text-xs text-muted-foreground">{a.rank.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

// ─── APPEARANCE SECTION ───────────────────────────────────────────────────────

interface AppearanceSectionProps {
  user: CurrentUser;
  locale: string;
  onUserUpdate: (data: Partial<CurrentUser>) => void;
}

function AppearanceSection({ user, locale, onUserUpdate }: AppearanceSectionProps) {
  const t = useTranslations("screen.profile");
  const router = useRouter();
  const pathname = usePathname();

  const [timezone, setTimezone] = useState(user.preferred_timezone ?? "Asia/Tomsk");
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);

  async function handleLocaleChange(newLocale: string) {
    setSavingLocale(true);
    const res = await updateUserLocale(newLocale as "ru" | "en");
    setSavingLocale(false);
    if (res.success) {
      onUserUpdate({ preferred_locale: newLocale as "ru" | "en" });
      toast.success(t("toasts.saved"));
      // Switch locale prefix in URL
      const newPath = newLocale === "ru"
        ? pathname.replace(/^\/en/, "") || "/"
        : `/en${pathname.startsWith("/en") ? pathname.slice(3) : pathname}`;
      router.replace(newPath);
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleTimezoneChange(tz: string) {
    setTimezone(tz);
    setTzOpen(false);
    setSavingTimezone(true);
    const res = await updateProfile({ preferred_timezone: tz });
    setSavingTimezone(false);
    if (res.success) {
      onUserUpdate({ preferred_timezone: tz });
      toast.success(t("toasts.saved"));
    } else {
      toast.error(t("toasts.error"));
    }
  }

  const filteredTimezones = TIMEZONES.filter((tz) =>
    tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  );

  const now = new Date();

  const regionalFormats = {
    date: new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
      day: "numeric", month: "short", year: "numeric",
    }).format(now),
    time: new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(now),
    number: new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU").format(1234567.5),
    currency: new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
      style: "currency", currency: "RUB",
    }).format(12450),
  };

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.appearance.theme")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup defaultValue="light" className="space-y-2">
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
              <RadioGroupItem value="light" id="theme-light" />
              <Sun className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("sections.appearance.theme_light")}</p>
                <p className="text-xs text-muted-foreground">{t("sections.appearance.theme_light_hint")}</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
              <RadioGroupItem value="system" id="theme-system" />
              <Monitor className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("sections.appearance.theme_system")}</p>
                <p className="text-xs text-muted-foreground">{t("sections.appearance.theme_system_hint")}</p>
              </div>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.appearance.language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={locale}
            onValueChange={handleLocaleChange}
            disabled={savingLocale}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <Globe className="mr-2 size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">{t("sections.appearance.language_ru")}</SelectItem>
              <SelectItem value="en">{t("sections.appearance.language_en")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.appearance.timezone")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full sm:w-[280px] justify-between font-normal"
                disabled={savingTimezone}
              >
                <span className="truncate">
                  {TIMEZONES.find((tz) => tz.value === timezone)?.label ?? timezone}
                </span>
                {savingTimezone ? (
                  <Spinner className="ml-2 size-4 shrink-0" />
                ) : (
                  <Globe className="ml-2 size-4 shrink-0 text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder={t("sections.appearance.timezone_search")}
                  value={tzSearch}
                  onValueChange={setTzSearch}
                />
                <CommandList>
                  <CommandEmpty>{t("sections.appearance.timezone_not_found")}</CommandEmpty>
                  <CommandGroup>
                    {filteredTimezones.map((tz) => (
                      <CommandItem
                        key={tz.value}
                        value={tz.value}
                        onSelect={() => handleTimezoneChange(tz.value)}
                        className={cn(tz.value === timezone && "bg-accent")}
                      >
                        {tz.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Regional formats — read-only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.appearance.regional_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">{t("sections.appearance.regional_date")}</dt>
              <dd className="font-medium">{regionalFormats.date}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">{t("sections.appearance.regional_time")}</dt>
              <dd className="font-medium">{regionalFormats.time}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">{t("sections.appearance.regional_number")}</dt>
              <dd className="font-medium">{regionalFormats.number}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-0.5">{t("sections.appearance.regional_currency")}</dt>
              <dd className="font-medium">{regionalFormats.currency}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

// ─── ORGANIZATIONS SECTION (PLATFORM_ADMIN only) ──────────────────────────────

function OrganizationsSection({ user }: { user: CurrentUser }) {
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

function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function ProfileSettings() {
  const t = useTranslations("screen.profile");
  const locale = useLocale();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleUserUpdate = useCallback((data: Partial<CurrentUser>) => {
    setUser((prev) => prev ? { ...prev, ...data } : prev);
  }, []);

  useEffect(() => {
    setLoading(true);
    getCurrentUser()
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить данные профиля");
        setLoading(false);
      });
  }, []);

  if (loading) return <ProfileSettingsSkeleton />;

  if (error || !user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {error ?? "Ошибка загрузки"}
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const availableSections = getSectionsForRole(user.role);
  const safeActiveSection = availableSections.includes(activeSection) ? activeSection : availableSections[0];

  const sectionContent: Record<Section, React.ReactNode> = {
    profile: <ProfileSection user={user} locale={locale} onUserUpdate={handleUserUpdate} />,
    security: <SecuritySection user={user} onUserUpdate={handleUserUpdate} />,
    notifications: <NotificationsSection />,
    assignments: <AssignmentsSection userId={user.id} />,
    appearance: <AppearanceSection user={user} locale={locale} onUserUpdate={handleUserUpdate} />,
    organizations: <OrganizationsSection user={user} />,
  };

  const sectionLabels: Record<Section, string> = {
    profile: t("sidebar.profile"),
    security: t("sidebar.security"),
    notifications: t("sidebar.notifications"),
    assignments: t("sidebar.assignments"),
    appearance: t("sidebar.appearance"),
    organizations: t("platform_admin.title"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.settings") },
        ]}
      />

      {/* User summary row */}
      <div className="flex items-center gap-3 pb-2">
        <Avatar className="size-12">
          <AvatarImage src={user.avatar_url ?? undefined} alt={`${user.first_name} ${user.last_name}`} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">
            {user.last_name} {user.first_name} {user.middle_name ?? ""}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <RoleBadge role={user.role} size="sm" />
          </div>
        </div>
      </div>

      {/* Desktop: sidebar + content grid */}
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <SidebarNav
              activeSection={safeActiveSection}
              onSelect={setActiveSection}
              onLogout={() => setLogoutOpen(true)}
              availableSections={availableSections}
            />
          </div>
        </aside>

        {/* Mobile: Tabs */}
        <div className="lg:hidden">
          <Tabs
            value={safeActiveSection}
            onValueChange={(v) => setActiveSection(v as Section)}
          >
            <TabsList className="w-full overflow-x-auto flex-nowrap justify-start h-auto gap-1 p-1 mb-4">
              {availableSections.map((s) => (
                <TabsTrigger key={s} value={s} className="shrink-0 text-xs">
                  {sectionLabels[s]}
                </TabsTrigger>
              ))}
            </TabsList>
            {availableSections.map((s) => (
              <TabsContent key={s} value={s}>
                {sectionContent[s]}
              </TabsContent>
            ))}
          </Tabs>
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="mr-2 size-4" />
              {t("sidebar.logout")}
            </Button>
          </div>
        </div>

        {/* Desktop content */}
        <div className="hidden lg:block">
          {sectionContent[safeActiveSection]}
        </div>
      </div>

      {/* Logout confirm dialog */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <ConfirmDialog
          title={t("logout_confirm.title")}
          message={t("logout_confirm.message")}
          confirmLabel={t("sidebar.logout")}
          variant="destructive"
          onConfirm={async () => {
            toast.success(t("toasts.logged_out"));
            router.push("/login");
          }}
          onOpenChange={setLogoutOpen}
        />
      </AlertDialog>
    </div>
  );
}
