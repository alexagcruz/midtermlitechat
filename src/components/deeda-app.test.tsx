import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_STORAGE_KEY } from "@/lib/auth/accounts";
import { DeedaApp } from "./deeda-app";

function chatResponse(content: string) {
  return new Response(
    JSON.stringify({
      assistant: {
        content,
        routeId: "openai-chat",
        finishReason: "stop",
        incomplete: false,
        usage: {
          inputTokens: 3,
          outputTokens: 4,
          totalTokens: 7,
          totalSource: "proxy",
        },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

async function createAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Create account" }));
  await user.type(screen.getByLabelText("Display name"), "A Deeda User");
  await user.type(screen.getByLabelText("Email"), "  person@example.com  ");
  await user.type(screen.getByLabelText("Password"), "correct-horse-1");
  await user.type(screen.getByLabelText("Confirm password"), "correct-horse-1");
    await user.click(
      within(screen.getByRole("form", { name: "Create account" })).getByRole("button", {
        name: "Create account",
      }),
    );
    await screen.findByText(
      "Account created. Log in with your email and password.",
      {},
      { timeout: 10_000 },
    );
}

describe("Deeda local account entry", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("creates an account, verifies login, enters the workspace, and uses the composer", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(chatResponse("A local account answer"));
    vi.stubGlobal("fetch", fetchMock);
    render(<DeedaApp />);

    expect(await screen.findByRole("heading", { name: "Welcome to Deeda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeDisabled();
    expect(screen.getByText("Google sign-in is not connected.")).toBeInTheDocument();

    await createAccount(user);
    expect(await screen.findByRole("status", {}, { timeout: 10_000 })).toHaveTextContent(
      "Account created. Log in with your email and password.",
    );
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();

    const storedAccounts = window.localStorage.getItem(ACCOUNT_STORAGE_KEY) ?? "";
    expect(storedAccounts).not.toContain("correct-horse-1");
    expect(window.sessionStorage.length).toBe(0);

    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert", {}, { timeout: 10_000 })).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(screen.queryByRole("heading", { name: "Your AI workbench" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Password"), "correct-horse-1");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("heading", { name: "Your AI workbench" })).toBeInTheDocument();

    const composer = screen.getByRole("textbox", { name: "Message" });
    await user.click(composer);
    expect(composer).toHaveFocus();
    await user.type(composer, "Can I use my workspace?");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("A local account answer")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        body: JSON.stringify({
          routeId: "openai-chat",
          messages: [{ role: "user", content: "Can I use my workspace?" }],
        }),
      }),
    );
    expect(window.localStorage.getItem(ACCOUNT_STORAGE_KEY)).not.toContain(
      "correct-horse-1",
    );
    expect(
      Object.keys(window.localStorage).some((key) => key.startsWith("deeda.conversations.v1:")),
    ).toBe(true);
  }, 15_000);

  it("does not enter the workspace with missing or malformed authentication state", async () => {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, "not-json");
    window.sessionStorage.setItem(
      "deeda.auth.session.v1",
      JSON.stringify({ version: 1, accountId: "00000000-0000-4000-8000-000000000001" }),
    );
    render(<DeedaApp />);

    expect(await screen.findByRole("heading", { name: "Welcome to Deeda" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Local account data could not be read.",
    );
    expect(screen.queryByRole("textbox", { name: "Message" })).not.toBeInTheDocument();
  });

  it("shows field-associated errors for invalid registration", async () => {
    const user = userEvent.setup();
    render(<DeedaApp />);
    await screen.findByRole("heading", { name: "Welcome to Deeda" });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.click(
      within(screen.getByRole("form", { name: "Create account" })).getByRole("button", {
        name: "Create account",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correct the highlighted account fields.",
    );
    expect(screen.getByLabelText("Display name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Display name"), "Validation User");
    await user.type(screen.getByLabelText("Email"), "validation@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "correct-pass-1");
    await user.type(screen.getByLabelText("Confirm password"), "different-pass-1");
    await user.click(
      within(screen.getByRole("form", { name: "Create account" })).getByRole("button", {
        name: "Create account",
      }),
    );
    expect(await screen.findByText("Passwords must match.")).toBeInTheDocument();
    expect(window.localStorage.getItem(ACCOUNT_STORAGE_KEY)).toBeNull();
  });

  it("restores the verified same-tab session after remount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DeedaApp />);
    await screen.findByRole("heading", { name: "Welcome to Deeda" });
    await createAccount(user);
    await screen.findByRole("status");
    await user.type(screen.getByLabelText("Password"), "correct-horse-1");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("heading", { name: "Your AI workbench" });

    unmount();
    render(<DeedaApp />);
    expect(await screen.findByRole("heading", { name: "Your AI workbench" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });
});
