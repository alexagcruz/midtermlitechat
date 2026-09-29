import type { ChatTurn, NormalizedUsage } from "@/lib/chat/types";
import type { ServerRouteConfig } from "./route-config";

export interface OutboundProxyRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface ParsedProxyResponse {
  content: string;
  finishReason: string | null;
  incomplete: boolean;
  usage: NormalizedUsage;
}

export interface ProxyAdapter {
  buildRequest(
    config: ServerRouteConfig,
    credential: string,
    messages: ChatTurn[],
  ): OutboundProxyRequest;
  parseResponse(value: unknown): ParsedProxyResponse;
}
