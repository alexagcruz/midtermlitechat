import { expect, test, type Page } from "@playwright/test";
import { createAndEnter, login, openRegistration, registerAccount } from "./helpers";

function assistantResponse(content: string) {
  return {
    assistant: {
      content,
      routeId: "openai-chat",
      finishReason: "stop",
      incomplete: false,
      usage: {
        inputTokens: 4,
        outputTokens: 6,
        totalTokens: 10,
        totalSource: "proxy",
      },
    },
  };
}

async function loginForm(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
}

test("completes create, chat, logout, failed login, and re-login through the UI", async ({
  page,
  context,
}) => {
  const requests: Array<{ routeId: string; messages: unknown[] }> = [];
  await page.route("**/api/chat", async (route) => {
    const request = route.request().postDataJSON() as {
      routeId: string;
      messages: unknown[];
    };
    requests.push(request);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(assistantResponse("A mocked Deeda answer")),
    });
  });

  await openRegistration(page);
  await registerAccount(page, "  owner@example.com ", "correct-horse-1", "Owner");
  await expect(page.getByLabel("Email")).toHaveValue("owner@example.com");
  await login(page, "owner@example.com");
  await expect(page.getByRole("heading", { name: "Your AI workbench" })).toBeVisible();
  await expect(page.locator("#proxy-route option")).toHaveCount(3);

  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await expect(otherTab.getByRole("heading", { name: "Welcome to Deeda" })).toBeVisible();
  await expect(otherTab.getByRole("textbox", { name: "Message" })).toHaveCount(0);
  await otherTab.close();

  const composer = page.getByRole("textbox", { name: "Message" });
  await composer.click();
  await expect(composer).toBeFocused();
  await composer.fill("A saved owner conversation");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("A mocked Deeda answer")).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Saved conversations" })
      .locator(".conversation-select")
      .filter({ hasText: "A saved owner conversation" }),
  ).toBeVisible();
  expect(requests).toEqual([
    {
      routeId: "openai-chat",
      messages: [{ role: "user", content: "A saved owner conversation" }],
    },
  ]);

  const browserStorage = await page.evaluate(() => ({
    local: Object.entries(localStorage).map(([key, value]) => [key, value]),
    session: Object.entries(sessionStorage).map(([key, value]) => [key, value]),
  }));
  expect(JSON.stringify(browserStorage)).not.toContain("correct-horse-1");
  expect(JSON.stringify(browserStorage)).not.toContain("passwordConfirmation");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Deeda" })).toBeVisible();
  await loginForm(page, "owner@example.com", "incorrect-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Email or password is incorrect.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your AI workbench" })).toHaveCount(0);

  await login(page, "owner@example.com", "correct-horse-1");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Saved conversations" })
      .locator(".conversation-select")
      .filter({ hasText: "A saved owner conversation" }),
  ).toBeVisible();
});

test("migrates legacy chats to one account and keeps a second account isolated", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(assistantResponse("Second account response")),
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "litechat.conversations.v1",
      JSON.stringify({
        version: 1,
        conversations: [
          {
            id: "legacy-conversation",
            title: "Legacy research notes",
            createdAt: 10,
            updatedAt: 10,
            selectedRouteId: "openai-chat",
            messages: [
              {
                id: "legacy-message",
                role: "user",
                content: "This browser conversation should be kept",
                createdAt: 10,
                delivery: "complete",
              },
            ],
          },
        ],
      }),
    );
  });

  await openRegistration(page);
  await registerAccount(page, "first@example.com", "first-pass-123", "First User");
  await login(page, "first@example.com", "first-pass-123");
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Saved conversations" })
      .locator(".conversation-select")
      .filter({ hasText: "Legacy research notes" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("litechat.conversations.v1")),
  ).toBeNull();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await registerAccount(page, "second@example.com", "second-pass-123", "Second User");
  await login(page, "second@example.com", "second-pass-123");
  await expect(page.getByRole("heading", { name: "Your AI workbench" })).toBeVisible();
  await expect(page.getByText("Saved chats will appear here.")).toBeVisible();
  await expect(page.getByText("Legacy research notes", { exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Message" }).fill("A private second account chat");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Second account response")).toBeVisible();

  const accountStores = await page.evaluate(() => {
    const accountRegistry = JSON.parse(localStorage.getItem("deeda.accounts.v1") ?? "{}");
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("deeda.conversations.v1:"));
    return {
      accounts: accountRegistry.accounts.map((account: { id: string; email: string }) => account),
      keys,
    };
  });
  expect(accountStores.accounts).toHaveLength(2);
  expect(accountStores.keys).toHaveLength(2);
  const firstAccount = accountStores.accounts.find(
    (account: { email: string }) => account.email === "first@example.com",
  );
  const secondAccount = accountStores.accounts.find(
    (account: { email: string }) => account.email === "second@example.com",
  );
  expect(firstAccount.id).not.toBe(secondAccount.id);
});

