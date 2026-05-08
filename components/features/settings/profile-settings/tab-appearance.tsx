"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, Globe, Monitor } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { updateProfile, updateUserLocale } from "@/lib/api/auth";
import type { CurrentUser } from "@/lib/api/auth";

import { TIMEZONES } from "./_shared";

interface AppearanceTabProps {
  user: CurrentUser;
  locale: string;
  onUserUpdate: (data: Partial<CurrentUser>) => void;
}

export function AppearanceTab({ user, locale, onUserUpdate }: AppearanceTabProps) {
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
