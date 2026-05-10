"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, ShieldCheck, Search, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import type { RiskRuleConfig } from "@/lib/api/risk";
import type { Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { formatDate } from "./_shared";
import { ModeBadge } from "./mode-badge";
import { RuleActionsMenu } from "./rule-actions-menu";

interface RulesTabProps {
  rules: RiskRuleConfig[];
  loading: boolean;
  onEdit: (rule: RiskRuleConfig) => void;
  onDuplicate: (rule: RiskRuleConfig) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

export function RulesTab({ rules, loading, onEdit, onDuplicate, onDelete, onCreateNew }: RulesTabProps) {
  const t = useTranslations("screen.riskRules");
  const locale = useLocale() as Locale;
  const [search, setSearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Categories derived from rules
  const categories = Array.from(new Set(rules.map((r) => r.work_type_name)));

  const filtered = rules.filter((r) => {
    const search_lc = search.toLowerCase();
    const ruleName = pickLocalized(r.name, r.name_en, locale).toLowerCase();
    const matchSearch =
      !search ||
      r.work_type_name.toLowerCase().includes(search_lc) ||
      r.name.toLowerCase().includes(search_lc) ||
      ruleName.includes(search_lc);
    const matchCategory = !categoryFilter || r.work_type_name === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36 ml-auto" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            placeholder={t("rules_tab.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
            aria-label={t("rules_tab.search_placeholder")}
          />
        </div>

        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryOpen}
              className="h-9 gap-1.5 min-w-[140px] justify-between"
            >
              {categoryFilter || t("rules_tab.category_label")}
              {categoryFilter ? (
                <X
                  className="size-3.5 opacity-50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryFilter("");
                  }}
                  aria-label="Clear"
                />
              ) : (
                <ChevronDown className="size-3.5 opacity-50" aria-hidden="true" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("rules_tab.category_label")} />
              <CommandEmpty>—</CommandEmpty>
              <CommandGroup>
                {categories.map((cat) => (
                  <CommandItem
                    key={cat}
                    value={cat}
                    onSelect={() => {
                      setCategoryFilter(cat === categoryFilter ? "" : cat);
                      setCategoryOpen(false);
                    }}
                  >
                    {cat}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <Button onClick={onCreateNew} className="h-9 gap-1.5 shrink-0 ml-auto sm:ml-0">
          <Plus className="size-4" aria-hidden="true" />
          {t("rules_tab.create_rule")}
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t("empty.no_rules_title")}
            description=""
            action={{ label: t("empty.no_rules_cta"), onClick: onCreateNew }}
          />
        ) : (
          filtered.map((rule) => (
            <Card key={rule.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{rule.work_type_name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ModeBadge
                        mode={rule.mode}
                        label={t(`rules_tab.mode_label.${rule.mode}` as Parameters<typeof t>[0])}
                      />
                      {rule.mode === "SAMPLING" && rule.sample_rate !== undefined && (
                        <span className="text-xs font-mono text-foreground">{rule.sample_rate}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      {rule.triggers_config.filter((tc) => tc.enabled).length > 0 && (
                        <span className="inline-flex items-center rounded-full border px-2 h-5 text-[10px] font-medium bg-muted text-muted-foreground border-border">
                          {t("rules_tab.triggers_count", {
                            count: rule.triggers_config.filter((tc) => tc.enabled).length,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <RuleActionsMenu
                    rule={rule}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDeleteRequest={(id) => {
                      setDeleteTarget(id);
                      setDeleteOpen(true);
                    }}
                    t={t}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("rules_tab.columns.work_type")}</TableHead>
              <TableHead>{t("rules_tab.columns.mode")}</TableHead>
              <TableHead>{t("rules_tab.columns.sample_rate")}</TableHead>
              <TableHead>{t("rules_tab.columns.photo_required")}</TableHead>
              <TableHead>{t("rules_tab.columns.triggers")}</TableHead>
              <TableHead>{t("rules_tab.columns.updated_at")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <EmptyState
                    icon={ShieldCheck}
                    title={t("empty.no_rules_title")}
                    description=""
                    action={{ label: t("empty.no_rules_cta"), onClick: onCreateNew }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rule) => (
                <TableRow
                  key={rule.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => onEdit(rule)}
                >
                  <TableCell className="font-medium">{rule.work_type_name}</TableCell>
                  <TableCell>
                    <ModeBadge
                      mode={rule.mode}
                      label={t(`rules_tab.mode_label.${rule.mode}` as Parameters<typeof t>[0])}
                    />
                  </TableCell>
                  <TableCell>
                    {rule.mode === "SAMPLING" && rule.sample_rate !== undefined ? (
                      <span className="font-mono text-sm">{rule.sample_rate}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.photo_required}
                      disabled
                      aria-label={t("rules_tab.columns.photo_required")}
                      className="pointer-events-none"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {rule.triggers_config.filter((tc) => tc.enabled).length > 0 ? (
                      <span className="inline-flex items-center rounded-full border px-2.5 h-6 text-xs font-medium bg-muted text-muted-foreground border-border">
                        {t("rules_tab.triggers_count", {
                          count: rule.triggers_config.filter((tc) => tc.enabled).length,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDate((rule as RiskRuleConfig & { updated_at?: string }).updated_at)}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RuleActionsMenu
                      rule={rule}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDeleteRequest={(id) => {
                        setDeleteTarget(id);
                        setDeleteOpen(true);
                      }}
                      t={t}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ConfirmDialog
          title={t("rules_tab.delete_dialog.title")}
          message={t("rules_tab.delete_dialog.description")}
          confirmLabel={t("rules_tab.delete_dialog.confirm")}
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onOpenChange={setDeleteOpen}
        />
      </AlertDialog>
    </div>
  );
}
