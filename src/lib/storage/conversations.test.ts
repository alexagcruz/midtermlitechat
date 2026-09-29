import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/lib/chat/types";
import {
  accountConversationsStorageKey,
  CONVERSATION_MIGRATION_STORAGE_KEY,
  CONVERSATIONS_STORAGE_KEY,
  ConversationMigrationError,
  loadConversations,
  migrateLegacyConversations,
  mutateAccountConversations,
  saveConversations,
  type ExclusiveMigrationLock,
} from "./conversations";

const ACCOUNT_ONE = "00000000-0000-4000-8000-000000000001";
const ACCOUNT_TWO = "00000000-0000-4000-8000-000000000002";
const inlineLock: ExclusiveMigrationLock = (_name, operation) => operation();

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

const secondConversation: Conversation = {
  ...conversation,
  id: "conversation-2",
  title: "A separate question",
  updatedAt: 200,
};
const thirdConversation: Conversation = {
  ...conversation,
  id: "conversation-3",
  title: "A third question",
  updatedAt: 300,
};

function storeLegacyConversations(conversations: Conversation[]) {
  window.localStorage.setItem(
    CONVERSATIONS_STORAGE_KEY,
    JSON.stringify({ version: 1, conversations }),
  );
}

describe("account-scoped conversation storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists validated conversations separately for each account", () => {
    saveConversations(ACCOUNT_ONE, [conversation]);
    saveConversations(ACCOUNT_TWO, [secondConversation]);

    expect(loadConversations(ACCOUNT_ONE)).toEqual([conversation]);
    expect(loadConversations(ACCOUNT_TWO)).toEqual([secondConversation]);
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBeNull();
    expect(
      JSON.parse(
        window.localStorage.getItem(accountConversationsStorageKey(ACCOUNT_ONE)) ?? "{}",
      ),
    ).toMatchObject({ version: 1 });
  });

  it("applies account mutations to the latest stored snapshot", async () => {
    saveConversations(ACCOUNT_ONE, [conversation]);

    await mutateAccountConversations(
      ACCOUNT_ONE,
      (current) => [...current, secondConversation],
      window.localStorage,
      inlineLock,
    );
    await mutateAccountConversations(
      ACCOUNT_ONE,
      (current) => [...current, thirdConversation],
      window.localStorage,
      inlineLock,
    );

    expect(loadConversations(ACCOUNT_ONE)).toEqual([
      thirdConversation,
      secondConversation,
      conversation,
    ]);
  });

  it("preserves malformed account data rather than overwriting it", async () => {
    const key = accountConversationsStorageKey(ACCOUNT_ONE);
    window.localStorage.setItem(key, "not-json");

    await expect(
      mutateAccountConversations(
        ACCOUNT_ONE,
        () => [conversation],
        window.localStorage,
        inlineLock,
      ),
    ).rejects.toMatchObject({ code: "conflict" });
    expect(window.localStorage.getItem(key)).toBe("not-json");
  });

  it("returns an empty list for malformed or outdated account conversation data", () => {
    const key = accountConversationsStorageKey(ACCOUNT_ONE);
    window.localStorage.setItem(key, "not-json");
    expect(loadConversations(ACCOUNT_ONE)).toEqual([]);

    window.localStorage.setItem(
      key,
      JSON.stringify({ version: 2, conversations: [conversation] }),
    );
    expect(loadConversations(ACCOUNT_ONE)).toEqual([]);
  });

  it("does not write credential-like fields to conversation storage", () => {
    const withUnexpectedField = {
      ...conversation,
      apiKey: "not-a-real-key",
    } as Conversation;

    expect(() => saveConversations(ACCOUNT_ONE, [withUnexpectedField])).toThrow();
    expect(
      window.localStorage.getItem(accountConversationsStorageKey(ACCOUNT_ONE)),
    ).toBeNull();
  });

  it("surfaces conversation storage quota errors to the caller", () => {
    const failingStorage = {
      setItem: vi.fn(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }),
    } as unknown as Storage;

    expect(() => saveConversations(ACCOUNT_ONE, [conversation], failingStorage)).toThrow(
      "Quota exceeded",
    );
  });

  it("assigns valid legacy conversations to the first account and isolates later accounts", async () => {
    storeLegacyConversations([conversation]);

    expect(
      await migrateLegacyConversations(ACCOUNT_ONE, window.localStorage, inlineLock),
    ).toEqual({ status: "complete" });
    expect(loadConversations(ACCOUNT_ONE)).toEqual([conversation]);
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBeNull();

    await migrateLegacyConversations(ACCOUNT_TWO, window.localStorage, inlineLock);
    expect(loadConversations(ACCOUNT_TWO)).toEqual([]);
    expect(
      JSON.parse(
        window.localStorage.getItem(CONVERSATION_MIGRATION_STORAGE_KEY) ?? "{}",
      ),
    ).toMatchObject({ accountId: ACCOUNT_ONE, status: "complete" });
  });

  it("retries an interrupted migration after verifying the copied destination", async () => {
    storeLegacyConversations([conversation]);
    let failRemoval = true;
    const flakyStorage = {
      getItem: (key: string) => window.localStorage.getItem(key),
      setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: (key: string) => {
        if (key === CONVERSATIONS_STORAGE_KEY && failRemoval) {
          failRemoval = false;
          throw new DOMException("Storage unavailable", "SecurityError");
        }
        window.localStorage.removeItem(key);
      },
    } as unknown as Storage;

    await expect(
      migrateLegacyConversations(ACCOUNT_ONE, flakyStorage, inlineLock),
    ).rejects.toMatchObject({ code: "storage-unavailable" });
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).not.toBeNull();
    expect(loadConversations(ACCOUNT_ONE)).toEqual([conversation]);

    await expect(
      migrateLegacyConversations(ACCOUNT_ONE, flakyStorage, inlineLock),
    ).resolves.toEqual({ status: "complete" });
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBeNull();
    expect(loadConversations(ACCOUNT_ONE)).toEqual([conversation]);
  });

  it("preserves source and destination if their valid contents conflict", async () => {
    storeLegacyConversations([conversation]);
    saveConversations(ACCOUNT_ONE, [secondConversation]);

    await expect(
      migrateLegacyConversations(ACCOUNT_ONE, window.localStorage, inlineLock),
    ).rejects.toMatchObject({ code: "conflict" });
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).not.toBeNull();
    expect(loadConversations(ACCOUNT_ONE)).toEqual([secondConversation]);
  });

  it("leaves malformed legacy data unchanged and unavailable to other accounts", async () => {
    window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, "not-json");

    await expect(
      migrateLegacyConversations(ACCOUNT_ONE, window.localStorage, inlineLock),
    ).resolves.toEqual({ status: "legacy-invalid" });
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).toBe("not-json");
    await expect(
      migrateLegacyConversations(ACCOUNT_TWO, window.localStorage, inlineLock),
    ).resolves.toEqual({ status: "not-owner" });
    expect(loadConversations(ACCOUNT_TWO)).toEqual([]);
  });

  it("retains valid source data when destination storage fails and can retry", async () => {
    storeLegacyConversations([conversation]);
    const blockedDestination = accountConversationsStorageKey(ACCOUNT_ONE);
    const failingStorage = {
      getItem: (key: string) => window.localStorage.getItem(key),
      setItem: (key: string, value: string) => {
        if (key === blockedDestination) throw new DOMException("Quota", "QuotaExceededError");
        window.localStorage.setItem(key, value);
      },
      removeItem: (key: string) => window.localStorage.removeItem(key),
    } as unknown as Storage;

    await expect(
      migrateLegacyConversations(ACCOUNT_ONE, failingStorage, inlineLock),
    ).rejects.toBeInstanceOf(ConversationMigrationError);
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).not.toBeNull();
    await migrateLegacyConversations(ACCOUNT_ONE, window.localStorage, inlineLock);
    expect(loadConversations(ACCOUNT_ONE)).toEqual([conversation]);
  });

  it("fails closed when an exclusive migration lock is unavailable", async () => {
    storeLegacyConversations([conversation]);

    await expect(
      migrateLegacyConversations(ACCOUNT_ONE, window.localStorage, async () => {
        throw new ConversationMigrationError("lock-unavailable");
      }),
    ).rejects.toMatchObject({ code: "lock-unavailable" });
    expect(window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(CONVERSATION_MIGRATION_STORAGE_KEY)).toBeNull();
  });
});
