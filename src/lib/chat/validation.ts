import { z } from "zod";

export const MAX_MESSAGES = 80;
export const MAX_MESSAGE_CHARACTERS = 12_000;
export const MAX_REQUEST_BYTES = 256_000;

const routeIdSchema = z.enum([
  "openai-chat",
  "anthropic-messages",
  "google-generate-content",
]);

const chatTurnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(MAX_MESSAGE_CHARACTERS).refine((value) => value.trim().length > 0),
  })
  .strict();

const chatRequestSchema = z
  .object({
    routeId: routeIdSchema,
    messages: z.array(chatTurnSchema).min(1).max(MAX_MESSAGES),
  })
  .strict()
  .refine((request) => request.messages.at(-1)?.role === "user");

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;

export type ChatBodyParseResult =
  | { success: true; data: ValidatedChatRequest }
  | { success: false; status: 400 | 413; message: string };

export function parseChatBody(rawBody: string): ChatBodyParseResult {
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return {
      success: false,
      status: 413,
      message: "This message history is too large. Start a new conversation or shorten it.",
    };
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return {
      success: false,
      status: 400,
      message: "The chat request is not valid JSON.",
    };
  }

  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return {
      success: false,
      status: 400,
      message: "The chat request is invalid or exceeds the supported limits.",
    };
  }

  return { success: true, data: parsed.data };
}
