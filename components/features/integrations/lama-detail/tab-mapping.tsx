"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getLamaMapping,
  saveLamaMapping,
} from "@/lib/api/integrations";
import type { LamaMappingRow } from "@/lib/api/integrations";

import { TRANSFORM_OPTIONS, WFM_FIELD_OPTIONS, type Translator } from "./_shared";

interface MappingTabProps {
  t: Translator;
}

export function MappingTab({ t }: MappingTabProps) {
  const [entity, setEntity] = React.useState<"users" | "stores" | "positions">("users");
  const [rows, setRows] = React.useState<LamaMappingRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    setDirty(false);
    getLamaMapping(entity).then((res) => {
      setRows(res.data);
      setLoading(false);
    });
  }, [entity]);

  function updateRow(id: string, field: keyof LamaMappingRow, value: unknown) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveLamaMapping(entity, rows);
      toast.success(t("toasts.mapping_saved"));
      setDirty(false);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("lama_detail.mapping_desc")}</p>

      <Tabs value={entity} onValueChange={(v) => setEntity(v as typeof entity)}>
        <TabsList>
          <TabsTrigger value="users">{t("lama_detail.mapping_sub_users")}</TabsTrigger>
          <TabsTrigger value="stores">{t("lama_detail.mapping_sub_stores")}</TabsTrigger>
          <TabsTrigger value="positions">{t("lama_detail.mapping_sub_positions")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("lama_detail.mapping_col_lama")}</TableHead>
                  <TableHead>{t("lama_detail.mapping_col_wfm")}</TableHead>
                  <TableHead>{t("lama_detail.mapping_col_transform")}</TableHead>
                  <TableHead className="text-center w-28">{t("lama_detail.mapping_col_required")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.lama_field}</TableCell>
                    <TableCell>
                      <Select value={row.wfm_field} onValueChange={(v) => updateRow(row.id, "wfm_field", v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(WFM_FIELD_OPTIONS[entity] ?? []).map((f) => (
                            <SelectItem key={f} value={f} className="font-mono text-xs">{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={row.transform} onValueChange={(v) => updateRow(row.id, "transform", v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFORM_OPTIONS.map((tr) => (
                            <SelectItem key={tr} value={tr} className="text-xs">{tr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.required}
                        onCheckedChange={(c) => updateRow(row.id, "required", c)}
                        aria-label={`Required: ${row.lama_field}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {rows.map((row) => (
              <div key={row.id} className="p-3 space-y-2">
                <p className="text-xs font-mono font-medium">{row.lama_field} → {row.wfm_field}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={row.wfm_field} onValueChange={(v) => updateRow(row.id, "wfm_field", v)}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(WFM_FIELD_OPTIONS[entity] ?? []).map((f) => (
                        <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={row.transform} onValueChange={(v) => updateRow(row.id, "transform", v)}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFORM_OPTIONS.map((tr) => (
                        <SelectItem key={tr} value={tr} className="text-xs">{tr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={row.required} onCheckedChange={(c) => updateRow(row.id, "required", c)} aria-label="Required" />
                    Обяз.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background shadow-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Есть несохранённые изменения</span>
            <Button size="sm" disabled={saving} onClick={handleSave} className="gap-2">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {t("lama_detail.mapping_save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
