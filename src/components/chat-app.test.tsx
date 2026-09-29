import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/lib/chat/types";
import { saveConversations } from "@/lib/storage/conversations";
import { ChatApp } from "./chat-app";

function proxyResponse(
  content: string,
  routeId: "openai-chat" | "anthropic-messages" | "google-generate-content" = "openai-chat",
) {
  return new Response(
    JSON.stringify({
      assistant: {
        content,
        routeId,
        finishReason: "stop",
        incomplete: false,
        usage: {
          inputTokens: 7,
          outputTokens: 4,
          totalTokens: 11,
          totalSource: "proxy",
        },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function renderChat() {
  return render(<ChatApp />);
}

async function enterAndSend(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: "Message" }), text);
  await user.click(screen.getByRole("button", { name: /send message/i }));
}

describe("ChatApp", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("starts a conversation, sends a prompt, and reports response usage", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(proxyResponse("A mocked answer"));
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    await enterAndSend(user, "Explain a simple idea");

    expect(await screen.findByText("A mocked answer")).toBeInTheDocument();
    expect(screen.getByText("In 7 / Out 4 / Total 11 tokens")).toBeInTheDocument();
    expect(screen.getByText("KNOWN CONVERSATION USAGE")).toBeInTheDocument();
    expect(screen.getByText("TOTAL 11")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("message-user")).getByText(
        "Explain a simple idea",
      ),
    ).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/chat");
    expect(JSON.parse(String(init?.body))).toEqual({
      routeId: "openai-chat",
      messages: [{ role: "user", content: "Explain a simple idea" }],
    });
  });

  it("sends multi-turn history and switches routes between turns", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(proxyResponse("First answer", "openai-chat"))
      .mockResolvedValueOnce(
        proxyResponse("Second answer", "anthropic-messages"),
      );
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    await enterAndSend(user, "First question");
    await screen.findByText("First answer");

    await user.selectOptions(
      screen.getByLabelText("Proxy route"),
      "anthropic-messages",
    );
    await enterAndSend(user, "Follow-up question");
    await screen.findByText("Second answer");

    const [, secondInit] = fetchMock.mock.calls[1] ?? [];
    expect(JSON.parse(String(secondInit?.body))).toEqual({
      routeId: "anthropic-messages",
      messages: [
        { role: "user", content: "First question" },
        { role: "assistant", content: "First answer" },
        { role: "user", content: "Follow-up question" },
      ],
    });
    expect(screen.getByLabelText("Proxy route")).toHaveValue(
      "anthropic-messages",
    );
    expect(
      within(screen.getAllByTestId("message-assistant")[1]!).getByText(
        "Anthropic-compatible Messages",
      ),
    ).toBeInTheDocument();
  });

  it("shows loading, preserves failed prompts, and retries without duplicating history", async () => {
    const user = userEvent.setup();
    let resolveFirst!: (response: Response) => void;
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "RATE_LIMITED", message: "Proxy is busy. Try again." },
          }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(proxyResponse("Recovered answer"));
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    await enterAndSend(user, "Keep this prompt");
    expect(await screen.findByRole("status")).toHaveTextContent("Waiting for the proxy");
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    resolveFirst(proxyResponse("Late first answer"));
    expect(await screen.findByText("Late first answer")).toBeInTheDocument();

    await enterAndSend(user, "This will be rate limited");
    expect(await screen.findByText("Proxy is busy. Try again.")).toBeInTheDocument();
    expect(screen.getByText("This will be rate limited")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Retry this prompt" }));
    expect(await screen.findByText("Recovered answer")).toBeInTheDocument();

    const [, retryInit] = fetchMock.mock.calls[2] ?? [];
    expect(JSON.parse(String(retryInit?.body)).messages).toEqual([
      { role: "user", content: "Keep this prompt" },
      { role: "assistant", content: "Late first answer" },
      { role: "user", content: "This will be rate limited" },
    ]);
    expect(
      screen.getAllByText("This will be rate limited", { exact: true }),
    ).toHaveLength(1);
  });

  it("does not send duplicate requests while one turn is pending", async () => {
    const user = userEvent.setup();
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    await user.type(screen.getByRole("textbox", { name: "Message" }), "One prompt");
    const form = screen.getByRole("textbox", { name: "Message" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveResponse(proxyResponse("One response"));
    expect(await screen.findByText("One response")).toBeInTheDocument();
    expect(screen.getAllByTestId("message-user")).toHaveLength(1);
  });

  it("creates, lists, reopens, renames, deletes, and reloads conversations", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(proxyResponse("First saved answer"))
      .mockResolvedValueOnce(proxyResponse("Second saved answer"));
    const firstRender = renderChat();

    await screen.findByText("Saved chats will appear here.");
    await enterAndSend(user, "First saved prompt");
    await screen.findByText("First saved answer");
    const savedConversationList = screen.getByRole("list", {
      name: "Saved conversations",
    });
    expect(
      within(savedConversationList).getByRole("button", {
        name: /First saved promptOpenAI-compatible Chat Completions/,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Rename First saved prompt" }),
    );
    const renameForm = screen.getByRole("form", { name: "Rename First saved prompt" });
    const titleInput = within(renameForm).getByRole("textbox", {
      name: "Conversation name",
    });
    await user.clear(titleInput);
    await user.type(titleInput, "Renamed first chat");
    await user.click(within(renameForm).getByRole("button", { name: "Save conversation name" }));

    await user.click(screen.getByRole("button", { name: /new conversation/i }));
    await enterAndSend(user, "Second saved prompt");
    await screen.findByText("Second saved answer");

    firstRender.unmount();
    renderChat();
    const reloadedList = screen.getByRole("list", {
      name: "Saved conversations",
    });
    await within(reloadedList).findByRole("button", {
      name: /Renamed first chatOpenAI-compatible Chat Completions/,
    });
    await within(reloadedList).findByRole("button", {
      name: /Second saved promptOpenAI-compatible Chat Completions/,
    });

    await user.click(
      within(reloadedList).getByRole("button", {
        name: /Renamed first chatOpenAI-compatible Chat Completions/,
      }),
    );
    expect(screen.getByText("First saved answer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete Renamed first chat" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Renamed first chat/ })).toBeNull(),
    );
    expect(
      within(reloadedList).getByRole("button", {
        name: /Second saved promptOpenAI-compatible Chat Completions/,
      }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("litechat.conversations.v1")).toContain(
      "Second saved prompt",
    );
  });

  it("keeps missing usage unknown and clearly labels the proxy interfaces", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          assistant: {
            content: "Answer without usage",
            routeId: "openai-chat",
            finishReason: "stop",
            incomplete: false,
            usage: {
              inputTokens: null,
              outputTokens: null,
              totalTokens: null,
              totalSource: "unknown",
            },
          },
        }),
        { status: 200 },
      ),
    );
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    expect(
      screen.getByText(/not verified distinct vendor models/i),
    ).toBeInTheDocument();
    await enterAndSend(user, "No usage prompt");
    await screen.findByText("Answer without usage");
    expect(screen.getByText(/In Unavailable \/ Out Unavailable \/ Total Unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/1 response missing usage/)).toBeInTheDocument();
    expect(screen.getByText("IN Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("IN 0")).not.toBeInTheDocument();
    expect(screen.getByText(/No money is charged/)).toBeInTheDocument();
  });

  it("shows partial conversation totals from known responses only", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(proxyResponse("Known usage answer"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assistant: {
              content: "Unknown usage answer",
              routeId: "openai-chat",
              finishReason: "stop",
              incomplete: false,
              usage: {
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                totalSource: "unknown",
              },
            },
          }),
          { status: 200 },
        ),
      );
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    await enterAndSend(user, "Known usage prompt");
    await screen.findByText("Known usage answer");
    await enterAndSend(user, "Unknown usage prompt");
    await screen.findByText("Unknown usage answer");

    expect(screen.getByText("IN 7")).toBeInTheDocument();
    expect(screen.getByText("OUT 4")).toBeInTheDocument();
    expect(screen.getByText("TOTAL 11")).toBeInTheDocument();
    expect(screen.getByText(/1 response missing usage/)).toBeInTheDocument();
  });

  it("shows a clear error when browser storage cannot save a conversation", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(proxyResponse("Storage still unavailable"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    await enterAndSend(user, "Storage error prompt");

    expect(await screen.findByText("Storage still unavailable")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This browser could not save conversation changes.",
    );
  });

  it("recovers an interrupted pending prompt after a browser reload", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(proxyResponse("Recovered after reload"));
    const conversation: Conversation = {
      id: "interrupted-conversation",
      title: "Interrupted prompt",
      createdAt: 100,
      updatedAt: 100,
      selectedRouteId: "openai-chat",
      messages: [
        {
          id: "interrupted-message",
          role: "user",
          content: "This request was interrupted",
          createdAt: 100,
          routeId: "openai-chat",
          delivery: "pending",
        },
      ],
    };
    saveConversations([conversation]);
    renderChat();

    expect(await screen.findByRole("button", { name: "Retry this prompt" })).toBeInTheDocument();
    expect(
      within(screen.getByTestId("message-user")).getByText(
        "This request was interrupted",
        { exact: true },
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry this prompt" }));
    expect(await screen.findByText("Recovered after reload")).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body)).messages).toEqual([
      { role: "user", content: "This request was interrupted" },
    ]);
  });

  it("opens and closes the mobile conversation navigation", async () => {
    const user = userEvent.setup();
    renderChat();

    await screen.findByText("Saved chats will appear here.");
    const openButton = screen.getByRole("button", { name: "Open conversations" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    await user.click(openButton);
    expect(
      screen.getByRole("button", { name: "Close conversations" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("complementary", { name: "Conversation navigation" })).toHaveClass(
      "sidebar",
    );

    await user.click(screen.getByRole("button", { name: "Close conversations" }));
    expect(screen.getByRole("button", { name: "Open conversations" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
