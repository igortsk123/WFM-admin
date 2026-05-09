"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Upload, Trash2 } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LazyCalendar as Calendar } from "@/components/shared/lazy-calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

import { updateProfile, uploadAvatar, removeAvatar } from "@/lib/api/auth";
import type { CurrentUser } from "@/lib/api/auth";

import {
  profileFormSchema,
  type ProfileFormValues,
  formatPhone,
  getInitials,
  formatDate,
} from "./_shared";

interface ProfileTabProps {
  user: CurrentUser;
  locale: string;
  onUserUpdate: (data: Partial<CurrentUser>) => void;
}

export function ProfileTab({ user, locale, onUserUpdate }: ProfileTabProps) {
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
