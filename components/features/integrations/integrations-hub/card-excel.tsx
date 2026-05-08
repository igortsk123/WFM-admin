"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  X,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { uploadExcel, getExcelImportHistory } from "@/lib/api/integrations";
import type {
  IntegrationsStatus,
  ExcelImportEvent,
} from "@/lib/api/integrations";
import { formatDateTime } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

import { StatItem, type Translator } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// EXCEL UPLOAD DIALOG
// ═══════════════════════════════════════════════════════════════════

export function ExcelUploadDialog({
  open,
  onOpenChange,
  onDone,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  t: Translator;
}) {
  const [uploadType, setUploadType] = React.useState<"EMPLOYEES" | "SCHEDULE" | "STORES">("SCHEDULE");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      await uploadExcel(file, uploadType);
      toast.success(t("toasts.excel_uploaded"));
      onDone();
      onOpenChange(false);
      setFile(null);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cards.excel.upload_dialog_title")}</DialogTitle>
          <DialogDescription>{t("cards.excel.upload_dialog_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("cards.excel.upload_type_label")}</Label>
            <Select value={uploadType} onValueChange={(v) => setUploadType(v as typeof uploadType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEES">{t("cards.excel.type_EMPLOYEES")}</SelectItem>
                <SelectItem value="SCHEDULE">{t("cards.excel.type_SCHEDULE")}</SelectItem>
                <SelectItem value="STORES">{t("cards.excel.type_STORES")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-foreground">{t("cards.excel.drop_hint")}</p>
              <p className="text-xs text-muted-foreground">{t("cards.excel.drop_hint_sub")}</p>
            </div>
            {file && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs">
                <FileSpreadsheet className="size-3.5 text-success" />
                <span className="font-medium truncate max-w-48">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button disabled={!file || uploading} onClick={handleUpload}>
              {uploading && <Loader2 className="size-4 animate-spin" />}
              {t("cards.excel.upload")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL HISTORY DIALOG
// ═══════════════════════════════════════════════════════════════════

export function ExcelHistoryDialog({
  open,
  onOpenChange,
  history,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  history: ExcelImportEvent[];
  locale: Locale;
  t: Translator;
}) {
  function statusBadge(status: ExcelImportEvent["status"]) {
    if (status === "SUCCESS")
      return <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-xs">Успех</Badge>;
    if (status === "PARTIAL")
      return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5 text-xs">Частично</Badge>;
    return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("cards.excel.history_dialog_title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Нет данных</p>
          ) : (
            history.map((imp) => (
              <div key={imp.id} className="flex items-start justify-between gap-3 rounded-md p-2 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="size-4 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{imp.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`cards.excel.type_${imp.type}`)} · {imp.uploaded_by_name} · {formatDateTime(new Date(imp.uploaded_at), locale)}
                    </p>
                    {imp.error_summary && (
                      <p className="text-xs text-warning mt-0.5">{imp.error_summary}</p>
                    )}
                  </div>
                </div>
                {statusBadge(imp.status)}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL CARD
// ═══════════════════════════════════════════════════════════════════

interface ExcelCardProps {
  status: IntegrationsStatus;
  excelHistory: ExcelImportEvent[];
  onHistoryUpdate: (history: ExcelImportEvent[]) => void;
}

export function ExcelCard({ status, excelHistory, onHistoryUpdate }: ExcelCardProps) {
  const t = useTranslations("screen.integrations");
  const locale = useLocale() as Locale;
  const [excelUploadOpen, setExcelUploadOpen] = React.useState(false);
  const [excelHistoryOpen, setExcelHistoryOpen] = React.useState(false);

  const excelLastUpload = status.excel.last_upload_at
    ? formatDateTime(new Date(status.excel.last_upload_at), locale)
    : "—";

  const recentExcel = excelHistory.slice(0, 3);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{t("cards.excel.title")}</p>
              <p className="text-xs text-muted-foreground leading-snug">{t("cards.excel.description")}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-3 space-y-3">
          <div className="grid grid-cols-1 gap-1.5">
            <StatItem
              label={t("cards.excel.monthly_imports")}
              value={status.excel.monthly_imports_count ?? "—"}
            />
            {status.excel.last_upload_at && (
              <StatItem
                label={t("cards.excel.last_import")}
                value={`${excelLastUpload}${status.excel.last_upload_by_name ? ` — ${status.excel.last_upload_by_name}` : ""}`}
              />
            )}
          </div>
          {recentExcel.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-xs font-medium text-muted-foreground">{t("cards.excel.history_title")}</p>
              {recentExcel.map((imp) => (
                <div key={imp.id} className="flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground min-w-0">{imp.file_name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] ml-auto shrink-0",
                      imp.status === "SUCCESS" && "text-success border-success/30",
                      imp.status === "PARTIAL" && "text-warning border-warning/30",
                      imp.status === "ERROR" && "text-destructive border-destructive/30",
                    )}
                  >
                    {imp.status === "SUCCESS" ? "Успех" : imp.status === "PARTIAL" ? "Частично" : "Ошибка"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2 border-t border-border pt-3">
          <Button size="sm" onClick={() => setExcelUploadOpen(true)} className="gap-2">
            <Upload className="size-3.5" />
            {t("cards.excel.upload")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExcelHistoryOpen(true)}>
            История
          </Button>
        </CardFooter>
      </Card>

      <ExcelUploadDialog
        open={excelUploadOpen}
        onOpenChange={setExcelUploadOpen}
        onDone={async () => {
          const res = await getExcelImportHistory();
          onHistoryUpdate(res.data);
        }}
        t={t}
      />

      <ExcelHistoryDialog
        open={excelHistoryOpen}
        onOpenChange={setExcelHistoryOpen}
        history={excelHistory}
        locale={locale}
        t={t}
      />
    </>
  );
}
