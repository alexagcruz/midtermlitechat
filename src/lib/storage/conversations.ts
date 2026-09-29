import { z } from "zod";
import type { Conversation, ConversationMessage, NormalizedUsage } from "@/lib/chat/types";

export const CONVERSATIONS_STORAGE_KEY = "litechat.conversations.v1";
export const CONVERSATION_MIGRATION_STORAGE_KEY = "deeda.conversations.migration.v1";
export const ACCOUNT_CONVERSATIONS_STORAGE_PREFIX = "deeda.conversations.v1:";
const CONVERSATION_MIGRATION_LOCK = "deeda-conversation-legacy-migration";
const ACCOUNT_CONVERSATION_WRITE_LOCK_PREFIX = "deeda-conversation-write:";

const routeIdSchema = z.enum([
  "openai-chat",
  "anthropic-messages",
  "google-generate-content",
]);

const usageSchema: z.ZodType<NormalizedUsage> = z
  .object({
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    totalTokens: z.number().int().nonnegative().nullable(),
    totalSource: z.enum(["proxy", "calculated", "unknown"]),
  })
  .strict();

const messageSchema: z.ZodType<ConversationMessage> = z
  .object({
    id: z.string().min(1).max(100),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(100_000),
    createdAt: z.number().int().nonnegative(),
    delivery: z.enum(["pending", "complete", "failed"]).optional(),
    routeId: routeIdSchema.optional(),
    finishReason: z.string().max(100).nullable().optional(),
    incomplete: z.boolean().optional(),
    usage: usageSchema.nullable().optional(),
  })
  .strict();

const conversationSchema: z.ZodType<Conversation> = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(120),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    selectedRouteId: routeIdSchema,
    messages: z.array(messageSchema).max(2_000),
  })
  .strict();

const storedDataSchema = z
  .object({
    version: z.literal(1),
    conversations: z.array(conversationSchema).max(500),
  })
  .strict();

const migrationStateSchema = z
  .object({
    version: z.literal(1),
    accountId: z.string().uuid(),
    status: z.enum(["pending", "complete", "invalid"]),
  })
  .strict();

export type ConversationMigrationResult =
  | { status: "complete" | "not-owner" }
  | { status: "legacy-invalid" };

export class ConversationMigrationError extends Error {
  constructor(readonly code: "conflict" | "lock-unavailable" | "storage-unavailable") {
    super(code);
    this.name = "ConversationMigrationError";
  }
}

export type ExclusiveMigrationLock = <T>(
  name: string,
  operation: () => Promise<T>,
) => Promise<T>;

function localStorageOrThrow(storage?: Storage): Storage {
  try {
    return storage ?? window.localStorage;
  } catch {
    throw new ConversationMigrationError("storage-unavailable");
  }
}

export function accountConversationsStorageKey(accountId: string): string {
  return `${ACCOUNT_CONVERSATIONS_STORAGE_PREFIX}${encodeURIComponent(accountId)}`;
}

function parseConversationPayload(raw: string): Conversation[] | null {
  try {
    const parsed = storedDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.conversations : null;
  } catch {
    return null;
  }
}

function sameConversations(left: Conversation[], right: Conversation[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function browserExclusiveLock<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const manager = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!manager) throw new ConversationMigrationError("lock-unavailable");
  return manager.request(name, () => operation());
}

function readMigrationState(storage: Storage): z.infer<typeof migrationStateSchema> | null {
  let raw: string | null;
  try {
    raw = storage.getItem(CONVERSATION_MIGRATION_STORAGE_KEY);
  } catch {
    throw new ConversationMigrationError("storage-unavailable");
  }
  if (raw === null) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new ConversationMigrationError("conflict");
  }
  const parsed = migrationStateSchema.safeParse(decoded);
  if (!parsed.success) throw new ConversationMigrationError("conflict");
  return parsed.data;
}

