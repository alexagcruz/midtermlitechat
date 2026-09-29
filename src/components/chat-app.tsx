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
import {
  loadConversations,
  mutateAccountConversations,
} from "@/lib/storage/conversations";

const CONVERSATION_STORAGE_ERROR =
  "This browser could not save conversation changes. Free browser storage, then reload before continuing.";

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

export function ChatApp({
  accountId,
  displayName,
  logoutError,
  migrationWarning,
  onLogout,
}: {
  accountId: string;
  displayName: string;
  logoutError: string;
  migrationWarning: string;
  onLogout: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const submitLockRef = useRef(false);
  const persistenceFailedRef = useRef(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draftRouteId, setDraftRouteId] = useState<RouteId>("openai-chat");
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    let recoveredPendingMessage = false;
    const loaded = loadConversations(accountId)
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
      void mutateAccountConversations(accountId, (current) => {
        if (!mountedRef.current) return null;
        return current.map((conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.role === "user" && message.delivery === "pending"
              ? { ...message, delivery: "failed" as const }
              : message,
          ),
        }));
      })
        .then((recovered) => {
          if (!mountedRef.current) return;
          conversationsRef.current = recovered;
          setConversations(recovered);
        })
        .catch(() => {
          if (mountedRef.current) {
            persistenceFailedRef.current = true;
            setStorageError(CONVERSATION_STORAGE_ERROR);
          }
        });
    }

    conversationsRef.current = loaded;
    setConversations(loaded);
    setActiveConversationId(loaded[0]?.id ?? null);
    setHydrated(true);
    return () => {
      mountedRef.current = false;
    };
  }, [accountId]);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );
  const selectedRouteId = activeConversation?.selectedRouteId ?? draftRouteId;
  const unresolvedFailure = activeConversation?.messages.find(
    (message) => message.role === "user" && message.delivery === "failed",
  );

  async function commitConversations(
    mutation: (current: Conversation[]) => Conversation[] | null,
  ): Promise<boolean> {
    if (!mountedRef.current) return false;

    if (persistenceFailedRef.current) {
      const next = mutation(conversationsRef.current);
      if (next === null) return false;
      const sorted = [...next].sort((left, right) => right.updatedAt - left.updatedAt);
      conversationsRef.current = sorted;
      setConversations(sorted);
      setStorageError(CONVERSATION_STORAGE_ERROR);
      return true;
    }

    let mutationWasApplied = false;
    let mutationResult: Conversation[] | null = null;
    try {
      const updated = await mutateAccountConversations(accountId, (current) => {
        if (!mountedRef.current) return null;
        mutationWasApplied = true;
        mutationResult = mutation(current);
        return mutationResult;
      });
      if (!mountedRef.current) return false;
      conversationsRef.current = updated;
      setConversations(updated);
      setStorageError("");
      return true;
    } catch {
      if (!mountedRef.current) return false;
      persistenceFailedRef.current = true;
      const fallback = mutationWasApplied
        ? mutationResult
        : mutation(conversationsRef.current);
      if (fallback !== null) {
        const sorted = [...fallback].sort((left, right) => right.updatedAt - left.updatedAt);
        conversationsRef.current = sorted;
        setConversations(sorted);
      }
      setStorageError(CONVERSATION_STORAGE_ERROR);
      return fallback !== null;
    }
  }

  async function updateConversation(
    conversationId: string,
    update: (conversation: Conversation) => Conversation,
  ): Promise<boolean> {
    if (!mountedRef.current) return false;
    return commitConversations((current) => {
      if (!current.some((conversation) => conversation.id === conversationId)) return null;
      return current.map((conversation) =>
        conversation.id === conversationId ? update(conversation) : conversation,
      );
    });
  }

  function newConversation() {
    setActiveConversationId(null);
    setDraftRouteId(selectedRouteId);
    setInput("");
    setRequestErrors({});
    setMobileNavOpen(false);
  }

  function selectRoute(routeId: RouteId) {
    setDraftRouteId(routeId);
    if (activeConversationId) {
      void updateConversation(activeConversationId, (conversation) => ({
        ...conversation,
        selectedRouteId: routeId,
        updatedAt: Date.now(),
      }));
    }
  }

  async function updateMessageDelivery(
    conversationId: string,
    messageId: string,
    delivery: ConversationMessage["delivery"],
  ): Promise<boolean> {
    return updateConversation(conversationId, (conversation) => ({
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

    busyRef.current = true;
    setPending(true);
    setRequestErrors((current) => ({ ...current, [messageId]: "" }));

    try {
      const savedPendingMessage = await updateConversation(conversationId, (current) => ({
        ...current,
        selectedRouteId: routeId,
        updatedAt: Date.now(),
        messages: current.messages.map((message) =>
          message.id === messageId ? { ...message, delivery: "pending" } : message,
        ),
      }));
      if (!savedPendingMessage || !mountedRef.current) return;

      const currentConversation = conversationsRef.current.find(
        (entry) => entry.id === conversationId,
      );
      if (!currentConversation) return;
      const turns = conversationTurns(currentConversation.messages, messageId);
      if (turns.length === 0 || turns.at(-1)?.role !== "user") return;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, messages: turns }),
      });
      if (!mountedRef.current) return;
      const body: unknown = await response.json().catch(() => null);
      if (!mountedRef.current) return;

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

      await updateConversation(conversationId, (current) => ({
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
      if (mountedRef.current) {
        await updateMessageDelivery(conversationId, messageId, "failed");
        setRequestErrors((current) => ({
          ...current,
          [messageId]:
            error instanceof Error
              ? error.message
              : "The chat request could not be completed. Try again.",
        }));
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setPending(false);
    }
  }

  async function submitPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (
      !content ||
      pending ||
      busyRef.current ||
      submitLockRef.current ||
      unresolvedFailure ||
      !hydrated
    ) {
      return;
    }

    submitLockRef.current = true;
    try {
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

      const requestedConversationId = activeConversationId;
      let conversationId = requestedConversationId ?? createMessageId();
      const saved = await commitConversations((latest) => {
        const current = requestedConversationId
          ? latest.find((conversation) => conversation.id === requestedConversationId)
          : undefined;
        if (requestedConversationId && !current) conversationId = createMessageId();

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
              id: conversationId,
              title: titleFromPrompt(content),
              createdAt: now,
              updatedAt: now,
              selectedRouteId: routeId,
              messages: [message],
            };

        return [
          conversation,
          ...latest.filter((entry) => entry.id !== conversation.id),
        ];
      });
      if (!saved || !mountedRef.current) return;
      setActiveConversationId(conversationId);
      setInput("");
      await sendExistingMessage(conversationId, message.id, routeId);
    } finally {
      submitLockRef.current = false;
    }
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

  async function saveRename(event: React.FormEvent<HTMLFormElement>, conversationId: string) {
    event.preventDefault();
    const title = titleDraft.trim().slice(0, 120);
    if (title) {
      await updateConversation(conversationId, (conversation) => ({
        ...conversation,
        title,
        updatedAt: Date.now(),
      }));
    }
    if (mountedRef.current) setEditingConversationId(null);
  }

  async function deleteConversation(conversationId: string) {
    const saved = await commitConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    );
    if (!saved || !mountedRef.current) return;
    const remaining = conversationsRef.current;
    if (activeConversationId === conversationId) {
      setActiveConversationId(remaining[0]?.id ?? null);
    }
    setRequestErrors({});
  }

  return (
    <main className="app-shell">
      <button
        aria-controls="conversation-sidebar"
        aria-expanded={mobileNavOpen}
        aria-label={mobileNavOpen ? "Close conversations" : "Open conversations"}
        className="mobile-nav-toggle"
        onClick={() => setMobileNavOpen((open) => !open)}
        type="button"
      >
        <span className="mobile-nav-icon" aria-hidden="true">
          {mobileNavOpen ? "×" : "☰"}
        </span>
        <span>{mobileNavOpen ? "Close" : "Chats"}</span>
      </button>
      <div
        aria-hidden={!mobileNavOpen}
        className={`mobile-nav-backdrop${mobileNavOpen ? " is-visible" : ""}`}
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        aria-label="Conversation navigation"
        className={`sidebar${mobileNavOpen ? " is-open" : ""}`}
        id="conversation-sidebar"
      >
        <Link className="brand" href="/" aria-label="Deeda home">
          <span className="brand-mark" aria-hidden="true">
            d
          </span>
          <span>Deeda</span>
        </Link>
        <p className="sidebar-kicker">A THOUGHTFUL AI WORKSPACE</p>

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
                      setMobileNavOpen(false);
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

        <div className="sidebar-account">
          <span className="sidebar-account-name" title={displayName}>{displayName}</span>
          <button className="logout-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="local-mark" aria-hidden="true" />
          <span>Saved in this browser only</span>
        </div>
      </aside>

      <section className="chat-panel" aria-label="Chat">
        <div className="chat-header">
          <div>
            <p className="eyebrow">YOUR DEEDA WORKSPACE</p>
            <h1>{activeConversation?.title ?? "Your AI workbench"}</h1>
            <p className="header-caption">
              Ask a question, choose how Deeda responds, and keep your usage in view.
            </p>
          </div>
          <div className="header-status">
            <span className="status-dot" aria-hidden="true" />
            <span className="status-pill">LOCAL ACCOUNT</span>
          </div>
        </div>

        {migrationWarning && (
          <div className="auth-workspace-note" role="note">
            {migrationWarning}
          </div>
        )}
        {logoutError && (
          <div className="inline-alert" role="alert">
            {logoutError}
          </div>
        )}

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
          <span className="route-note">Applies to the next turn</span>
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
                    <span>{message.role === "user" ? "YOU" : "DEEDA"}</span>
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
              <span className="empty-index">START A NEW THREAD</span>
              <div className="empty-signal" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h2>One workspace for every question.</h2>
              <p>
                Ask a question, choose a route, and keep the conversation in this
                browser. Your first prompt becomes the thread title.
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
