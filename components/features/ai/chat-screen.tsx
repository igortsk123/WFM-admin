"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles, Send, Mic, History, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { AIChatThread, AIChatMessage, AIChatContextType, Locale } from "@/lib/types";
import {
  getAiChatThreads,
  getAiChatThread,
  createAiChatThread,
  sendAiChatMessage,
  sendAiFeedback,
  archiveAiChatThread,
} from "@/lib/api/ai-chat";

import { ContextBanner } from "./context-banner";
import { ChatMessage, TypingIndicator } from "./chat-message";
import { ChatThreadList } from "./chat-thread-list";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ChatState {
  threads: AIChatThread[];
  activeThread: AIChatThread | null;
  messages: AIChatMessage[];
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isTyping: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AIChatScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("screen.aiChat");
  const tCommon = useTranslations("common");
  const _locale = useLocale() as Locale;

  // URL params
  const urlThreadId = searchParams.get("thread_id");
  const urlContextType = searchParams.get("context_type") as AIChatContextType | null;
  const urlContextId = searchParams.get("context_id");

  // State
  const [state, setState] = useState<ChatState>({
    threads: [],
    activeThread: null,
    messages: [],
    isLoadingThreads: true,
    isLoadingMessages: false,
    isTyping: false,
    error: null,
  });

  const [inputValue, setInputValue] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [threadToArchive, setThreadToArchive] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.isTyping, scrollToBottom]);

  // ─────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────

  // Load threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const result = await getAiChatThreads();
        setState((prev) => ({
          ...prev,
          threads: result.data,
          isLoadingThreads: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoadingThreads: false,
          error: t("states.error_sending"),
        }));
      }
    };
    loadThreads();
  }, [t]);

  // Load thread from URL params or create new one
  useEffect(() => {
    const loadOrCreateThread = async () => {
      // If a thread ID is provided, load it
      if (urlThreadId) {
        setState((prev) => ({ ...prev, isLoadingMessages: true }));
        try {
          const result = await getAiChatThread(urlThreadId);
          setState((prev) => ({
            ...prev,
            activeThread: result.data.thread,
            messages: result.data.messages,
            isLoadingMessages: false,
          }));
        } catch {
          setState((prev) => ({
            ...prev,
            isLoadingMessages: false,
            error: t("states.error_sending"),
          }));
        }
        return;
      }

      // If context params provided but no thread, create a new thread
      if (urlContextType && urlContextType !== "general") {
        setState((prev) => ({ ...prev, isLoadingMessages: true }));
        try {
          const result = await createAiChatThread({
            context_type: urlContextType,
            context_id: urlContextId || undefined,
          });
          setState((prev) => ({
            ...prev,
            activeThread: result.data,
            messages: [],
            threads: [result.data, ...prev.threads],
            isLoadingMessages: false,
          }));
          // Update URL
          router.replace(ADMIN_ROUTES.aiChatThread(result.data.id));
        } catch {
          setState((prev) => ({
            ...prev,
            isLoadingMessages: false,
            error: t("states.error_sending"),
          }));
        }
      }
    };

    if (!state.isLoadingThreads) {
      loadOrCreateThread();
    }
  }, [urlThreadId, urlContextType, urlContextId, state.isLoadingThreads, router, t]);

  // ─────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      setMobileSheetOpen(false);
      setState((prev) => ({ ...prev, isLoadingMessages: true, error: null }));
      router.push(ADMIN_ROUTES.aiChatThread(threadId));

      try {
        const result = await getAiChatThread(threadId);
        setState((prev) => ({
          ...prev,
          activeThread: result.data.thread,
          messages: result.data.messages,
          isLoadingMessages: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoadingMessages: false,
          error: t("states.error_sending"),
        }));
      }
    },
    [router, t]
  );

  const handleNewChat = useCallback(async () => {
    setMobileSheetOpen(false);
    setState((prev) => ({ ...prev, isLoadingMessages: true, error: null }));

    try {
      const result = await createAiChatThread({ context_type: "general" });
      setState((prev) => ({
        ...prev,
        activeThread: result.data,
        messages: [],
        threads: [result.data, ...prev.threads],
        isLoadingMessages: false,
      }));
      router.push(ADMIN_ROUTES.aiChatThread(result.data.id));
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingMessages: false,
        error: t("states.error_sending"),
      }));
    }
  }, [router, t]);

  const handleSendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || !state.activeThread) return;

    setInputValue("");
    setState((prev) => ({ ...prev, error: null }));

    // Optimistically add user message
    const tempUserMsg: AIChatMessage = {
      id: `temp-${Date.now()}`,
      thread_id: state.activeThread.id,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, tempUserMsg],
      isTyping: true,
    }));

    try {
      const result = await sendAiChatMessage(state.activeThread.id, content);
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages.filter((m) => m.id !== tempUserMsg.id),
          result.data.user_message,
          result.data.assistant_message,
        ],
        isTyping: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isTyping: false,
        error: t("states.error_sending"),
      }));
    }
  }, [inputValue, state.activeThread, t]);

  const handleFeedback = useCallback(
    async (messageId: string, helpful: boolean) => {
      try {
        await sendAiFeedback(messageId, helpful);
        toast.success(t("toasts.thanks_for_feedback"));
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === messageId ? { ...m, helpful } : m
          ),
        }));
      } catch {
        toast.error(t("toasts.error"));
      }
    },
    [t]
  );

  const handleCreateTask = useCallback(
    (messageId: string) => {
      // Navigate to task creation with context
      router.push(ADMIN_ROUTES.taskNew);
    },
    [router]
  );

  const handleArchiveThread = useCallback((threadId: string) => {
    setThreadToArchive(threadId);
    setArchiveDialogOpen(true);
  }, []);

  const confirmArchiveThread = useCallback(async () => {
    if (!threadToArchive) return;

    try {
      await archiveAiChatThread(threadToArchive);
      toast.success(t("toasts.thread_archived"));
      setState((prev) => ({
        ...prev,
        threads: prev.threads.filter((th) => th.id !== threadToArchive),
        activeThread:
          prev.activeThread?.id === threadToArchive ? null : prev.activeThread,
        messages: prev.activeThread?.id === threadToArchive ? [] : prev.messages,
      }));
      if (state.activeThread?.id === threadToArchive) {
        router.push(ADMIN_ROUTES.aiChat);
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setArchiveDialogOpen(false);
      setThreadToArchive(null);
    }
  }, [threadToArchive, state.activeThread, router, t]);

  const handleVoiceInput = useCallback(() => {
    toast.info(t("composer.voice_coming_soon_toast"));
  }, [t]);

  const handleCloseContext = useCallback(() => {
    if (state.activeThread) {
      // For now just navigate to general chat
      router.push(ADMIN_ROUTES.aiChat);
      setState((prev) => ({
        ...prev,
        activeThread: null,
        messages: [],
      }));
    }
  }, [state.activeThread, router]);

  const handleChipClick = useCallback((chipText: string) => {
    setInputValue(chipText);
    textareaRef.current?.focus();
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // CONTEXT CHIPS
  // ─────────────────────────────────────────────────────────────────

  const contextChips = useMemo(() => {
    if (!state.activeThread) return [];
    const contextType = state.activeThread.context_type;

    switch (contextType) {
      case "suggestion":
        return [
          t("messages.context_chips.suggestion_data_source"),
          t("messages.context_chips.suggestion_similar"),
          t("messages.context_chips.suggestion_disagree"),
        ];
      case "goal":
        return [
          t("messages.context_chips.goal_actions"),
          t("messages.context_chips.goal_lagging"),
          t("messages.context_chips.goal_forecast"),
        ];
      case "chart":
        return [
          t("messages.context_chips.chart_meaning"),
          t("messages.context_chips.chart_why"),
          t("messages.context_chips.chart_action"),
        ];
      default:
        return [];
    }
  }, [state.activeThread, t]);

  const suggestionChips = [
    t("messages.suggestion_chips.worst_oos"),
    t("messages.suggestion_chips.explain_returns"),
    t("messages.suggestion_chips.today_priorities"),
    t("messages.suggestion_chips.team_status"),
  ];

  // ─────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────

  const renderThreadsList = () => (
    <ChatThreadList
      threads={state.threads}
      activeThreadId={state.activeThread?.id}
      onSelectThread={handleSelectThread}
      onNewChat={handleNewChat}
      onArchiveThread={handleArchiveThread}
    />
  );

  const renderEmptyState = () => (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-8 text-primary" />
      </div>
      <div className="space-y-1 text-center">
        <h3 className="font-semibold">{t("messages.empty_thread_title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("messages.empty_thread_subtitle")}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestionChips.map((chip) => (
          <Button
            key={chip}
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => handleChipClick(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
    </div>
  );

  const renderMessages = () => (
    <ScrollArea className="flex-1 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {state.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onFeedback={handleFeedback}
            onCreateTask={handleCreateTask}
          />
        ))}
        {state.isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );

  const renderMessagesSkeleton = () => (
    <div className="flex-1 space-y-6 p-4">
      <div className="flex gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-20 w-3/4" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-1/2" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-24 w-2/3" />
      </div>
    </div>
  );

  const renderComposer = () => (
    <div className="sticky bottom-0 space-y-3 border-t bg-background p-4 pb-safe">
      {/* Context chips */}
      {contextChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {contextChips.map((chip) => (
            <Button
              key={chip}
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      )}

      {/* Error alert */}
      {state.error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{state.error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState((prev) => ({ ...prev, error: null }))}
            >
              {t("states.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          onClick={handleVoiceInput}
          aria-label={t("composer.voice_button_tooltip")}
        >
          <Mic className="size-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t("composer.placeholder")}
          className="min-h-[40px] max-h-[160px] flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />

        <Button
          size="icon"
          className="size-10 shrink-0"
          disabled={!inputValue.trim() || !state.activeThread}
          onClick={handleSendMessage}
          aria-label={t("composer.send_button_tooltip")}
        >
          <Send className="size-4" />
        </Button>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">{t("composer.hint")}</p>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────

  if (state.isLoadingThreads) {
    return (
      <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[280px_1fr]">
        <div className="hidden space-y-2 border-r bg-muted/30 p-3 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <div className="flex flex-col">
          <Skeleton className="h-14 w-full" />
          <div className="flex-1 space-y-6 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-3/4" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid h-[calc(100vh-7rem)] lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">{renderThreadsList()}</div>

        {/* Chat area */}
        <div className="flex flex-col">
          {/* Mobile header with sheet trigger */}
          <div className="flex items-center gap-2 border-b p-2 lg:hidden">
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <History className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                {renderThreadsList()}
              </SheetContent>
            </Sheet>
            <h1 className="flex-1 text-sm font-medium">{t("page_title")}</h1>
          </div>

          {/* Context banner */}
          {state.activeThread && (
            <ContextBanner
              contextType={state.activeThread.context_type}
              contextId={state.activeThread.context_id}
              contextTitle={state.activeThread.title}
              onClose={
                state.activeThread.context_type !== "general"
                  ? handleCloseContext
                  : undefined
              }
            />
          )}

          {/* Messages area */}
          {state.isLoadingMessages ? (
            renderMessagesSkeleton()
          ) : !state.activeThread || state.messages.length === 0 ? (
            renderEmptyState()
          ) : (
            renderMessages()
          )}

          {/* Composer */}
          {state.activeThread && renderComposer()}
        </div>
      </div>

      {/* Archive confirmation dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <ConfirmDialog
          title={t("delete_dialog.title")}
          message={t("delete_dialog.description")}
          confirmLabel={t("delete_dialog.confirm")}
          cancelLabel={tCommon("cancel")}
          variant="destructive"
          onConfirm={confirmArchiveThread}
          onOpenChange={setArchiveDialogOpen}
        />
      </AlertDialog>
    </>
  );
}