function writeMigrationState(
  storage: Storage,
  state: z.infer<typeof migrationStateSchema>,
): void {
  try {
    storage.setItem(CONVERSATION_MIGRATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new ConversationMigrationError("storage-unavailable");
  }
}

export async function migrateLegacyConversations(
  accountId: string,
  storage?: Storage,
  withLock: ExclusiveMigrationLock = browserExclusiveLock,
): Promise<ConversationMigrationResult> {
  const target = localStorageOrThrow(storage);
  const destinationKey = accountConversationsStorageKey(accountId);

  return withLock(CONVERSATION_MIGRATION_LOCK, async () => {
    const existingState = readMigrationState(target);
    if (existingState?.status === "complete") return { status: "complete" };
    if (existingState && existingState.accountId !== accountId) {
      return { status: "not-owner" };
    }

    let legacyRaw: string | null;
    try {
      legacyRaw = target.getItem(CONVERSATIONS_STORAGE_KEY);
    } catch {
      throw new ConversationMigrationError("storage-unavailable");
    }

    if (!existingState) {
      writeMigrationState(target, {
        version: 1,
        accountId,
        status: "pending",
      });
    }

    if (legacyRaw === null) {
      writeMigrationState(target, {
        version: 1,
        accountId,
        status: "complete",
      });
      return { status: "complete" };
    }

    const legacyConversations = parseConversationPayload(legacyRaw);
    if (!legacyConversations) {
      writeMigrationState(target, {
        version: 1,
        accountId,
        status: "invalid",
      });
      return { status: "legacy-invalid" };
    }

    let destinationRaw: string | null;
    try {
      destinationRaw = target.getItem(destinationKey);
      if (destinationRaw === null) {
        target.setItem(destinationKey, legacyRaw);
        destinationRaw = target.getItem(destinationKey);
      }
    } catch {
      throw new ConversationMigrationError("storage-unavailable");
    }

    const destinationConversations = destinationRaw
      ? parseConversationPayload(destinationRaw)
      : null;
    if (
      !destinationConversations ||
      !sameConversations(destinationConversations, legacyConversations)
    ) {
      throw new ConversationMigrationError("conflict");
    }

    try {
      if (target.getItem(CONVERSATIONS_STORAGE_KEY) !== legacyRaw) {
        throw new ConversationMigrationError("conflict");
      }
      target.removeItem(CONVERSATIONS_STORAGE_KEY);
    } catch (error) {
      if (error instanceof ConversationMigrationError) throw error;
      throw new ConversationMigrationError("storage-unavailable");
    }

    writeMigrationState(target, {
      version: 1,
      accountId,
      status: "complete",
    });
    return { status: "complete" };
  });
}

export function loadConversations(accountId: string, storage?: Storage): Conversation[] {
  try {
    const target = localStorageOrThrow(storage);
    const raw = target.getItem(accountConversationsStorageKey(accountId));

    if (!raw) return [];

    return parseConversationPayload(raw) ?? [];
  } catch {
    return [];
  }
}

export function saveConversations(
  accountId: string,
  conversations: Conversation[],
  storage?: Storage,
): void {
  const target = localStorageOrThrow(storage);
  const payload = storedDataSchema.parse({ version: 1, conversations });
  target.setItem(accountConversationsStorageKey(accountId), JSON.stringify(payload));
}

export async function mutateAccountConversations(
  accountId: string,
  mutation: (current: Conversation[]) => Conversation[] | null,
  storage?: Storage,
  withLock: ExclusiveMigrationLock = browserExclusiveLock,
): Promise<Conversation[]> {
  const target = localStorageOrThrow(storage);
  return withLock(`${ACCOUNT_CONVERSATION_WRITE_LOCK_PREFIX}${accountId}`, async () => {
    const key = accountConversationsStorageKey(accountId);
    let raw: string | null;
    try {
      raw = target.getItem(key);
    } catch {
      throw new ConversationMigrationError("storage-unavailable");
    }

    const current = raw === null ? [] : parseConversationPayload(raw);
    if (current === null) throw new ConversationMigrationError("conflict");

    const next = mutation(current);
    if (next === null) {
      return [...current].sort((left, right) => right.updatedAt - left.updatedAt);
    }
    const sorted = [...next].sort((left, right) => right.updatedAt - left.updatedAt);
    saveConversations(accountId, sorted, target);
    return sorted;
  });
}
