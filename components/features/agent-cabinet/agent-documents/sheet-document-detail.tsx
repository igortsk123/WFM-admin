import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AgentDocument } from "@/lib/api/agent-cabinet";
import type { Locale } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { DocumentTypeBadge } from "./document-type-badge";
import { formatPeriod, generateSignedUrl, type BadgeDocumentType } from "./_shared";

export function DocumentDetailSheet({
  doc,
  open,
  onOpenChange,
  locale,
  onDownload,
}: {
  doc: AgentDocument | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
  onDownload: (doc: AgentDocument) => void;
}) {
  const t = useTranslations("screen.agentDocuments");

  if (!doc) return null;

  const isPdf = doc.url.toLowerCase().endsWith(".pdf");
  const typeLabel = t(`type.${doc.type}`);
  const signedUrl = generateSignedUrl(doc);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-md flex flex-col overflow-hidden"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle>{t("detail_sheet.title")}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 flex-1 overflow-y-auto min-h-0">
          {/* PDF Preview */}
          {isPdf ? (
            <div className="rounded-lg border bg-muted overflow-hidden w-full aspect-[3/4]">
              <iframe
                src={signedUrl}
                className="w-full h-full"
                title={typeLabel}
                aria-label={typeLabel}
              />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted aspect-[3/4]"
              aria-hidden="true"
            >
              <FileText className="size-16 text-muted-foreground" strokeWidth={1} />
              <span className="text-sm text-muted-foreground">{typeLabel}</span>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <section aria-label="Metadata" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("detail_sheet.meta_type")}</span>
              <DocumentTypeBadge type={doc.type as BadgeDocumentType} label={typeLabel} />
            </div>
            {doc.type !== "CONTRACT" && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("detail_sheet.meta_period")}</span>
                <span className="text-sm text-foreground">{formatPeriod(doc.period, locale)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("detail_sheet.meta_created_at")}</span>
              <span className="text-sm text-foreground">{formatDate(new Date(doc.created_at), locale)}</span>
            </div>
          </section>
        </div>

        {/* Download action */}
        <div className="shrink-0 pt-4 border-t mt-4">
          <Button
            className="w-full min-h-[44px]"
            onClick={() => onDownload(doc)}
          >
            <Download className="size-4 mr-2" aria-hidden="true" />
            {t("detail_sheet.download")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
