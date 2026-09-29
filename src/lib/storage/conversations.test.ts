import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/lib/chat/types";
import {
  CONVERSATIONS_STORAGE_KEY,
  loadConversations,
  saveConversations,
} from "./conversations";

const conversation: Conversation = {
  id: "conversation-1",
  title: "A first question",
  createdAt: 100,
  updatedAt: 100,
  selectedRouteId: "openai-chat",
  messages: [
    {
      id: "message-1",
      role: "user",
      content: "Hello",
      createdAt: 100,
      delivery: "complete",
    },
  ],
};

describe("conversation storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists versioned conversations and loads them after a reload", () => {
    saveConversations([conversation]);

    expect(loadConversations()).toEqual([conversation]);
    expect(JSON.parse(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY) ?? "{}"))
      .toMatchObject({ version: 1 });
  });

  it("returns an empty list for malformed or outdated data", () => {
    window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, "not-json");
    expect(loadConversations()).toEqual([]);

    window.localStorage.setItem(
      CONVERSATIONS_STORAGE_KEY,
      JSON.stringify({ version: 2, conversations: [conversation] }),
    );
    expect(loadConversations()).toEqual([]);
  });

  it("does not write credential-like fields to storage", () => {
    const withUnexpectedField = {
      ...conversation,
      apiKey: "not-a-real-key",
    } as Conversation;

    expect(() => saveConversations([withUnexpectedField])).toThrow();
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBeNull();
  });

  it("surfaces storage quota errors to the caller", () => {
    const failingStorage = {
      setItem: vi.fn(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }),
    } as unknown as Storage;

    expect(() => saveConversations([conversation], failingStorage)).toThrow(
      "Quota exceeded",
    );
  });
});
