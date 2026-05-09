import { File, FileText } from "lucide-react";

export function FileIcon({ type }: { type: string }) {
  if (type === "PDF") return <File className="size-4 text-red-500 shrink-0" aria-hidden="true" />;
  if (type === "WORD") return <FileText className="size-4 text-blue-500 shrink-0" aria-hidden="true" />;
  return <FileText className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />;
}
