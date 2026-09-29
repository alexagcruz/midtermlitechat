import type { ChatTurn } from "@/lib/chat/types";
import type { ProxyAdapter } from "../adapter-types";
import { PROXY_BASE_URL } from "../route-config";
import {
  asNonnegativeInteger,
  asRecord,
  InvalidProxyResponseError,
  isIncompleteFinishReason,
  normalizeUsage,
  requireText,
} from "../response-utils";
import type { ServerRouteConfig } from "../route-config";

export function buildGoogleRequest(
  config: ServerRouteConfig,
  credential: string,
  messages: ChatTurn[],
) {
  return {
    url: `${PROXY_BASE_URL}${config.path}`,
    headers: {
      "x-goog-api-key": credential,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  };
}

export function parseGoogleResponse(value: unknown) {
  const body = asRecord(value);
  const candidates = body?.candidates;
  const candidate = Array.isArray(candidates) ? asRecord(candidates[0]) : null;
  const content = asRecord(candidate?.content);
  const parts = content?.parts;
  const usage = asRecord(body?.usageMetadata);

  if (!body || !candidate || !Array.isArray(parts)) {
    throw new InvalidProxyResponseError();
  }

  const text = parts
    .map((part) => asRecord(part))
    .filter((part) => typeof part?.text === "string")
    .map((part) => part?.text as string)
    .join("");
  const finishReason =
    typeof candidate.finishReason === "string" ? candidate.finishReason : null;

  return {
    content: requireText(text),
    finishReason,
    incomplete: isIncompleteFinishReason(finishReason),
    usage: normalizeUsage(
      asNonnegativeInteger(usage?.promptTokenCount),
      asNonnegativeInteger(usage?.candidatesTokenCount),
      asNonnegativeInteger(usage?.totalTokenCount),
    ),
  };
}

export const googleAdapter: ProxyAdapter = {
  buildRequest: buildGoogleRequest,
  parseResponse: parseGoogleResponse,
};
