"use client";

import { useState, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  CalendarIcon,
  Upload,
  ChevronsUpDown,
  Check,
  Camera,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LazyCalendar as Calendar } from "@/components/shared/lazy-calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { uploadAvatar } from "@/lib/api";
import {
  PHONE_COUNTRIES,
  applyPhoneMask,
  type PhoneCountry,
  type Step1Values,
} from "./_shared";

interface StepPersonalProps {
  form: UseFormReturn<Step1Values>;
  t: (key: string) => string;
  phoneCountry: PhoneCountry;
  onPhoneCountryChange: (country: PhoneCountry) => void;
  avatarPreview: string | undefined;
  onAvatarPreviewChange: (url: string | undefined) => void;
  onSubmit: () => void;
  summaryFio: string;
}

export function StepPersonal({
  form,
  t,
  phoneCountry,
  onPhoneCountryChange,
  avatarPreview,
  onAvatarPreviewChange,
  onSubmit,
  summaryFio,
}: StepPersonalProps) {
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const s1Watch = form.watch();

  async function handleAvatarFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Формат не поддерживается. Допустимы JPG, PNG, WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 2 МБ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      onAvatarPreviewChange(url);
    };
    reader.readAsDataURL(file);
    try {
      await uploadAvatar(file.name, file.size);
    } catch {
      // uploadAvatar already validates size; error shown above
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-col-reverse gap-6 md:flex-row md:items-start">
          {/* ── LEFT: form fields ── */}
          <div className="min-w-0 flex-1 space-y-5">
            {/* Name fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("step1.last_name")} *</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus autoComplete="family-name" />
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
                    <FormLabel>{t("step1.first_name")} *</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="given-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="middle_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("step1.middle_name")}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({t("step1.middle_name")} — необязательно)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="additional-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("step1.phone")} *</FormLabel>
                  <div className="flex gap-2">
                    <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={phoneCountryOpen}
                          className="w-[110px] justify-between px-3"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{phoneCountry.flag}</span>
                            <span className="text-sm">{phoneCountry.dial}</span>
                          </span>
                          <ChevronsUpDown className="size-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("step1.phone_country_search")} />
                          <CommandList>
                            <CommandEmpty>{t("step1.phone_country_empty")}</CommandEmpty>
                            <CommandGroup>
                              {PHONE_COUNTRIES.map((c) => (
                                <CommandItem
                                  key={c.code}
                                  value={`${c.name} ${c.dial}`}
                                  onSelect={() => {
                                    onPhoneCountryChange(c);
                                    setPhoneCountryOpen(false);
                                    field.onChange(applyPhoneMask("", c));
                                  }}
                                >
                                  <span className="mr-2 text-base">{c.flag}</span>
                                  <span className="flex-1">{c.name}</span>
                                  <span className="text-xs text-muted-foreground">{c.dial}</span>
                                  <Check
                                    className={cn(
                                      "ml-2 size-4",
                                      phoneCountry.code === c.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("step1.phone_placeholder")}
                        inputMode="tel"
                        onChange={(e) => {
                          const masked = applyPhoneMask(e.target.value, phoneCountry);
                          field.onChange(masked);
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("step1.email")}{" "}
                    <span className="text-xs text-muted-foreground">(необязательно)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder={t("step1.email_placeholder")}
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of birth */}
            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    {t("step1.date_of_birth")}{" "}
                    <span className="text-xs text-muted-foreground">(необязательно)</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value
                            ? format(field.value, "d MMMM yyyy", { locale: ru })
                            : "—"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Доля ставки */}
            <FormField
              control={form.control}
              name="rate_fraction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("step1.rate_fraction_label")}</FormLabel>
                  <Select value={field.value ?? "FULL"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("step1.rate_fraction_placeholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="QUARTER">{t("step1.rate_quarter")}</SelectItem>
                      <SelectItem value="HALF">{t("step1.rate_half")}</SelectItem>
                      <SelectItem value="THREE_QUARTER">{t("step1.rate_three_quarter")}</SelectItem>
                      <SelectItem value="FULL">{t("step1.rate_full")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ── RIGHT: compact avatar + live summary ── */}
          <div className="flex w-full shrink-0 flex-col items-center gap-4 md:w-44">
            <div className="flex flex-col items-center gap-2">
              <TooltipProvider>
                <div
                  className={cn(
                    "relative size-24 cursor-pointer rounded-full md:size-24",
                    "max-md:size-32"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleAvatarFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Загрузить фото"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <Avatar
                    className={cn(
                      "size-full border-2 border-border",
                      isDragOver && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <AvatarImage src={avatarPreview} className="object-cover" />
                    <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-medium">
                      {avatarPreview ? null : (
                        <Camera className="size-8 text-muted-foreground" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {!avatarPreview ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 transition-colors hover:bg-foreground/40">
                          <Upload className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Загрузить фото</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-foreground/0 opacity-0 transition-all hover:bg-foreground/50 hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Изменить фото"
                            className="flex size-8 items-center justify-center rounded-full bg-background/20 text-white transition-colors hover:bg-background/40"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Изменить</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Удалить фото"
                            className="flex size-8 items-center justify-center rounded-full bg-background/20 text-white transition-colors hover:bg-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAvatarPreviewChange(undefined);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Удалить</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </TooltipProvider>

              <p className="text-center text-xs text-muted-foreground">
                JPG, PNG до 2 МБ
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Live summary card */}
            <div className="w-full rounded-lg bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 font-semibold text-foreground">Сводка</p>
              <dl className="space-y-1">
                <div>
                  <dt className="sr-only">ФИО</dt>
                  <dd className={cn("font-medium", !summaryFio && "text-muted-foreground")}>
                    {summaryFio || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Телефон</dt>
                  <dd className={cn(!s1Watch.phone && "text-muted-foreground")}>
                    {s1Watch.phone || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
