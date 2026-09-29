import { z } from "zod";
import type { Conversation, ConversationMessage, NormalizedUsage } from "@/lib/chat/types";

export const CONVERSATIONS_STORAGE_KEY = "litechat.conversations.v1";

const routeIdSchema = z.enum([
  "openai-chat",
  "anthropic-messages",
  "google-generate-content",
]);

const usageSchema: z.ZodType<NormalizedUsage> = z
  .object({
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    totalTokens: z.number().int().nonnegative().nullable(),
    totalSource: z.enum(["proxy", "calculated", "unknown"]),
  })
  .strict();

const messageSchema: z.ZodType<ConversationMessage> = z
  .object({
    id: z.string().min(1).max(100),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(100_000),
    createdAt: z.number().int().nonnegative(),
    delivery: z.enum(["pending", "complete", "failed"]).optional(),
    routeId: routeIdSchema.optional(),
    finishReason: z.string().max(100).nullable().optional(),
    incomplete: z.boolean().optional(),
    usage: usageSchema.nullable().optional(),
  })
  .strict();

const conversationSchema: z.ZodType<Conversation> = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(120),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    selectedRouteId: routeIdSchema,
    messages: z.array(messageSchema).max(2_000),
  })
  .strict();

const storedDataSchema = z
  .object({
    version: z.literal(1),
    conversations: z.array(conversationSchema).max(500),
  })
  .strict();

export function loadConversations(storage?: Storage): Conversation[] {
  try {
    const target = storage ?? window.localStorage;
    const raw = target.getItem(CONVERSATIONS_STORAGE_KEY);

    if (!raw) return [];

    const parsed = storedDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.conversations : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[], storage?: Storage): void {
  const target = storage ?? window.localStorage;
  const payload = storedDataSchema.parse({ version: 1, conversations });
  target.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(payload));
}
