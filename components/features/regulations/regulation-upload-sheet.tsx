"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  File,
  X,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { uploadRegulation } from "@/lib/api/regulations";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Regulation } from "@/lib/types";

// ─── constants ──────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"];
const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".txt"];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <File className="size-6 text-red-500" aria-hidden="true" />;
  if (ext === "doc" || ext === "docx") return <FileText className="size-6 text-blue-500" aria-hidden="true" />;
  return <FileText className="size-6 text-muted-foreground" aria-hidden="true" />;
}

// ─── types ───────────────────────────────────────────────────────────────────

interface RegulationUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful upload so parent can refresh the list */
  onSuccess: () => void;
  /** Existing active regulations (for "replace" combobox) */
  existingRegulations?: Pick<Regulation, "id" | "name">[];
}

// ─── multi-select pill combobox ───────────────────────────────────────────────

interface MultiSelectPillsProps {
  options: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  id: string;
}

function MultiSelectPills({ options, selected, onChange, placeholder, id }: MultiSelectPillsProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) &&
      !selected.includes(o.id),
  );

  const selectedItems = options.filter((o) => selected.includes(o.id));

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* selected pills */}
      <div
        className={cn(
          "flex flex-wrap gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          "cursor-text",
        )}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="listbox"
        id={id}
        role="combobox"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(true); }}
      >
        {selectedItems.map((item) => (
          <Badge
            key={item.id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 text-xs h-6"
          >
            {item.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(item.id); }}
              className="rounded-full hover:bg-accent-foreground/10 p-0.5"
              aria-label={`Remove ${item.name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {selectedItems.length === 0 && (
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Нет вариантов</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={false}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => { toggle(opt.id); setSearch(""); }}
                >
                  {opt.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function RegulationUploadSheet({
  open,
  onOpenChange,
  onSuccess,
  existingRegulations = [],
}: RegulationUploadSheetProps) {
  const t = useTranslations("screen.regulations");
  const tc = useTranslations("common");

  // form state
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [workTypeIds, setWorkTypeIds] = React.useState<number[]>([]);
  const [zoneIds, setZoneIds] = React.useState<number[]>([]);
  const [isReplacing, setIsReplacing] = React.useState(false);
  const [replacesId, setReplacesId] = React.useState<string>("");

  // upload state
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const isDragging = React.useRef(false);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // reset on open
  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setFileError(null);
    setName("");
    setNameError(null);
    setDescription("");
    setWorkTypeIds([]);
    setZoneIds([]);
    setIsReplacing(false);
    setReplacesId("");
    setProgress(0);
  }, [open]);

  function validateFile(f: File): string | null {
    const ok = ALLOWED_TYPES.includes(f.type) || ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) return "Допустимы только PDF, Word и TXT файлы";
    if (f.size > MAX_BYTES) return `Файл слишком большой (максимум 20 МБ)`;
    return null;
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f);
    setFileError(err);
    if (!err) {
      setFile(f);
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDrag(true);
  }
  function handleDragLeave() {
    setDrag(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let valid = true;
    if (!file) { setFileError(t("upload_sheet.validation_file_required")); valid = false; }
    if (!name.trim()) { setNameError(t("upload_sheet.validation_name_required")); valid = false; }
    if (!valid) return;

    setUploading(true);

    // fake progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 120);

    try {
      const result = await uploadRegulation(file!, {
        name: name.trim(),
        description: description.trim() || undefined,
        work_type_ids: workTypeIds.length > 0 ? workTypeIds : undefined,
        zone_ids: zoneIds.length > 0 ? zoneIds : undefined,
        replaces_id: isReplacing && replacesId ? replacesId : undefined,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        toast.success(t("toasts.uploaded"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      clearInterval(progressInterval);
      toast.error(t("toasts.error"));
    } finally {
      setUploading(false);
    }
  }

  const workTypeOptions = MOCK_WORK_TYPES.slice(0, 13); // retail-only
  const zoneOptions = MOCK_ZONES;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg flex flex-col p-0 sm:max-w-lg"
        aria-label={t("upload_sheet.title")}
      >
        <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
          <SheetTitle className="text-base font-semibold">
            {t("upload_sheet.title")}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
          noValidate
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Drop zone */}
            <div className="space-y-1.5">
              <Label>{t("upload_sheet.file_label")}</Label>
              <div
                role="button"
                tabIndex={0}
                aria-label={t("upload_sheet.file_drop_hint")}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed",
                  "min-h-32 w-full px-4 py-6 text-center transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  drag
                    ? "border-primary bg-primary/5"
                    : fileError
                    ? "border-destructive bg-destructive/5"
                    : file
                    ? "border-success bg-success/5"
                    : "border-border hover:border-primary/40 hover:bg-accent/30",
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                }}
              >
                {file ? (
                  <>
                    {getFileIcon(file.name)}
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setFileError(null); }}
                    >
                      <X className="size-3 mr-1" /> Заменить
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("upload_sheet.file_drop_hint")}</p>
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = "";
                }}
                aria-hidden="true"
              />
              {fileError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="size-3 shrink-0" />
                  {fileError}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">{t("upload_sheet.name_label")}</Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameError) setNameError(null); }}
                placeholder="Например: Регламент выкладки молочного отдела"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "reg-name-error" : undefined}
                className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
              />
              {nameError && (
                <p id="reg-name-error" className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                  <AlertCircle className="size-3 shrink-0" />
                  {nameError}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-description">
                {t("upload_sheet.description_label")}
              </Label>
              <Textarea
                id="reg-description"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 200) setDescription(e.target.value);
                }}
                placeholder="Краткое описание содержимого для ИИ-контекста"
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/200
              </p>
            </div>

            {/* Work types */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-work-types">{t("upload_sheet.work_types_label")}</Label>
              <MultiSelectPills
                id="reg-work-types"
                options={workTypeOptions.map((wt) => ({ id: wt.id, name: wt.name }))}
                selected={workTypeIds}
                onChange={setWorkTypeIds}
                placeholder="Выберите типы работ..."
              />
            </div>

            {/* Zones */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-zones">{t("upload_sheet.zones_label")}</Label>
              <MultiSelectPills
                id="reg-zones"
                options={zoneOptions.map((z) => ({ id: z.id, name: z.name }))}
                selected={zoneIds}
                onChange={setZoneIds}
                placeholder="Выберите зоны..."
              />
            </div>

            {/* Replaces existing */}
            {existingRegulations.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="reg-is-replacing" className="font-normal cursor-pointer">
                    Заменяет существующий документ
                  </Label>
                  <Switch
                    id="reg-is-replacing"
                    checked={isReplacing}
                    onCheckedChange={setIsReplacing}
                  />
                </div>
                {isReplacing && (
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-replaces">Какой документ заменяет</Label>
                    <select
                      id="reg-replaces"
                      value={replacesId}
                      onChange={(e) => setReplacesId(e.target.value)}
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
                        "text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <option value="">Выберите документ...</option>
                      {existingRegulations.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Загрузка {progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-border px-6 py-4 shrink-0 flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              {t("upload_sheet.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={uploading}
            >
              <Upload className="size-4 mr-2" />
              {t("upload_sheet.submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
