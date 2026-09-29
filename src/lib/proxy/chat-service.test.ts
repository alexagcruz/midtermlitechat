import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatRequest } from "./chat-service";
import { ProxyFailure } from "./errors";
import type { RouteId } from "@/lib/chat/routes";

const messages = [{ role: "user" as const, content: "Hello" }];
const successBody = {
  choices: [
    { message: { content: "Hello back" }, finish_reason: "stop" },
  ],
  usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
};

function routeEnvironment(routeId: RouteId): Record<string, string | undefined> {
  if (routeId === "openai-chat") {
    return { BUILD_OPENAI_KEY: "test-only-openai-value" };
  }
  if (routeId === "anthropic-messages") {
    return { BUILD_ANTHROPIC_KEY: "test-only-anthropic-value" };
  }
  return { BUILD_GOOGLE_KEY: "test-only-google-value" };
}

describe("sendChatRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the selected fixed route and matching server credential", async () => {
    const fetchSpy = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(input).toBe("https://proxy.litechat.ai/openai/v1/chat/completions");
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(successBody), { status: 200 });
      },
    );

    const result = await sendChatRequest("openai-chat", messages, {
      env: routeEnvironment("openai-chat"),
      fetcher: fetchSpy as typeof fetch,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "https://proxy.litechat.ai/openai/v1/chat/completions",
    );
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer test-only-openai-value",
    });
    expect(result).toMatchObject({ routeId: "openai-chat", content: "Hello back" });
  });

  it("selects the Anthropic endpoint and Anthropic server key", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("https://proxy.litechat.ai/anthropic/v1/messages");
      expect(init?.headers).toMatchObject({
        "x-api-key": "test-only-anthropic-value",
        "anthropic-version": "2023-06-01",
      });
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Anthropic route" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 2, output_tokens: 3 },
        }),
        { status: 200 },
      );
    });

    await expect(
      sendChatRequest("anthropic-messages", messages, {
        env: routeEnvironment("anthropic-messages"),
        fetcher: fetchSpy as typeof fetch,
      }),
    ).resolves.toMatchObject({
      routeId: "anthropic-messages",
      content: "Anthropic route",
      usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
    });
  });

  it("selects the Google endpoint and Google server key", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe(
        "https://proxy.litechat.ai/google/v1beta/models/gemini-3.8-flash:generateContent",
      );
      expect(init?.headers).toMatchObject({
        "x-goog-api-key": "test-only-google-value",
      });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Google route" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 4,
            candidatesTokenCount: 2,
            totalTokenCount: 6,
          },
        }),
        { status: 200 },
      );
    });

    await expect(
      sendChatRequest("google-generate-content", messages, {
        env: routeEnvironment("google-generate-content"),
        fetcher: fetchSpy as typeof fetch,
      }),
    ).resolves.toMatchObject({
      routeId: "google-generate-content",
      content: "Google route",
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    });
  });

  it.each([
    "openai-chat",
    "anthropic-messages",
    "google-generate-content",
  ] as const)("rejects missing %s credentials", async (routeId) => {
    const fetchSpy = vi.fn();

    await expect(
      sendChatRequest(routeId, messages, {
        env: {},
        fetcher: fetchSpy as typeof fetch,
      }),
    ).rejects.toMatchObject<Partial<ProxyFailure>>({
      code: "CONFIGURATION",
      status: 503,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    [401, "AUTHENTICATION"],
    [403, "AUTHENTICATION"],
    [429, "RATE_LIMITED"],
    [400, "REQUEST_REJECTED"],
    [502, "UNAVAILABLE"],
    [503, "UNAVAILABLE"],
    [504, "UNAVAILABLE"],
  ] as const)("maps upstream HTTP %s to a safe failure", async (status, code) => {
    const fetcher = async () => new Response("sensitive upstream body", { status });

    await expect(
      sendChatRequest("openai-chat", messages, {
        env: routeEnvironment("openai-chat"),
        fetcher: fetcher as typeof fetch,
      }),
    ).rejects.toMatchObject<Partial<ProxyFailure>>({ code });
  });

  it("maps malformed JSON and malformed success responses safely", async () => {
    const malformedJson = async () => new Response("not json", { status: 200 });
    const malformedShape = async () =>
      new Response(JSON.stringify({ choices: [] }), { status: 200 });

    for (const fetcher of [malformedJson, malformedShape]) {
      await expect(
        sendChatRequest("openai-chat", messages, {
          env: routeEnvironment("openai-chat"),
          fetcher: fetcher as typeof fetch,
        }),
      ).rejects.toMatchObject<Partial<ProxyFailure>>({
        code: "INVALID_RESPONSE",
        status: 502,
      });
    }
  });

  it("maps network failures and bounded timeouts", async () => {
    await expect(
      sendChatRequest("openai-chat", messages, {
        env: routeEnvironment("openai-chat"),
        fetcher: (async () => {
          throw new Error("network unavailable");
        }) as typeof fetch,
      }),
    ).rejects.toMatchObject<Partial<ProxyFailure>>({ code: "UNAVAILABLE" });

    const timedFetch = (async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      })) as typeof fetch;

    await expect(
      sendChatRequest("openai-chat", messages, {
        env: routeEnvironment("openai-chat"),
        fetcher: timedFetch,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject<Partial<ProxyFailure>>({ code: "TIMEOUT", status: 504 });

    const stalledBodyFetch = (async (_input, init) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener(
              "abort",
              () => controller.error(new Error("aborted")),
              { once: true },
            );
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    await expect(
      sendChatRequest("openai-chat", messages, {
        env: routeEnvironment("openai-chat"),
        fetcher: stalledBodyFetch,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject<Partial<ProxyFailure>>({ code: "TIMEOUT", status: 504 });
  });
});
