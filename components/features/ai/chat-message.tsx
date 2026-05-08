"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AIChatMessage } from "@/lib/types";

const InlineChart = dynamic(
  () => import("./inline-chart").then((m) => m.InlineChart),
  {
    ssr: false,
    loading: () => <Skeleton className="mt-3 h-[180px] w-full rounded-md" />,
  }
);

interface ChatMessageProps {
  message: AIChatMessage;
  onFeedback?: (messageId: string, helpful: boolean) => void;
  onCreateTask?: (messageId: string) => void;
  showActions?: boolean;
}

// Simple markdown-like formatting (bold with ** and lists with -)
function formatContent(text: string): React.ReactNode {
  // Split by newlines first
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    // Handle list items
    const isList = line.trim().startsWith("-") || /^\d+\./.test(line.trim());
    const listContent = isList
      ? line.replace(/^[\s]*[-•][\s]*/, "").replace(/^\d+\.\s*/, "")
      : line;

    // Handle bold **text**
    const parts = (isList ? listContent : line).split(/(\*\*[^*]+\*\*)/g);
    const formattedParts = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={partIdx} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (isList) {
      return (
        <li key={lineIdx} className="ml-4">
          {formattedParts}
        </li>
      );
    }

    return (
      <span key={lineIdx}>
        {formattedParts}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

// Inline table renderer
function InlineTable({ payload }: { payload: Record<string, unknown> }) {
  const columns = (payload.columns as string[]) || [];
  const rows = (payload.rows as string[][]) || [];

  return (
    <div className="mt-3 overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="whitespace-nowrap px-3 py-2 text-left font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-t">
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="whitespace-nowrap px-3 py-2"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Document excerpt renderer
function DocumentExcerpt({ payload }: { payload: Record<string, unknown> }) {
  const title = payload.title as string | undefined;
  const excerpt = payload.excerpt as string | undefined;

  return (
    <Card className="mt-3 p-3">
      {title && (
        <p className="mb-1 text-xs font-medium text-foreground">{title}</p>
      )}
      {excerpt && (
        <p className="text-xs text-muted-foreground italic">{excerpt}</p>
      )}
    </Card>
  );
}

export function ChatMessage({
  message,
  onFeedback,
  onCreateTask,
  showActions = true,
}: ChatMessageProps) {
  const t = useTranslations("screen.aiChat.messages.actions");

  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    toast.success(t("copy"));
  };

  // Render attached data
  const renderAttachedData = () => {
    if (!message.attached_data) return null;
    const { data_type, payload } = message.attached_data;

    switch (data_type) {
      case "chart":
        return <InlineChart payload={payload} />;
      case "table":
        return <InlineTable payload={payload} />;
      case "document_excerpt":
        return <DocumentExcerpt payload={payload} />;
      default:
        return null;
    }
  };

  if (!isAssistant) {
    // User message — right-aligned
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-lg bg-primary px-4 py-3 text-primary-foreground md:max-w-[75%]">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-4 text-primary" />
      </div>

      {/* Bubble */}
      <div className="flex max-w-[90%] flex-col md:max-w-[75%]">
        <div className="rounded-lg border bg-card p-4">
          <div className="whitespace-pre-wrap text-sm">
            {formatContent(message.content)}
          </div>
          {renderAttachedData()}
        </div>

        {/* Actions */}
        {showActions && (
          <TooltipProvider>
            <div className="mt-2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7",
                      message.helpful === true && "text-success"
                    )}
                    onClick={() => onFeedback?.(message.id, true)}
                  >
                    <ThumbsUp className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("thumbs_up_tooltip")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7",
                      message.helpful === false && "text-destructive"
                    )}
                    onClick={() => onFeedback?.(message.id, false)}
                  >
                    <ThumbsDown className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("thumbs_down_tooltip")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleCopy}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("copy")}</TooltipContent>
              </Tooltip>

              {/* Show create task button for actionable messages */}
              {message.content.toLowerCase().includes("задач") && onCreateTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-7 gap-1.5 text-xs"
                  onClick={() => onCreateTask(message.id)}
                >
                  <ListTodo className="size-3.5" />
                  {t("create_task_from_advice")}
                </Button>
              )}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  const t = useTranslations("screen.aiChat.messages");

  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-4 animate-pulse text-primary" />
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
        <div className="flex gap-1">
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
        </div>
        <span className="text-xs text-muted-foreground">{t("typing_label")}</span>
      </div>
    </div>
  );
}
