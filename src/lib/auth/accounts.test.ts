import { beforeEach, describe, expect, it } from "vitest";
import {
  ACCOUNT_STORAGE_KEY,
  AUTH_SESSION_STORAGE_KEY,
  clearAuthSession,
  createLocalAccount,
  LocalAuthError,
  normalizeEmail,
  resolveAuthSession,
  saveAuthSession,
  verifyLocalCredentials,
} from "./accounts";

const registration = {
  displayName: "Deeda User",
  email: "  person@example.com  ",
  password: "correct-horse-1",
  passwordConfirmation: "correct-horse-1",
};

describe("local account storage and password verification", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("normalizes email and stores a random salted verifier without plaintext", async () => {
    const account = await createLocalAccount(registration);
    const rawStore = window.localStorage.getItem(ACCOUNT_STORAGE_KEY) ?? "";
    const parsed = JSON.parse(rawStore) as {
      version: number;
      accounts: Array<{ password: { algorithm: string; hash: string; iterations: number; salt: string; verifier: string } }>;
    };

    expect(normalizeEmail("  PERSON@Example.COM ")).toBe("person@example.com");
    expect(account.email).toBe("person@example.com");
    expect(parsed.version).toBe(1);
    expect(parsed.accounts[0]?.password).toMatchObject({
      algorithm: "PBKDF2",
      hash: "SHA-256",
      iterations: 600_000,
    });
    expect(parsed.accounts[0]?.password.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(parsed.accounts[0]?.password.verifier).toMatch(/^[0-9a-f]{64}$/);
    expect(rawStore).not.toContain(registration.password);
    expect(rawStore).not.toContain(registration.passwordConfirmation);
  });

  it("rejects missing fields, short passwords, and confirmation mismatch", async () => {
    await expect(
      createLocalAccount({ ...registration, displayName: "   " }),
    ).rejects.toMatchObject({ code: "invalid-registration" });
    await expect(
      createLocalAccount({ ...registration, password: "short", passwordConfirmation: "short" }),
    ).rejects.toMatchObject({ code: "invalid-registration" });
    await expect(
      createLocalAccount({ ...registration, passwordConfirmation: "another-password" }),
    ).rejects.toMatchObject({ code: "invalid-registration" });
    await expect(
      createLocalAccount({ ...registration, email: "not-an-email" }),
    ).rejects.toMatchObject({ code: "invalid-registration" });
    expect(window.localStorage.getItem(ACCOUNT_STORAGE_KEY)).toBeNull();
  });

  it("rejects duplicate normalized email addresses", async () => {
    await createLocalAccount(registration);

    await expect(
      createLocalAccount({ ...registration, email: "PERSON@example.com" }),
    ).rejects.toMatchObject({ code: "account-exists" });
    const store = JSON.parse(window.localStorage.getItem(ACCOUNT_STORAGE_KEY) ?? "{}");
    expect(store.accounts).toHaveLength(1);
  });

  it("rejects registration at the account-store limit without corrupting the registry", async () => {
    const accounts = Array.from({ length: 1_000 }, (_unused, index) => ({
      id: "00000000-0000-4000-8000-000000000001",
      displayName: `User ${index}`,
      email: `user-${index}@example.com`,
      password: {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        iterations: 600_000,
        salt: "0123456789abcdef0123456789abcdef",
        verifier: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
    }));
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({ version: 1, accounts }));

    await expect(
      createLocalAccount({ ...registration, email: "new-user@example.com" }),
    ).rejects.toMatchObject({ code: "account-limit" });
    expect(JSON.parse(window.localStorage.getItem(ACCOUNT_STORAGE_KEY) ?? "{}").accounts)
      .toHaveLength(1_000);
  });

  it("uses a distinct random salt for every stored account", async () => {
    const first = await createLocalAccount(registration);
    const second = await createLocalAccount({
      ...registration,
      email: "another@example.com",
    });

    expect(second.id).not.toBe(first.id);
    expect(second.password.salt).not.toBe(first.password.salt);
  });

  it("verifies the right password and rejects incorrect or unknown accounts", async () => {
    await createLocalAccount(registration);

    await expect(
      verifyLocalCredentials(" PERSON@example.com ", registration.password),
    ).resolves.toMatchObject({ email: "person@example.com", displayName: "Deeda User" });
    await expect(
      verifyLocalCredentials("person@example.com", "wrong-password"),
    ).rejects.toMatchObject({ code: "invalid-credentials" });
    await expect(
      verifyLocalCredentials("unknown@example.com", registration.password),
    ).rejects.toMatchObject({ code: "invalid-credentials" });
  });

  it("creates and resolves a tab session, then clears it on logout", async () => {
    const account = await createLocalAccount(registration);
    expect(resolveAuthSession()).toBeNull();

    saveAuthSession(account.id);
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).not.toContain(
      registration.password,
    );
    expect(resolveAuthSession()).toMatchObject({
      id: account.id,
      email: account.email,
    });

    const failingSessionStorage = {
      setItem: () => {
        throw new DOMException("Storage denied", "SecurityError");
      },
    } as unknown as Storage;
    try {
      saveAuthSession(account.id, failingSessionStorage);
      throw new Error("Expected session storage to fail.");
    } catch (error) {
      expect(error).toMatchObject({ code: "storage-unavailable" });
    }

    clearAuthSession();
    expect(resolveAuthSession()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears malformed or stale sessions instead of authenticating them", () => {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, "not-json");
    expect(resolveAuthSession()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();

    window.sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({ version: 1, accountId: "00000000-0000-4000-8000-000000000001" }),
    );
    expect(resolveAuthSession()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("fails closed for malformed account data, unavailable crypto, and storage failures", async () => {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, "not-json");
    await expect(
      verifyLocalCredentials("person@example.com", registration.password),
    ).rejects.toMatchObject({ code: "account-store-invalid" });

    window.localStorage.clear();
    await expect(
      createLocalAccount(registration, window.localStorage, {} as Crypto),
    ).rejects.toBeInstanceOf(LocalAuthError);

    const unavailableStorage = {
      getItem: () => {
        throw new DOMException("Storage denied", "SecurityError");
      },
    } as unknown as Storage;
    await expect(
      createLocalAccount(registration, unavailableStorage),
    ).rejects.toMatchObject({ code: "storage-unavailable" });

    const quotaStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    } as unknown as Storage;
    await expect(
      createLocalAccount(registration, quotaStorage),
    ).rejects.toMatchObject({ code: "storage-unavailable" });
  });

  it("does not overwrite an account registry that changes during password derivation", async () => {
    const storage = window.localStorage;
    const cryptoProvider = globalThis.crypto;
    const originalImportKey = cryptoProvider.subtle.importKey.bind(cryptoProvider.subtle);
    const changedStore = JSON.stringify({ version: 1, accounts: [] });
    let changed = false;
    const delayedCrypto = {
      getRandomValues: cryptoProvider.getRandomValues.bind(cryptoProvider),
      randomUUID: cryptoProvider.randomUUID.bind(cryptoProvider),
      subtle: {
        importKey: async (...args: Parameters<SubtleCrypto["importKey"]>) => {
          if (!changed) {
            storage.setItem(ACCOUNT_STORAGE_KEY, changedStore);
            changed = true;
          }
          return originalImportKey(...args);
        },
        deriveBits: cryptoProvider.subtle.deriveBits.bind(cryptoProvider.subtle),
      },
    } as unknown as Crypto;

    await expect(createLocalAccount(registration, storage, delayedCrypto)).rejects.toMatchObject({
      code: "storage-unavailable",
    });
    expect(storage.getItem(ACCOUNT_STORAGE_KEY)).toBe(changedStore);
  });
});
