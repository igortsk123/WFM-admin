"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import type { BrandingConfig } from "@/lib/api/organization";
import { cn } from "@/lib/utils";

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS: Array<{ value: string; label: string; bg: string }> = [
  { value: "#7C3AED", label: "Фиолетовый",  bg: "bg-[#7C3AED]" },
  { value: "#2563EB", label: "Синий",        bg: "bg-[#2563EB]" },
  { value: "#16A34A", label: "Зелёный",      bg: "bg-[#16A34A]" },
  { value: "#EA580C", label: "Оранжевый",    bg: "bg-[#EA580C]" },
  { value: "#DB2777", label: "Розовый",      bg: "bg-[#DB2777]" },
  { value: "#374151", label: "Графитовый",   bg: "bg-[#374151]" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrgTabBrandingProps {
  branding: BrandingConfig;
  orgName: string;
  onDirty: () => void;
  onClean: () => void;
  onValuesChange: (values: BrandingConfig) => void;
  registerSubmit: (fn: () => Promise<void>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrgTabBranding({
  branding,
  orgName,
  onDirty,
  onClean,
  onValuesChange,
  registerSubmit,
}: OrgTabBrandingProps) {
  const t = useTranslations("screen.organizationSettings");

  const [localBranding, setLocalBranding] = React.useState<BrandingConfig>(branding);
  const [logoPreview, setLogoPreview] = React.useState<string | undefined>(branding.logo_url);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isDirty =
    localBranding.primary_color !== branding.primary_color ||
    localBranding.theme !== branding.theme;

  React.useEffect(() => {
    if (isDirty) onDirty();
    else onClean();
  }, [isDirty, onDirty, onClean]);

  React.useEffect(() => {
    onValuesChange(localBranding);
  }, [localBranding, onValuesChange]);

  React.useEffect(() => {
    registerSubmit(async () => {
      // No-op for branding: parent handles the actual save call
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function handleColorSelect(color: string) {
    setLocalBranding((prev) => ({ ...prev, primary_color: color }));
  }

  function handleThemeChange(theme: "LIGHT" | "SYSTEM") {
    setLocalBranding((prev) => ({ ...prev, theme }));
  }

  const orgInitials = orgName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">{t("branding.logo_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <Avatar className="size-24 rounded-xl border border-border">
              <AvatarImage src={logoPreview} alt={orgName} />
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary rounded-xl">
                {orgInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("branding.logo_upload")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("branding.logo_helper")}</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.svg"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Primary color */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">{t("branding.color_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="radiogroup"
            aria-label={t("branding.color_card")}
            className="grid grid-cols-6 gap-3"
          >
            {COLOR_PRESETS.map((preset) => {
              const selected = localBranding.primary_color === preset.value;
              return (
                <button
                  key={preset.value}
                  role="radio"
                  aria-checked={selected}
                  aria-label={preset.label}
                  title={preset.label}
                  className={cn(
                    "relative size-11 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    preset.bg,
                    selected && "ring-2 ring-offset-2 ring-foreground scale-110"
                  )}
                  onClick={() => handleColorSelect(preset.value)}
                >
                  {selected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="size-5"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8l3.5 3.5L13 4.5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">{t("branding.theme_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={localBranding.theme}
            onValueChange={(v) => handleThemeChange(v as "LIGHT" | "SYSTEM")}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="LIGHT" id="theme-light" />
              <Label htmlFor="theme-light">{t("branding.theme_light")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="SYSTEM" id="theme-system" />
              <Label htmlFor="theme-system">{t("branding.theme_system")}</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
