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

export function buildAnthropicRequest(
  config: ServerRouteConfig,
  credential: string,
  messages: ChatTurn[],
) {
  return {
    url: `${PROXY_BASE_URL}${config.path}`,
    headers: {
      "x-api-key": credential,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 1024,
      thinking: { type: "disabled" },
    }),
  };
}

export function parseAnthropicResponse(value: unknown) {
  const body = asRecord(value);
  const blocks = body?.content;
  const usage = asRecord(body?.usage);

  if (!body || !Array.isArray(blocks)) throw new InvalidProxyResponseError();

  const text = blocks
    .map((block) => asRecord(block))
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block?.text as string)
    .join("");
  const finishReason =
    typeof body.stop_reason === "string" ? body.stop_reason : null;
  const content = requireText(text);

  return {
    content,
    finishReason,
    incomplete: isIncompleteFinishReason(finishReason),
    usage: normalizeUsage(
      asNonnegativeInteger(usage?.input_tokens),
      asNonnegativeInteger(usage?.output_tokens),
      null,
    ),
  };
}

export const anthropicAdapter: ProxyAdapter = {
  buildRequest: buildAnthropicRequest,
  parseResponse: parseAnthropicResponse,
};
