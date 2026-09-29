import { z } from "zod";

const routeIdSchema = z.enum([
  "openai-chat",
  "anthropic-messages",
  "google-generate-content",
]);

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  totalSource: z.enum(["proxy", "calculated", "unknown"]),
});

export const chatResponseSchema = z.object({
  assistant: z.object({
    content: z.string().min(1),
    routeId: routeIdSchema,
    finishReason: z.string().nullable(),
    incomplete: z.boolean(),
    usage: usageSchema,
  }),
});

export const chatErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
