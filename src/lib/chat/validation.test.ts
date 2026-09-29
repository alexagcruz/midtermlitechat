import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGES,
  MAX_REQUEST_BYTES,
  parseChatBody,
} from "./validation";

function validBody() {
  return JSON.stringify({
    routeId: "openai-chat",
    messages: [{ role: "user", content: "Hello" }],
  });
}

describe("parseChatBody", () => {
  it("accepts a fixed route and text conversation", () => {
    expect(parseChatBody(validBody())).toMatchObject({
      success: true,
      data: { routeId: "openai-chat" },
    });
  });

  it("rejects invalid routes, models, endpoints, and extra request fields", () => {
    const invalidBodies = [
      { routeId: "other", messages: [{ role: "user", content: "Hello" }] },
      {
        routeId: "openai-chat",
        model: "arbitrary-model",
        messages: [{ role: "user", content: "Hello" }],
      },
      {
        routeId: "openai-chat",
        endpoint: "https://example.test",
        messages: [{ role: "user", content: "Hello" }],
      },
      {
        routeId: "openai-chat",
        headers: { Authorization: "Bearer anything" },
        messages: [{ role: "user", content: "Hello" }],
      },
    ];

    for (const body of invalidBodies) {
      expect(parseChatBody(JSON.stringify(body)).success).toBe(false);
    }
  });

  it("requires the newest turn to be a user message", () => {
    const body = JSON.stringify({
      routeId: "openai-chat",
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ],
    });

    expect(parseChatBody(body).success).toBe(false);
  });

  it("rejects malformed JSON and empty text", () => {
    expect(parseChatBody("{").success).toBe(false);
    expect(
      parseChatBody(
        JSON.stringify({
          routeId: "openai-chat",
          messages: [{ role: "user", content: "  " }],
        }),
      ).success,
    ).toBe(false);
  });

  it("enforces message count and request byte limits", () => {
    const makeMessages = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        role: index === count - 1 ? "user" : "assistant",
        content: "Hello",
      }));

    expect(
      parseChatBody(
        JSON.stringify({ routeId: "openai-chat", messages: makeMessages(MAX_MESSAGES - 1) }),
      ).success,
    ).toBe(true);
    expect(
      parseChatBody(
        JSON.stringify({ routeId: "openai-chat", messages: makeMessages(MAX_MESSAGES) }),
      ).success,
    ).toBe(true);
    expect(
      parseChatBody(
        JSON.stringify({ routeId: "openai-chat", messages: makeMessages(MAX_MESSAGES + 1) }),
      ).success,
    ).toBe(false);
  });

  it("enforces per-message character limits", () => {
    const parseLength = (length: number) =>
      parseChatBody(
        JSON.stringify({
          routeId: "openai-chat",
          messages: [{ role: "user", content: "x".repeat(length) }],
        }),
      );

    expect(parseLength(11_999).success).toBe(true);
    expect(parseLength(12_000).success).toBe(true);
    expect(parseLength(12_001).success).toBe(false);
  });

  it("accepts request bodies just below and at the byte limit, and rejects one byte over", () => {
    const messages = Array.from({ length: 22 }, (_, index) => ({
      role: index === 21 ? "user" : "assistant",
      content: "x".repeat(12_000),
    }));
    const lastMessage = messages[messages.length - 1]!;
    const withoutLastText = JSON.stringify({
      routeId: "openai-chat",
      messages: messages.map((message, index) =>
        index === messages.length - 1 ? { ...message, content: "" } : message,
      ),
    });
    const paddingLength =
      MAX_REQUEST_BYTES - new TextEncoder().encode(withoutLastText).byteLength;
    expect(paddingLength).toBeGreaterThan(0);
    expect(paddingLength).toBeLessThanOrEqual(12_000);
    lastMessage.content = "x".repeat(paddingLength);

    const exactLimit = JSON.stringify({ routeId: "openai-chat", messages });
    expect(new TextEncoder().encode(exactLimit).byteLength).toBe(MAX_REQUEST_BYTES);
    expect(parseChatBody(exactLimit).success).toBe(true);

    const belowLimit = JSON.stringify({
      routeId: "openai-chat",
      messages: messages.map((message, index) =>
        index === messages.length - 1
          ? { ...message, content: message.content.slice(0, -1) }
          : message,
      ),
    });
    expect(parseChatBody(belowLimit).success).toBe(true);

    const aboveLimit = JSON.stringify({
      routeId: "openai-chat",
      messages: messages.map((message, index) =>
        index === messages.length - 1
          ? { ...message, content: `${message.content}x` }
          : message,
      ),
    });
    expect(parseChatBody(aboveLimit)).toMatchObject({
      success: false,
      status: 413,
    });
  });
});
