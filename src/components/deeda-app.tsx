"use client";

import { useEffect, useState } from "react";
import {
  clearAuthSession,
  LocalAuthError,
  authErrorMessage,
  createLocalAccount,
  resolveAuthSession,
  saveAuthSession,
  verifyLocalCredentials,
} from "@/lib/auth/accounts";
import type { LocalAccount, RegistrationInput } from "@/lib/auth/accounts";
import { ConversationMigrationError, migrateLegacyConversations } from "@/lib/storage/conversations";
import { ChatApp } from "@/components/chat-app";
import { DeedaEntry } from "@/components/deeda-entry";

type AccountIdentity = Pick<LocalAccount, "id" | "displayName" | "email">;

type AuthState =
  | { status: "resolving" }
  | { status: "signed-out" }
  | {
      status: "signed-in";
      account: AccountIdentity;
      migrationWarning: string;
      logoutError: string;
    };

function migrationError(): LocalAuthError {
  return new LocalAuthError("conversation-migration");
}

async function migrateForAccount(accountId: string): Promise<string> {
  try {
    const migration = await migrateLegacyConversations(accountId);
    return migration.status === "legacy-invalid"
      ? "Older conversation data was not valid and was left unchanged. This account will not share it with other accounts."
      : "";
  } catch (error) {
    if (error instanceof ConversationMigrationError) throw migrationError();
    throw error;
  }
}

export function DeedaApp() {
  const [authState, setAuthState] = useState<AuthState>({ status: "resolving" });
  const [entryNotice, setEntryNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function resolveSession() {
      try {
        const account = resolveAuthSession();
        if (!account) {
          if (active) setAuthState({ status: "signed-out" });
          return;
        }

        const migrationWarning = await migrateForAccount(account.id);
        if (active) {
          setAuthState({
            status: "signed-in",
            account: { id: account.id, displayName: account.displayName, email: account.email },
            migrationWarning,
            logoutError: "",
          });
        }
      } catch (error) {
        if (!active) return;
        setEntryNotice(authErrorMessage(error));
        setAuthState({ status: "signed-out" });
      }
    }

    void resolveSession();
    return () => {
      active = false;
    };
  }, []);

  async function register(input: RegistrationInput): Promise<string> {
    const account = await createLocalAccount(input);
    return account.email;
  }

  async function logIn(email: string, password: string): Promise<void> {
    const account = await verifyLocalCredentials(email, password);
    const migrationWarning = await migrateForAccount(account.id);
    saveAuthSession(account.id);
    setEntryNotice("");
    setAuthState({
      status: "signed-in",
      account: { id: account.id, displayName: account.displayName, email: account.email },
      migrationWarning,
      logoutError: "",
    });
  }

  function logOut() {
    try {
      clearAuthSession();
      setEntryNotice("");
      setAuthState({ status: "signed-out" });
    } catch {
      setAuthState((current) =>
        current.status === "signed-in"
          ? { ...current, logoutError: "Deeda could not clear this tab's session. Check browser storage and try again." }
          : current,
      );
    }
  }

  if (authState.status === "resolving") {
    return (
      <main className="auth-loading" role="status">
        <span className="entry-brand-mark" aria-hidden="true">d</span>
        <p>Preparing your Deeda workspace...</p>
      </main>
    );
  }

  if (authState.status === "signed-out") {
    return (
      <DeedaEntry
        initialNotice={entryNotice}
        onLogin={logIn}
        onRegister={register}
      />
    );
  }

  return (
    <ChatApp
      key={authState.account.id}
      accountId={authState.account.id}
      displayName={authState.account.displayName}
      logoutError={authState.logoutError}
      migrationWarning={authState.migrationWarning}
      onLogout={logOut}
    />
  );
}
