import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentDocument } from "@/lib/api/agent-cabinet";
import type { Locale } from "@/lib/types";
import { formatRelative } from "@/lib/utils/format";
import { DocumentTypeBadge } from "./document-type-badge";
import { formatPeriod, type BadgeDocumentType } from "./_shared";

export function DocumentCard({
  doc,
  locale,
  onSelect,
  onDownload,
  tType,
  tDownload,
  tCreated,
}: {
  doc: AgentDocument;
  locale: Locale;
  onSelect: () => void;
  onDownload: () => void;
  tType: (key: string) => string;
  tDownload: string;
  tCreated: string;
}) {
  return (
    <article
      className="rounded-lg border bg-card p-4 flex gap-3 items-start cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={tType(doc.type)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      {/* Icon */}
      <span
        className="flex size-10 items-center justify-center rounded-md bg-muted shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <FileText className="size-5 text-muted-foreground" />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <DocumentTypeBadge type={doc.type as BadgeDocumentType} label={tType(doc.type)} />
        {doc.type !== "CONTRACT" && (
          <p className="text-sm text-foreground font-medium truncate">
            {formatPeriod(doc.period, locale)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {tCreated}: {formatRelative(new Date(doc.created_at), locale)}
        </p>
      </div>

      {/* Download */}
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 min-h-[44px] min-w-[44px]"
        aria-label={tDownload}
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
      >
        <Download className="size-4" aria-hidden="true" />
        <span className="sr-only">{tDownload}</span>
      </Button>
    </article>
  );
}
