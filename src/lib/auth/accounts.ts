import { z } from "zod";

export const ACCOUNT_STORAGE_KEY = "deeda.accounts.v1";
export const AUTH_SESSION_STORAGE_KEY = "deeda.auth.session.v1";
export const PBKDF2_ITERATIONS = 600_000;
const MAX_LOCAL_ACCOUNTS = 1_000;

const passwordVerifierSchema = z
  .object({
    algorithm: z.literal("PBKDF2"),
    hash: z.literal("SHA-256"),
    iterations: z.literal(PBKDF2_ITERATIONS),
    salt: z.string().regex(/^[0-9a-f]{32}$/),
    verifier: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

const accountSchema = z
  .object({
    id: z.string().uuid(),
    displayName: z.string().min(1).max(80),
    email: z.string().email().max(254),
    password: passwordVerifierSchema,
  })
  .strict();

const accountStoreSchema = z
  .object({
    version: z.literal(1),
    accounts: z.array(accountSchema).max(MAX_LOCAL_ACCOUNTS),
  })
  .strict();

const sessionSchema = z
  .object({
    version: z.literal(1),
    accountId: z.string().uuid(),
  })
  .strict();

const registrationSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(256),
    passwordConfirmation: z.string().min(8).max(256),
  })
  .strict()
  .refine((input) => input.password === input.passwordConfirmation, {
    path: ["passwordConfirmation"],
  });

export type LocalAccount = z.infer<typeof accountSchema>;
export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationField = keyof RegistrationInput;
export type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>;

export function registrationFieldErrors(
  input: RegistrationInput,
): RegistrationFieldErrors {
  const parsed = registrationSchema.safeParse(input);
  if (parsed.success) return {};

  const errors: RegistrationFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field !== "displayName" && field !== "email" && field !== "password" && field !== "passwordConfirmation") {
      continue;
    }
    if (errors[field]) continue;

    errors[field] = field === "displayName"
      ? "Enter a display name."
      : field === "email"
        ? "Enter a valid email address."
        : field === "password"
          ? "Use a password with at least 8 characters."
          : input.password !== input.passwordConfirmation
            ? "Passwords must match."
            : "Confirm a password with at least 8 characters.";
  }
  return errors;
}

export type LocalAuthErrorCode =
  | "account-exists"
  | "account-limit"
  | "account-store-invalid"
  | "crypto-unavailable"
  | "conversation-migration"
  | "invalid-credentials"
  | "invalid-registration"
  | "session-invalid"
  | "storage-unavailable";

export class LocalAuthError extends Error {
  constructor(readonly code: LocalAuthErrorCode) {
    super(code);
    this.name = "LocalAuthError";
  }
}

type AccountStorageSnapshot = {
  accounts: LocalAccount[];
  raw: string | null;
};

function localStorageOrThrow(storage?: Storage): Storage {
  try {
    return storage ?? window.localStorage;
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }
}

function readAccounts(storage?: Storage): AccountStorageSnapshot {
  const target = localStorageOrThrow(storage);
  let raw: string | null;
  try {
    raw = target.getItem(ACCOUNT_STORAGE_KEY);
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }

  if (raw === null) return { accounts: [], raw };

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new LocalAuthError("account-store-invalid");
  }

  const parsed = accountStoreSchema.safeParse(decoded);
  if (!parsed.success) throw new LocalAuthError("account-store-invalid");
  return { accounts: parsed.data.accounts, raw };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cryptoOrThrow(cryptoProvider?: Crypto): Crypto {
  const provider = cryptoProvider ?? globalThis.crypto;
  if (!provider?.subtle || !provider.getRandomValues) {
    throw new LocalAuthError("crypto-unavailable");
  }
  return provider;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomBytes(length: number, cryptoProvider: Crypto): Uint8Array<ArrayBuffer> {
  return cryptoProvider.getRandomValues(new Uint8Array(new ArrayBuffer(length)));
}

function createAccountId(cryptoProvider: Crypto): string {
  if (cryptoProvider.randomUUID) return cryptoProvider.randomUUID();

  const bytes = randomBytes(16, cryptoProvider);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function deriveVerifier(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  cryptoProvider: Crypto,
): Promise<string> {
  const passwordBytes = new TextEncoder().encode(password);
  let key: CryptoKey;
  try {
    key = await cryptoProvider.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      ["deriveBits"],
    );
  } catch {
    throw new LocalAuthError("crypto-unavailable");
  } finally {
    passwordBytes.fill(0);
  }

  try {
    const bits = await cryptoProvider.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations: PBKDF2_ITERATIONS,
      },
      key,
      256,
    );
    return bytesToHex(new Uint8Array(bits));
  } catch {
    throw new LocalAuthError("crypto-unavailable");
  }
}

