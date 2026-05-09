"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  CalendarIcon,
  ChevronsUpDown,
  Check,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  StoreWithStats,
  PositionWithCounts,
  OfertaChannel,
} from "@/lib/api";
import type { Agent } from "@/lib/types";
import type { Step2Input, WizardValues } from "./_shared";

interface StepPositionProps {
  form: UseFormReturn<Step2Input>;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  stores: StoreWithStats[];
  positions: PositionWithCounts[];
  agents: Agent[];
  isNominalAccount: boolean;
  masterValues: Partial<WizardValues>;
  onMasterValuesChange: (
    updater: (prev: Partial<WizardValues>) => Partial<WizardValues>
  ) => void;
  onSubmit: () => void;
}

export function StepPosition({
  form,
  t,
  tCommon,
  stores,
  positions,
  agents,
  isNominalAccount,
  masterValues,
  onMasterValuesChange,
  onSubmit,
}: StepPositionProps) {
  const [storeOpen, setStoreOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Store combobox */}
        <FormField
          control={form.control}
          name="store_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("step2.store")} *</FormLabel>
              <Popover open={storeOpen} onOpenChange={setStoreOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? stores.find((s) => s.id === field.value)?.name
                        : t("step2.store_placeholder")}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("step2.store_search")} />
                    <CommandList>
                      <CommandEmpty>{t("step2.store_placeholder")}</CommandEmpty>
                      <CommandGroup>
                        {stores.map((store) => (
                          <CommandItem
                            key={store.id}
                            value={`${store.external_code} ${store.name}`}
                            onSelect={() => {
                              field.onChange(store.id);
                              setStoreOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                field.value === store.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-medium">{store.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {store.external_code} · {store.city}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Position combobox */}
        <FormField
          control={form.control}
          name="position_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("step2.position")} *</FormLabel>
              <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? positions.find((p) => p.id === field.value)?.name
                        : t("step2.position_placeholder")}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("step2.position_placeholder")} />
                    <CommandList>
                      <CommandEmpty>{t("step2.position_placeholder")}</CommandEmpty>
                      <CommandGroup>
                        {positions.map((pos) => (
                          <CommandItem
                            key={pos.id}
                            value={`${pos.code} ${pos.name}`}
                            onSelect={() => {
                              field.onChange(pos.id);
                              setPositionOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                field.value === pos.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span>{pos.name}</span>
                            {pos.role_id === 2 && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">
                                Управляющий
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">{t("step2.position_hint")}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rank */}
        <FormField
          control={form.control}
          name="rank"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("step2.rank")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                  className="w-24"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t("step2.rank_hint")}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hired at */}
        <FormField
          control={form.control}
          name="hired_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("step2.hired_at")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {field.value
                        ? format(field.value, "d MMMM yyyy", { locale: ru })
                        : format(new Date(), "d MMMM yyyy", { locale: ru })}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(d) => d && field.onChange(d)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Agent combobox — only for FREELANCE + NOMINAL_ACCOUNT */}
        {masterValues.employee_type === "FREELANCE" && isNominalAccount && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {t("step2.agent")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({tCommon("optional")})
              </span>
            </Label>
            <Popover open={agentOpen} onOpenChange={setAgentOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {masterValues.agent_id
                    ? agents.find((a) => a.id === masterValues.agent_id)?.name
                    : t("step2.agent_placeholder")}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("step2.agent_placeholder")} />
                  <CommandList>
                    <CommandEmpty>{t("step2.agent_none")}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          onMasterValuesChange((prev) => ({ ...prev, agent_id: null }));
                          setAgentOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            !masterValues.agent_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-muted-foreground">
                          {t("step2.agent_none")}
                        </span>
                      </CommandItem>
                      {agents.map((agent) => (
                        <CommandItem
                          key={agent.id}
                          value={agent.name}
                          onSelect={() => {
                            onMasterValuesChange((prev) => ({ ...prev, agent_id: agent.id }));
                            setAgentOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              masterValues.agent_id === agent.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {agent.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">{t("step2.agent_hint")}</p>
          </div>
        )}

        {/* Oferta channel — only for FREELANCE */}
        {masterValues.employee_type === "FREELANCE" && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {t("step1.oferta_channel")}
            </Label>
            <RadioGroup
              value={masterValues.oferta_channel ?? "SMS"}
              onValueChange={(val) =>
                onMasterValuesChange((prev) => ({
                  ...prev,
                  oferta_channel: val as OfertaChannel,
                }))
              }
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="SMS" id="oferta-sms" />
                <Label htmlFor="oferta-sms" className="font-normal cursor-pointer">
                  {t("step1.oferta_sms")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="TELEGRAM" id="oferta-telegram" />
                <Label htmlFor="oferta-telegram" className="font-normal cursor-pointer">
                  {t("step1.oferta_telegram")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="EMAIL" id="oferta-email" />
                <Label htmlFor="oferta-email" className="font-normal cursor-pointer">
                  {t("step1.oferta_email")}
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {t("step1.oferta_default_hint")}
            </p>
          </div>
        )}

        {/* Role alert */}
        <Alert className="border-info/30 bg-info/5">
          <Info className="size-4 text-info" />
          <AlertDescription className="text-sm">
            {t("step2.role_alert")}
          </AlertDescription>
        </Alert>
      </form>
    </Form>
  );
}
