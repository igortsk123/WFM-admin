import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgentDocument } from "@/lib/api/agent-cabinet";
import type { Locale } from "@/lib/types";
import { formatRelative } from "@/lib/utils/format";
import { DocumentTypeBadge } from "./document-type-badge";
import { formatPeriod, type BadgeDocumentType } from "./_shared";

export function DocumentsTable({
  docs,
  locale,
  onSelect,
  onDownload,
  tType,
  tDownload,
  t,
}: {
  docs: AgentDocument[];
  locale: Locale;
  onSelect: (doc: AgentDocument) => void;
  onDownload: (doc: AgentDocument) => void;
  tType: (key: string) => string;
  tDownload: string;
  t: ReturnType<typeof useTranslations<"screen.agentDocuments">>;
}) {
  return (
    <div className="rounded-md border overflow-hidden hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[160px]">{t("columns.type")}</TableHead>
            <TableHead>{t("columns.period")}</TableHead>
            <TableHead className="w-[160px]">{t("columns.date")}</TableHead>
            <TableHead className="w-[100px] text-right">{t("actions.download")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer hover:bg-accent/30"
              onClick={() => onSelect(doc)}
              tabIndex={0}
              aria-label={tType(doc.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(doc);
              }}
            >
              <TableCell>
                <DocumentTypeBadge type={doc.type as BadgeDocumentType} label={tType(doc.type)} />
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {doc.type !== "CONTRACT" ? formatPeriod(doc.period, locale) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelative(new Date(doc.created_at), locale)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  aria-label={tDownload}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(doc);
                  }}
                >
                  <Download className="size-4 mr-1.5" aria-hidden="true" />
                  {tDownload}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
