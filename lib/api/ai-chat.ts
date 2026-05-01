/**
 * AI Chat API — contextual chat sessions with the AI assistant.
 * All history is archive-only (never deleted). Mock responses use canned answers with 1.5s delay.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  AIChatThread,
  AIChatMessage,
  AIChatContextType,
} from "@/lib/types";
import {
  MOCK_AI_CHAT_THREADS,
  MOCK_AI_CHAT_MESSAGES_THREAD_001,
  MOCK_AI_CHAT_MESSAGES_THREAD_002,
  MOCK_AI_CHAT_MESSAGES_THREAD_005,
  MOCK_AI_CHAT_MESSAGES_THREAD_006,
  MOCK_AI_CHAT_MESSAGES_THREAD_008,
  MOCK_CANNED_RESPONSES,
} from "@/lib/mock-data/ai-chat";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// MESSAGE MAP (threadId → messages)
// ═══════════════════════════════════════════════════════════════════

const THREAD_MESSAGES: Record<string, AIChatMessage[]> = {
  "thread-001": MOCK_AI_CHAT_MESSAGES_THREAD_001,
  "thread-002": MOCK_AI_CHAT_MESSAGES_THREAD_002,
  "thread-005": MOCK_AI_CHAT_MESSAGES_THREAD_005,
  "thread-006": MOCK_AI_CHAT_MESSAGES_THREAD_006,
  "thread-008": MOCK_AI_CHAT_MESSAGES_THREAD_008,
};

// ═══════════════════════════════════════════════════════════════════
// THREADS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of chat threads for current user.
 * @endpoint GET /ai/chat/threads
 */
export async function getAiChatThreads(
  params: ApiListParams & { context_type?: AIChatContextType } = {}
): Promise<ApiListResponse<AIChatThread>> {
  await delay(300);

  const { context_type, page = 1, page_size = 20 } = params;

  let filtered = [...MOCK_AI_CHAT_THREADS];

  if (context_type) filtered = filtered.filter((t) => t.context_type === context_type);

  // Sort newest first
  filtered.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

/**
 * Get a single chat thread with all messages.
 * @endpoint GET /ai/chat/threads/:id
 */
export async function getAiChatThread(
  threadId: string
): Promise<ApiResponse<{ thread: AIChatThread; messages: AIChatMessage[] }>> {
  await delay(350);

  const thread = MOCK_AI_CHAT_THREADS.find((t) => t.id === threadId);
  if (!thread) throw new Error(`Chat thread ${threadId} not found`);

  const messages = THREAD_MESSAGES[threadId] ?? [];

  return { data: { thread, messages } };
}

/**
 * Create a new chat thread, optionally bound to a context entity.
 * @endpoint POST /ai/chat/threads
 */
export async function createAiChatThread(data: {
  context_type: AIChatContextType;
  context_id?: string;
  title?: string;
}): Promise<ApiResponse<AIChatThread>> {
  await delay(400);

  const now = new Date().toISOString();
  const newThread: AIChatThread = {
    id: `thread-${Date.now()}`,
    user_id: 4, // Mock current user
    title: data.title ?? (data.context_id ? `Обсуждение ${data.context_id}` : "Новый чат"),
    context_type: data.context_type,
    context_id: data.context_id ?? null,
    last_message_at: now,
    message_count: 0,
    created_at: now,
  };

  console.log("[v0] Created AI chat thread:", newThread.id);
  return { data: newThread };
}

// ═══════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════

/**
 * Send a message to a thread. Mock returns a canned response after 1.5s delay.
 * @endpoint POST /ai/chat/threads/:id/messages
 */
export async function sendAiChatMessage(
  threadId: string,
  content: string
): Promise<ApiResponse<{ user_message: AIChatMessage; assistant_message: AIChatMessage }>> {
  // Simulate AI thinking delay
  await delay(1500);

  const now = new Date().toISOString();
  const userMsgId = `msg-user-${Date.now()}`;
  const assistantMsgId = `msg-asst-${Date.now() + 1}`;

  const user_message: AIChatMessage = {
    id: userMsgId,
    thread_id: threadId,
    role: "user",
    content,
    created_at: now,
  };

  // Find a matching canned response
  const lowerContent = content.toLowerCase();
  const canned = MOCK_CANNED_RESPONSES.find((r) => {
    const pattern = new RegExp(r.trigger_pattern, "i");
    return pattern.test(lowerContent);
  });

  const assistantContent = canned?.assistant_response ??
    "Понял ваш вопрос. Анализирую данные по магазинам... На основе текущих показателей рекомендую проверить задачи с высоким приоритетом в разделе «Задачи». Если нужна более детальная аналитика — уточните запрос.";

  const assistant_message: AIChatMessage = {
    id: assistantMsgId,
    thread_id: threadId,
    role: "assistant",
    content: assistantContent,
    attached_data: canned?.attached_data,
    created_at: new Date(Date.now() + 100).toISOString(),
  };

  console.log("[v0] Chat message in thread:", threadId, "user:", content.slice(0, 50));
  return { data: { user_message, assistant_message } };
}

/**
 * Send feedback on an AI message (helpful or not).
 * Used to improve future suggestions quality.
 * @endpoint POST /ai/chat/messages/:id/feedback
 */
export async function sendAiFeedback(
  messageId: string,
  helpful: boolean
): Promise<ApiMutationResponse> {
  await delay(200);
  console.log("[v0] AI feedback:", messageId, helpful ? "👍" : "👎");
  return { success: true };
}

/**
 * Archive a chat thread (history preserved — archive-only principle).
 * @endpoint POST /ai/chat/threads/:id/archive
 */
export async function archiveAiChatThread(threadId: string): Promise<ApiMutationResponse> {
  await delay(300);
  const thread = MOCK_AI_CHAT_THREADS.find((t) => t.id === threadId);
  if (!thread) return { success: false, error: { code: "NOT_FOUND", message: `Thread ${threadId} not found` } };
  console.log("[v0] Archived AI chat thread:", threadId);
  return { success: true };
}
