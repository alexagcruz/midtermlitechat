import type { RouteId } from "./routes";

export type MessageRole = "user" | "assistant";

export interface ChatTurn {
  role: MessageRole;
  content: string;
}

export type UsageTotalSource = "proxy" | "calculated" | "unknown";

export interface NormalizedUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  totalSource: UsageTotalSource;
}

export interface NormalizedAssistantResponse {
  content: string;
  routeId: RouteId;
  finishReason: string | null;
  incomplete: boolean;
  usage: NormalizedUsage;
}

export interface ConversationMessage extends ChatTurn {
  id: string;
  createdAt: number;
  delivery?: "pending" | "complete" | "failed";
  routeId?: RouteId;
  finishReason?: string | null;
  incomplete?: boolean;
  usage?: NormalizedUsage | null;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  selectedRouteId: RouteId;
  messages: ConversationMessage[];
}
