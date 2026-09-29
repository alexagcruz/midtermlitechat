"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { chatErrorSchema, chatResponseSchema } from "@/lib/chat/api-schema";
import { ROUTE_OPTIONS, routeLabel, type RouteId } from "@/lib/chat/routes";
import type {
  ChatTurn,
  Conversation,
  ConversationMessage,
  NormalizedUsage,
} from "@/lib/chat/types";
import { loadConversations, saveConversations } from "@/lib/storage/conversations";

function titleFromPrompt(prompt: string): string {
  const title = prompt.replace(/\s+/g, " ").trim();
  return title.length > 54 ? `${title.slice(0, 51)}...` : title || "New conversation";
}

function createMessageId(): string {
  return crypto.randomUUID();
}

function formatCount(value: number | null): string {
  return value === null ? "Unavailable" : new Intl.NumberFormat().format(value);
}

function conversationTurns(
  messages: ConversationMessage[],
  currentUserMessageId: string,
): ChatTurn[] {
  const previousTurns: ChatTurn[] = [];

  for (const message of messages) {
    if (message.id === currentUserMessageId) break;
    if (message.role === "assistant" || message.delivery === "complete") {
      previousTurns.push({ role: message.role, content: message.content });
    }
  }

  const currentMessage = messages.find(
    (message) => message.id === currentUserMessageId,
  );
  if (!currentMessage || currentMessage.role !== "user") return previousTurns;

  previousTurns.push({ role: "user", content: currentMessage.content });
  return previousTurns;
}

function UsageSummary({ messages }: { messages: ConversationMessage[] }) {
  const responses = messages.filter((message) => message.role === "assistant");
  if (responses.length === 0) return null;

  const knownCount = (
    field: "inputTokens" | "outputTokens" | "totalTokens",
  ): number | null => {
    const values = responses
      .map((message) => message.usage?.[field])
      .filter((value): value is number => typeof value === "number");
    return values.length > 0
      ? values.reduce((total, value) => total + value, 0)
      : null;
  };

  const incompleteUsage = responses.filter(
    (message) =>
      !message.usage ||
      message.usage.inputTokens === null ||
      message.usage.outputTokens === null ||
      message.usage.totalTokens === null,
  ).length;

  return (
    <section className="usage-summary" aria-label="Conversation token totals">
      <div className="usage-summary-heading">
        <span>KNOWN CONVERSATION USAGE</span>
        {incompleteUsage > 0 && (
          <span className="usage-partial">
            {incompleteUsage} response{incompleteUsage === 1 ? "" : "s"} missing usage
          </span>
        )}
      </div>
      <div className="usage-summary-values">
        <span>IN {formatCount(knownCount("inputTokens"))}</span>
        <span>OUT {formatCount(knownCount("outputTokens"))}</span>
        <span>TOTAL {formatCount(knownCount("totalTokens"))}</span>
      </div>
    </section>
  );
}

