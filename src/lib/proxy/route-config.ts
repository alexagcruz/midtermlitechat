import "server-only";
import type { RouteId } from "@/lib/chat/routes";

export const PROXY_BASE_URL = "https://proxy.litechat.ai";

export const SERVER_ROUTE_CONFIG = {
  "openai-chat": {
    path: "/openai/v1/chat/completions",
    model: "gpt-5.6-luna",
    credentialName: "BUILD_OPENAI_KEY",
  },
  "anthropic-messages": {
    path: "/anthropic/v1/messages",
    model: "claude-haiku-4-5-20251001",
    credentialName: "BUILD_ANTHROPIC_KEY",
  },
  "google-generate-content": {
    path: "/google/v1beta/models/gemini-3.8-flash:generateContent",
    model: "gemini-3.8-flash",
    credentialName: "BUILD_GOOGLE_KEY",
  },
} as const satisfies Record<
  RouteId,
  { path: string; model: string; credentialName: string }
>;

export type ServerRouteConfig = (typeof SERVER_ROUTE_CONFIG)[RouteId];
