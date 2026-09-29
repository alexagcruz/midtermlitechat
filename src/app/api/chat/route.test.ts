import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function postRequest(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function openAIRequest() {
  return {
    routeId: "openai-chat",
    messages: [{ role: "user", content: "Hello" }],
  };
}

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns a normalized response without exposing the server credential", async () => {
    vi.stubEnv("BUILD_OPENAI_KEY", "test-only-openai-value");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("https://proxy.litechat.ai/openai/v1/chat/completions");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer test-only-openai-value",
      });
      return new Response(
        JSON.stringify({
          choices: [
            { message: { content: "Hello back" }, finish_reason: "stop" },
          ],
          usage: {
            prompt_tokens: 6,
            completion_tokens: 4,
            total_tokens: 10,
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(postRequest(openAIRequest()));
    const responseText = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(responseText)).toMatchObject({
      assistant: {
        content: "Hello back",
        routeId: "openai-chat",
        usage: { inputTokens: 6, outputTokens: 4, totalTokens: 10 },
      },
    });
    expect(responseText).not.toContain("test-only-openai-value");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer test-only-openai-value",
    });
  });

  it("returns a safe configuration error when the selected key is missing", async () => {
    vi.stubEnv("BUILD_OPENAI_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(postRequest(openAIRequest()));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "CONFIGURATION",
        message: "This proxy route is not configured on the server.",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, "AUTHENTICATION", 502],
    [403, "AUTHENTICATION", 502],
    [429, "RATE_LIMITED", 429],
    [502, "UNAVAILABLE", 502],
    [503, "UNAVAILABLE", 502],
    [504, "UNAVAILABLE", 502],
  ] as const)("returns safe error for upstream status %s", async (status, code, expectedStatus) => {
    vi.stubEnv("BUILD_OPENAI_KEY", "test-only-openai-value");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("do not expose this body", { status })),
    );

    const response = await POST(postRequest(openAIRequest()));
    const bodyText = await response.text();

    expect(response.status).toBe(expectedStatus);
    expect(bodyText).toContain(code);
    expect(bodyText).not.toContain("do not expose this body");
    expect(bodyText).not.toContain("test-only-openai-value");
  });

  it("rejects invalid route data and arbitrary endpoints before proxy access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      postRequest({ ...openAIRequest(), endpoint: "https://attacker.example" }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and oversized request bodies", async () => {
    const nonJson = await POST(postRequest("{}", "text/plain"));
    const tooLarge = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "300000",
        },
        body: "{}",
      }),
    );

    expect(nonJson.status).toBe(415);
    expect(tooLarge.status).toBe(413);
  });
});