function equalVerifier(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createLocalAccount(
  input: RegistrationInput,
  storage?: Storage,
  cryptoProvider?: Crypto,
): Promise<LocalAccount> {
  const parsedInput = registrationSchema.safeParse(input);
  if (!parsedInput.success) throw new LocalAuthError("invalid-registration");

  const target = localStorageOrThrow(storage);
  const cryptoApi = cryptoOrThrow(cryptoProvider);
  const email = normalizeEmail(parsedInput.data.email);
  const initial = readAccounts(target);
  if (initial.accounts.some((account) => account.email === email)) {
    throw new LocalAuthError("account-exists");
  }
  if (initial.accounts.length >= MAX_LOCAL_ACCOUNTS) {
    throw new LocalAuthError("account-limit");
  }

  let salt = randomBytes(16, cryptoApi);
  let saltHex = bytesToHex(salt);
  while (initial.accounts.some((account) => account.password.salt === saltHex)) {
    salt = randomBytes(16, cryptoApi);
    saltHex = bytesToHex(salt);
  }

  const verifier = await deriveVerifier(parsedInput.data.password, salt, cryptoApi);
  const account: LocalAccount = {
    id: createAccountId(cryptoApi),
    displayName: parsedInput.data.displayName,
    email,
    password: {
      algorithm: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt: saltHex,
      verifier,
    },
  };

  const latest = readAccounts(target);
  if (latest.raw !== initial.raw) throw new LocalAuthError("storage-unavailable");
  if (latest.accounts.some((stored) => stored.email === email)) {
    throw new LocalAuthError("account-exists");
  }

  try {
    target.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({ version: 1, accounts: [...latest.accounts, account] }),
    );
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }

  return account;
}

export async function verifyLocalCredentials(
  emailInput: string,
  password: string,
  storage?: Storage,
  cryptoProvider?: Crypto,
): Promise<LocalAccount> {
  const email = normalizeEmail(emailInput);
  const account = readAccounts(storage).accounts.find((stored) => stored.email === email);
  if (!account) throw new LocalAuthError("invalid-credentials");

  const cryptoApi = cryptoOrThrow(cryptoProvider);
  const verifier = await deriveVerifier(
    password,
    hexToBytes(account.password.salt),
    cryptoApi,
  );
  if (!equalVerifier(verifier, account.password.verifier)) {
    throw new LocalAuthError("invalid-credentials");
  }
  return account;
}

export function saveAuthSession(accountId: string, storage?: Storage): void {
  const target = (() => {
    try {
      return storage ?? window.sessionStorage;
    } catch {
      throw new LocalAuthError("storage-unavailable");
    }
  })();

  const session = sessionSchema.safeParse({ version: 1, accountId });
  if (!session.success) throw new LocalAuthError("session-invalid");
  try {
    target.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session.data));
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }
}

export function clearAuthSession(storage?: Storage): void {
  try {
    (storage ?? window.sessionStorage).removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }
}

export function resolveAuthSession(
  accountStorage?: Storage,
  sessionStorage?: Storage,
): LocalAccount | null {
  let sessionTarget: Storage;
  try {
    sessionTarget = sessionStorage ?? window.sessionStorage;
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }

  let rawSession: string | null;
  try {
    rawSession = sessionTarget.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    throw new LocalAuthError("storage-unavailable");
  }
  if (rawSession === null) return null;

  let decodedSession: unknown;
  try {
    decodedSession = JSON.parse(rawSession);
  } catch {
    clearAuthSession(sessionTarget);
    return null;
  }
  const parsedSession = sessionSchema.safeParse(decodedSession);
  if (!parsedSession.success) {
    clearAuthSession(sessionTarget);
    return null;
  }

  const account = readAccounts(accountStorage).accounts.find(
    (stored) => stored.id === parsedSession.data.accountId,
  );
  if (account) return account;

  clearAuthSession(sessionTarget);
  return null;
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof LocalAuthError)) {
    return "Deeda could not complete this account action. Try again.";
  }

  switch (error.code) {
    case "account-exists":
      return "An account with this email already exists. Log in instead.";
    case "account-limit":
      return "This browser has reached its local account limit.";
    case "account-store-invalid":
      return "Local account data could not be read. Do not clear browser data if you need to preserve it.";
    case "crypto-unavailable":
      return "Secure browser password verification is unavailable. Use a supported browser context and try again.";
    case "conversation-migration":
      return "Deeda could not safely move older conversations. Existing data was kept. Check browser storage and try again.";
    case "invalid-credentials":
      return "Email or password is incorrect.";
    case "invalid-registration":
      return "Check the account fields. Passwords must be at least 8 characters and match.";
    case "session-invalid":
      return "Deeda could not create a local session. Check browser storage and try again.";
    case "storage-unavailable":
      return "This browser could not access local account storage. Check browser storage and try again.";
  }
}