function ResponseUsage({ usage }: { usage: NormalizedUsage | null | undefined }) {
  if (!usage) {
    return <span className="message-usage">Usage unavailable</span>;
  }

  return (
    <span className="message-usage">
      In {formatCount(usage.inputTokens)} / Out {formatCount(usage.outputTokens)} / Total{" "}
      {formatCount(usage.totalTokens)} tokens
      {usage.totalSource === "calculated" ? " (total calculated)" : ""}
    </span>
  );
}

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const busyRef = useRef(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draftRouteId, setDraftRouteId] = useState<RouteId>("openai-chat");
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    let recoveredPendingMessage = false;
    const loaded = loadConversations()
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) => {
          if (message.role === "user" && message.delivery === "pending") {
            recoveredPendingMessage = true;
            return { ...message, delivery: "failed" as const };
          }
          return message;
        }),
      }))
      .sort((left, right) => right.updatedAt - left.updatedAt);

    if (recoveredPendingMessage) {
      try {
        saveConversations(loaded);
      } catch {
        setStorageError(
          "This browser could not save conversation changes. Free some browser storage and try again.",
        );
      }
    }

    conversationsRef.current = loaded;
    setConversations(loaded);
    setActiveConversationId(loaded[0]?.id ?? null);
    setHydrated(true);
  }, []);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );
  const selectedRouteId = activeConversation?.selectedRouteId ?? draftRouteId;
  const unresolvedFailure = activeConversation?.messages.find(
    (message) => message.role === "user" && message.delivery === "failed",
  );

  function commitConversations(next: Conversation[]) {
    const sorted = [...next].sort((left, right) => right.updatedAt - left.updatedAt);
    conversationsRef.current = sorted;
    setConversations(sorted);

    try {
      saveConversations(sorted);
      setStorageError("");
    } catch {
      setStorageError(
        "This browser could not save conversation changes. Free some browser storage and try again.",
      );
    }
  }

  function updateConversation(
    conversationId: string,
    update: (conversation: Conversation) => Conversation,
  ) {
    const latest = conversationsRef.current;
    if (!latest.some((conversation) => conversation.id === conversationId)) return;
    commitConversations(
      latest.map((conversation) =>
        conversation.id === conversationId ? update(conversation) : conversation,
      ),
    );
  }

  function newConversation() {
    setActiveConversationId(null);
    setDraftRouteId(selectedRouteId);
    setInput("");
    setRequestErrors({});
  }

  function selectRoute(routeId: RouteId) {
    setDraftRouteId(routeId);
    if (activeConversationId) {
      updateConversation(activeConversationId, (conversation) => ({
        ...conversation,
        selectedRouteId: routeId,
        updatedAt: Date.now(),
      }));
    }
  }

  function updateMessageDelivery(
    conversationId: string,
    messageId: string,
    delivery: ConversationMessage["delivery"],
  ) {
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      updatedAt: Date.now(),
      messages: conversation.messages.map((message) =>
        message.id === messageId ? { ...message, delivery } : message,
      ),
    }));
  }

  async function sendExistingMessage(
    conversationId: string,
    messageId: string,
    routeId: RouteId,
  ) {
    if (busyRef.current) return;
    const conversation = conversationsRef.current.find(
      (entry) => entry.id === conversationId,
    );
    if (!conversation) return;

    const turns = conversationTurns(conversation.messages, messageId);
    if (turns.length === 0 || turns.at(-1)?.role !== "user") return;

    busyRef.current = true;
    setPending(true);
    setRequestErrors((current) => ({ ...current, [messageId]: "" }));
    updateConversation(conversationId, (current) => ({
      ...current,
      selectedRouteId: routeId,
      updatedAt: Date.now(),
      messages: current.messages.map((message) =>
        message.id === messageId ? { ...message, delivery: "pending" } : message,
      ),
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, messages: turns }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const parsedError = chatErrorSchema.safeParse(body);
        throw new Error(
          parsedError.success
            ? parsedError.data.error.message
            : "The chat request could not be completed. Try again.",
        );
      }

      const parsedResponse = chatResponseSchema.safeParse(body);
      if (!parsedResponse.success) {
        throw new Error("The proxy returned a response the app could not read.");
      }

      const assistant = parsedResponse.data.assistant;
      const assistantMessage: ConversationMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistant.content,
        createdAt: Date.now(),
        delivery: "complete",
        routeId: assistant.routeId,
        finishReason: assistant.finishReason,
        incomplete: assistant.incomplete,
        usage: assistant.usage,
      };

      updateConversation(conversationId, (current) => ({
        ...current,
        updatedAt: Date.now(),
        messages: [
          ...current.messages.map((message): ConversationMessage =>
            message.id === messageId
              ? { ...message, delivery: "complete" }
              : message,
          ),
          assistantMessage,
        ],
      }));
    } catch (error) {
      updateMessageDelivery(conversationId, messageId, "failed");
      setRequestErrors((current) => ({
        ...current,
        [messageId]:
          error instanceof Error
            ? error.message
            : "The chat request could not be completed. Try again.",
      }));
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  async function submitPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending || busyRef.current || unresolvedFailure || !hydrated) {
      return;
    }

    const now = Date.now();
    const routeId = selectedRouteId;
    const message: ConversationMessage = {
      id: createMessageId(),
      role: "user",
      content,
      createdAt: now,
      delivery: "pending",
      routeId,
    };

    const current = conversationsRef.current.find(
      (conversation) => conversation.id === activeConversationId,
    );
    const conversation: Conversation = current
      ? {
          ...current,
          title:
            current.messages.length === 0 && current.title === "New conversation"
              ? titleFromPrompt(content)
              : current.title,
          updatedAt: now,
          selectedRouteId: routeId,
          messages: [...current.messages, message],
        }
      : {
          id: createMessageId(),
          title: titleFromPrompt(content),
          createdAt: now,
          updatedAt: now,
          selectedRouteId: routeId,
          messages: [message],
        };

    commitConversations([
      conversation,
      ...conversationsRef.current.filter((entry) => entry.id !== conversation.id),
    ]);
    setActiveConversationId(conversation.id);
    setInput("");
    await sendExistingMessage(conversation.id, message.id, routeId);
  }

  function retryMessage(conversationId: string, message: ConversationMessage) {
    if (message.role !== "user" || message.delivery !== "failed") return;
    setRequestErrors((current) => ({ ...current, [message.id]: "" }));
    void sendExistingMessage(
      conversationId,
      message.id,
      message.routeId ?? selectedRouteId,
    );
  }

  function beginRename(conversation: Conversation) {
    setEditingConversationId(conversation.id);
    setTitleDraft(conversation.title);
  }

  function saveRename(event: React.FormEvent<HTMLFormElement>, conversationId: string) {
    event.preventDefault();
    const title = titleDraft.trim().slice(0, 120);
    if (title) {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        title,
        updatedAt: Date.now(),
      }));
    }
    setEditingConversationId(null);
  }

  function deleteConversation(conversationId: string) {
    const remaining = conversationsRef.current.filter(
      (conversation) => conversation.id !== conversationId,
    );
    commitConversations(remaining);
    if (activeConversationId === conversationId) {
      setActiveConversationId(remaining[0]?.id ?? null);
    }
    setRequestErrors({});
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Conversation navigation">
        <Link className="brand" href="/" aria-label="LiteChat home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>litechat</span>
        </Link>
        <p className="sidebar-kicker">MODEL ACCESS, MADE SIMPLE</p>

        <button className="new-chat-button" onClick={newConversation} type="button">
          <span aria-hidden="true">+</span> New conversation
        </button>

        <div className="conversation-nav-heading">
          <span>YOUR CONVERSATIONS</span>
          <span className="conversation-count">{conversations.length}</span>
        </div>
        <ul className="conversation-list" aria-label="Saved conversations">
          {conversations.map((conversation) => (
            <li
              className={`conversation-item${conversation.id === activeConversationId ? " is-active" : ""}`}
              key={conversation.id}
            >
              {editingConversationId === conversation.id ? (
                <form
                  aria-label={`Rename ${conversation.title}`}
                  className="rename-form"
                  onSubmit={(event) => saveRename(event, conversation.id)}
                >
                  <input
                    aria-label="Conversation name"
                    autoFocus
                    maxLength={120}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setEditingConversationId(null);
                    }}
                    value={titleDraft}
                  />
                  <button aria-label="Save conversation name" type="submit">
                    Save
                  </button>
                </form>
              ) : (
                <>
                  <button
                    aria-current={conversation.id === activeConversationId ? "page" : undefined}
                    className="conversation-select"
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setRequestErrors({});
                    }}
                    type="button"
                  >
                    <span className="conversation-title">{conversation.title}</span>
                    <span className="conversation-route">
                      {routeLabel(conversation.selectedRouteId)}
                    </span>
                  </button>
                  <div className="conversation-actions">
                    <button
                      aria-label={`Rename ${conversation.title}`}
                      onClick={() => beginRename(conversation)}
                      type="button"
                    >
                      Rename
                    </button>
                    <button
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => deleteConversation(conversation.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {hydrated && conversations.length === 0 && (
            <li className="no-conversations">Saved chats will appear here.</li>
          )}
        </ul>

        <div className="sidebar-footer">
          <span className="local-mark" aria-hidden="true" />
          <span>Saved in this browser only</span>
        </div>
      </aside>

      <section className="chat-panel" aria-label="Chat">
        <div className="chat-header">
          <div>
            <p className="eyebrow">TEXT CHAT / TOKEN METERED</p>
            <h1>{activeConversation?.title ?? "Your AI workbench"}</h1>
          </div>
          <span className="status-pill">PROTOTYPE</span>
        </div>

        <div className="route-bar">
          <label htmlFor="proxy-route">Proxy route</label>
          <select
            disabled={!hydrated || pending}
            id="proxy-route"
            onChange={(event) => selectRoute(event.target.value as RouteId)}
            value={selectedRouteId}
          >
            {ROUTE_OPTIONS.map((route) => (
              <option key={route.id} value={route.id}>
                {route.label}
              </option>
            ))}
          </select>
          <span className="route-note">Selection applies to the next turn.</span>
        </div>

        <div className="proxy-disclosure" role="note">
          <span className="disclosure-mark" aria-hidden="true">
            i
          </span>
          <p>
            These choices identify proxy interfaces, not verified distinct vendor
            models. The proxy documentation currently says all three use DeepSeek
            Flash.
          </p>
        </div>

        {storageError && (
          <div className="inline-alert" role="alert">
            {storageError}
          </div>
        )}

        <div className="conversation-content">
          {activeConversation?.messages.length ? (
            <div
              aria-label="Conversation messages"
              aria-live="polite"
              className="message-list"
              role="log"
            >
              {activeConversation.messages.map((message) => (
                <article
                  className={`message message-${message.role}`}
                  data-testid={`message-${message.role}`}
                  key={message.id}
                >
                  <div className="message-meta">
                    <span>{message.role === "user" ? "YOU" : "LITECHAT"}</span>
                    {message.role === "assistant" && message.routeId && (
                      <span>{routeLabel(message.routeId)}</span>
                    )}
                  </div>
                  <div className="message-content">{message.content}</div>
                  {message.role === "assistant" && (
                    <>
                      {message.incomplete && (
                        <p className="incomplete-note">The proxy marked this response incomplete.</p>
                      )}
                      <ResponseUsage usage={message.usage} />
                    </>
                  )}
                  {message.role === "user" && message.delivery === "pending" && (
                    <span className="message-usage">Sending to {routeLabel(message.routeId ?? selectedRouteId)}...</span>
                  )}
                  {message.role === "user" && message.delivery === "failed" && (
                    <div className="failed-turn">
                      <span role="alert">
                        {requestErrors[message.id] ||
                          "This request failed. Retry it before sending another turn in this conversation."}
                      </span>
                      <button
                        disabled={pending}
                        onClick={() => retryMessage(activeConversation.id, message)}
                        type="button"
                      >
                        Retry this prompt
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {pending && (
                <div className="assistant-pending" role="status">
                  <span className="pending-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Waiting for the proxy
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-index">01 / START HERE</span>
              <h2>One conversation. Three proxy routes.</h2>
              <p>
                Ask a question, choose a route, and keep the conversation in this
                browser.
              </p>
            </div>
          )}
        </div>

        {activeConversation && <UsageSummary messages={activeConversation.messages} />}

        <form className="composer" onSubmit={submitPrompt}>
          <label className="sr-only" htmlFor="prompt-input">
            Message
          </label>
          <textarea
            disabled={!hydrated || pending || Boolean(unresolvedFailure)}
            id="prompt-input"
            maxLength={12_000}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              unresolvedFailure
                ? "Retry the failed prompt before continuing this conversation."
                : "Ask anything in text..."
            }
            rows={2}
            value={input}
          />
          <div className="composer-bottom">
            <span>Responses report token usage when available. No money is charged.</span>
            <button disabled={!hydrated || pending || Boolean(unresolvedFailure) || !input.trim()} type="submit">
              {pending ? "Sending..." : "Send message"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