test("serializes competing first logins so only one account claims legacy history", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "litechat.conversations.v1",
      JSON.stringify({
        version: 1,
        conversations: [
          {
            id: "race-conversation",
            title: "Single owner legacy chat",
            createdAt: 10,
            updatedAt: 10,
            selectedRouteId: "openai-chat",
            messages: [],
          },
        ],
      }),
    );
  });
  await openRegistration(page);
  await registerAccount(page, "racer-one@example.com", "racer-one-pass", "Racer One");
  await login(page, "racer-one@example.com", "racer-one-pass");
  await expect(
    page
      .getByRole("list", { name: "Saved conversations" })
      .locator(".conversation-select")
      .filter({ hasText: "Single owner legacy chat" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await registerAccount(page, "racer-two@example.com", "racer-two-pass", "Racer Two");

  const secondTab = await context.newPage();
  await secondTab.goto("/");
  await expect(secondTab.getByRole("heading", { name: "Welcome to Deeda" })).toBeVisible();
  await loginForm(page, "racer-one@example.com", "racer-one-pass");
  await loginForm(secondTab, "racer-two@example.com", "racer-two-pass");
  await Promise.all([
    page.getByRole("button", { name: "Log in", exact: true }).click(),
    secondTab.getByRole("button", { name: "Log in", exact: true }).click(),
  ]);
  await Promise.all([
    expect(page.getByRole("textbox", { name: "Message" })).toBeVisible(),
    expect(secondTab.getByRole("textbox", { name: "Message" })).toBeVisible(),
  ]);

  const ownerEmail = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("deeda.conversations.migration.v1") ?? "{}");
    const accounts = JSON.parse(localStorage.getItem("deeda.accounts.v1") ?? "{}").accounts;
    return accounts.find((account: { id: string }) => account.id === state.accountId)?.email;
  });
  expect(["racer-one@example.com", "racer-two@example.com"]).toContain(ownerEmail);
  const pageOneHasLegacy = await page
    .getByRole("list", { name: "Saved conversations" })
    .locator(".conversation-select")
    .filter({ hasText: "Single owner legacy chat" })
    .count();
  const pageTwoHasLegacy = await secondTab
    .getByRole("list", { name: "Saved conversations" })
    .locator(".conversation-select")
    .filter({ hasText: "Single owner legacy chat" })
    .count();
  expect(pageOneHasLegacy + pageTwoHasLegacy).toBe(1);
  expect(pageOneHasLegacy === 1).toBe(ownerEmail === "racer-one@example.com");
});

test("serializes conversation writes from two tabs signed into the same account", async ({
  page,
  context,
}) => {
  await context.route("**/api/chat", async (route) => {
    const request = route.request().postDataJSON() as {
      routeId: string;
      messages: Array<{ role: string; content: string }>;
    };
    const prompt = request.messages.at(-1)?.content ?? "prompt";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(assistantResponse(`Reply to ${prompt}`)),
    });
  });

  await createAndEnter(page, "shared@example.com", "shared-pass-123");
  const secondTab = await context.newPage();
  await secondTab.goto("/");
  await expect(secondTab.getByRole("heading", { name: "Welcome to Deeda" })).toBeVisible();
  await login(secondTab, "shared@example.com", "shared-pass-123");
  await expect(secondTab.getByRole("textbox", { name: "Message" })).toBeVisible();

  const firstComposer = page.getByRole("textbox", { name: "Message" });
  const secondComposer = secondTab.getByRole("textbox", { name: "Message" });
  await firstComposer.fill("First tab conversation");
  await secondComposer.fill("Second tab conversation");
  await Promise.all([
    page.getByRole("button", { name: "Send message" }).click(),
    secondTab.getByRole("button", { name: "Send message" }).click(),
  ]);
  await Promise.all([
    expect(page.getByText("Reply to First tab conversation")).toBeVisible(),
    expect(secondTab.getByText("Reply to Second tab conversation")).toBeVisible(),
  ]);

  const storedTitles = await page.evaluate(() => {
    const accountId = JSON.parse(sessionStorage.getItem("deeda.auth.session.v1") ?? "{}").accountId;
    const conversations = JSON.parse(
      localStorage.getItem(`deeda.conversations.v1:${accountId}`) ?? "{}",
    ).conversations;
    return conversations.map((conversation: { title: string }) => conversation.title).sort();
  });
  expect(storedTitles).toEqual(["First tab conversation", "Second tab conversation"]);
});
