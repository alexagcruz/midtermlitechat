import { describe, expect, it } from "vitest";
import { SERVER_ROUTE_CONFIG } from "./route-config";
import {
  buildAnthropicRequest,
  parseAnthropicResponse,
} from "./adapters/anthropic";
import { buildGoogleRequest, parseGoogleResponse } from "./adapters/google";
import { buildOpenAIRequest, parseOpenAIResponse } from "./adapters/openai";

const messages = [
  { role: "user" as const, content: "Hello" },
  { role: "assistant" as const, content: "Hi" },
  { role: "user" as const, content: "Follow up" },
];

describe("OpenAI Chat Completions adapter", () => {
  it("builds the fixed request and bearer authentication header", () => {
    const request = buildOpenAIRequest(
      SERVER_ROUTE_CONFIG["openai-chat"],
      "test-only-openai-value",
      messages,
    );

    expect(request.url).toBe(
      "https://proxy.litechat.ai/openai/v1/chat/completions",
    );
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test-only-openai-value",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(request.body)).toMatchObject({
      model: "gpt-5.6-luna",
      messages,
      max_tokens: 1024,
    });
  });

  it("parses response text, finish state, and usage", () => {
    expect(
      parseOpenAIResponse({
        choices: [
          { message: { content: "Hello back" }, finish_reason: "stop" },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      }),
    ).toEqual({
      content: "Hello back",
      finishReason: "stop",
      incomplete: false,
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        totalTokens: 14,
        totalSource: "proxy",
      },
    });
  });

  it("marks a length-limited response incomplete", () => {
    expect(
      parseOpenAIResponse({
        choices: [{ message: { content: "Partial" }, finish_reason: "length" }],
      }).incomplete,
    ).toBe(true);
  });
});

describe("Anthropic Messages adapter", () => {
  it("builds the Messages request with its protocol-specific headers", () => {
    const request = buildAnthropicRequest(
      SERVER_ROUTE_CONFIG["anthropic-messages"],
      "test-only-anthropic-value",
      messages,
    );

    expect(request.url).toBe("https://proxy.litechat.ai/anthropic/v1/messages");
    expect(request.headers).toMatchObject({
      "x-api-key": "test-only-anthropic-value",
      "anthropic-version": "2023-06-01",
    });
    expect(JSON.parse(request.body)).toMatchObject({
      model: "claude-haiku-4-5-20251001",
      messages,
      max_tokens: 1024,
    });
  });

  it("parses text blocks and calculates a total from known input/output", () => {
    expect(
      parseAnthropicResponse({
        content: [
          { type: "thinking", thinking: "ignored" },
          { type: "text", text: "Hello " },
          { type: "text", text: "back" },
        ],
        stop_reason: "end_turn",
        usage: { input_tokens: 12, output_tokens: 5 },
      }),
    ).toEqual({
      content: "Hello back",
      finishReason: "end_turn",
      incomplete: false,
      usage: {
        inputTokens: 12,
        outputTokens: 5,
        totalTokens: 17,
        totalSource: "calculated",
      },
    });
  });
});

describe("Google Gemini adapter", () => {
  it("builds the fixed generateContent path and API-key header", () => {
    const request = buildGoogleRequest(
      SERVER_ROUTE_CONFIG["google-generate-content"],
      "test-only-google-value",
      messages,
    );

    expect(request.url).toBe(
      "https://proxy.litechat.ai/google/v1beta/models/gemini-3.8-flash:generateContent",
    );
    expect(request.headers["x-goog-api-key"]).toBe("test-only-google-value");
    expect(JSON.parse(request.body).contents).toEqual([
      { role: "user", parts: [{ text: "Hello" }] },
      { role: "model", parts: [{ text: "Hi" }] },
      { role: "user", parts: [{ text: "Follow up" }] },
    ]);
  });

  it("parses candidate text, token usage, and max-token finish state", () => {
    expect(
      parseGoogleResponse({
        candidates: [
          {
            content: { parts: [{ text: "Hello " }, { text: "back" }] },
            finishReason: "MAX_TOKENS",
          },
        ],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 8,
          totalTokenCount: 23,
        },
      }),
    ).toEqual({
      content: "Hello back",
      finishReason: "MAX_TOKENS",
      incomplete: true,
      usage: {
        inputTokens: 15,
        outputTokens: 8,
        totalTokens: 23,
        totalSource: "proxy",
      },
    });
  });
});

describe("response validation", () => {
  it("preserves missing usage as unknown", () => {
    expect(
      parseOpenAIResponse({
        choices: [{ message: { content: "No usage available" } }],
      }).usage,
    ).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      totalSource: "unknown",
    });
  });

  it("rejects malformed and text-free responses", () => {
    expect(() => parseOpenAIResponse({ choices: [] })).toThrow();
    expect(() =>
      parseAnthropicResponse({ content: [{ type: "tool_use", id: "x" }] }),
    ).toThrow();
    expect(() => parseGoogleResponse({ candidates: [] })).toThrow();
  });
});
