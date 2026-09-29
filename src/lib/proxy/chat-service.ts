import "server-only";
import type { ChatTurn, NormalizedAssistantResponse } from "@/lib/chat/types";
import type { RouteId } from "@/lib/chat/routes";
import { anthropicAdapter } from "./adapters/anthropic";
import { googleAdapter } from "./adapters/google";
import { openAIAdapter } from "./adapters/openai";
import { ProxyFailure } from "./errors";
import { SERVER_ROUTE_CONFIG } from "./route-config";

const PROXY_TIMEOUT_MS = 45_000;

const ADAPTERS = {
  "openai-chat": openAIAdapter,
  "anthropic-messages": anthropicAdapter,
  "google-generate-content": googleAdapter,
} as const;

interface SendChatOptions {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export async function sendChatRequest(
  routeId: RouteId,
  messages: ChatTurn[],
  options: SendChatOptions = {},
): Promise<NormalizedAssistantResponse> {
  const config = SERVER_ROUTE_CONFIG[routeId];
  const credential = (options.env ?? process.env)[config.credentialName];

  if (!credential?.trim()) throw new ProxyFailure("CONFIGURATION");

  const request = ADAPTERS[routeId].buildRequest(config, credential, messages);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PROXY_TIMEOUT_MS,
  );

  try {
    const response = await (options.fetcher ?? fetch)(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ProxyFailure("AUTHENTICATION");
      }
      if (response.status === 429) throw new ProxyFailure("RATE_LIMITED");
      if (response.status >= 400 && response.status < 500) {
        throw new ProxyFailure("REQUEST_REJECTED");
      }
      throw new ProxyFailure("UNAVAILABLE");
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      if (controller.signal.aborted) throw new ProxyFailure("TIMEOUT");
      throw new ProxyFailure("INVALID_RESPONSE");
    }

    try {
      return {
        ...ADAPTERS[routeId].parseResponse(body),
        routeId,
      };
    } catch {
      throw new ProxyFailure("INVALID_RESPONSE");
    }
  } catch (error) {
    if (error instanceof ProxyFailure) throw error;
    if (controller.signal.aborted) throw new ProxyFailure("TIMEOUT");
    throw new ProxyFailure("UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}
