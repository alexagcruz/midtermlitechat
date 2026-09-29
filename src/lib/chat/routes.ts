export const ROUTE_OPTIONS = [
  { id: "openai-chat", label: "OpenAI-compatible Chat Completions" },
  { id: "anthropic-messages", label: "Anthropic-compatible Messages" },
  { id: "google-generate-content", label: "Google-compatible Gemini" },
] as const;

export type RouteId = (typeof ROUTE_OPTIONS)[number]["id"];

export function routeLabel(routeId: RouteId): string {
  return (
    ROUTE_OPTIONS.find((route) => route.id === routeId)?.label ?? "Proxy route"
  );
}
