import type { NormalizedUsage } from "@/lib/chat/types";

export class InvalidProxyResponseError extends Error {
  constructor() {
    super("The proxy returned an invalid response.");
    this.name = "InvalidProxyResponseError";
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asNonnegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function normalizeUsage(
  inputTokens: number | null,
  outputTokens: number | null,
  proxyTotal: number | null,
): NormalizedUsage {
  if (proxyTotal !== null) {
    return {
      inputTokens,
      outputTokens,
      totalTokens: proxyTotal,
      totalSource: "proxy",
    };
  }

  if (inputTokens !== null && outputTokens !== null) {
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      totalSource: "calculated",
    };
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: null,
    totalSource: "unknown",
  };
}

export function requireText(value: string | null): string {
  if (!value?.trim()) throw new InvalidProxyResponseError();
  return value;
}

export function isIncompleteFinishReason(reason: string | null): boolean {
  return reason !== null && ["length", "max_tokens", "MAX_TOKENS"].includes(reason);
}
