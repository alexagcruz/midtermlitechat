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

export function buildOpenAIRequest(
  config: ServerRouteConfig,
  credential: string,
  messages: ChatTurn[],
) {
  return {
    url: `${PROXY_BASE_URL}${config.path}`,
    headers: {
      Authorization: `Bearer ${credential}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 1024,
      reasoning_effort: "none",
    }),
  };
}

export function parseOpenAIResponse(value: unknown) {
  const body = asRecord(value);
  const choices = body?.choices;
  const firstChoice = Array.isArray(choices) ? asRecord(choices[0]) : null;
  const message = asRecord(firstChoice?.message);
  const usage = asRecord(body?.usage);

  if (!body || !firstChoice || !message) throw new InvalidProxyResponseError();

  const finishReason =
    typeof firstChoice.finish_reason === "string"
      ? firstChoice.finish_reason
      : null;
  const content = requireText(
    typeof message.content === "string" ? message.content : null,
  );

  return {
    content,
    finishReason,
    incomplete: isIncompleteFinishReason(finishReason),
    usage: normalizeUsage(
      asNonnegativeInteger(usage?.prompt_tokens),
      asNonnegativeInteger(usage?.completion_tokens),
      asNonnegativeInteger(usage?.total_tokens),
    ),
  };
}

export const openAIAdapter: ProxyAdapter = {
  buildRequest: buildOpenAIRequest,
  parseResponse: parseOpenAIResponse,
};
