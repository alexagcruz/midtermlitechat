import { expect, test } from "@playwright/test";
import { createAndEnter, openRegistration, registerAccount, login } from "./helpers";

function assistantResponse(content: string, routeId: string) {
  return {
    assistant: {
      content,
      routeId,
      finishReason: "stop",
      incomplete: false,
      usage: {
        inputTokens: 9,
        outputTokens: 5,
        totalTokens: 14,
        totalSource: "proxy",
      },
    },
  };
}

test("supports a multi-turn route switch and browser-local session workflow", async ({
  page,
}) => {
  const calls: Array<{ routeId: string; messages: unknown[] }> = [];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.route("**/api/chat", async (route) => {
    const request = route.request().postDataJSON() as {
      routeId: string;
      messages: unknown[];
    };
    calls.push(request);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(assistantResponse(`Reply ${calls.length}`, request.routeId)),
    });
  });

  await createAndEnter(page);
  const stylesheetPaths = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
    links.map((link) => new URL((link as HTMLLinkElement).href).pathname),
  );
  const scriptPaths = await page.locator('script[src*="_next/"]').evaluateAll((scripts) =>
    scripts.map((script) => new URL((script as HTMLScriptElement).src).pathname),
  );
  expect(stylesheetPaths.length).toBeGreaterThan(0);
  expect(scriptPaths.length).toBeGreaterThan(0);
  if (process.env.VSCODE_PROXY_URI) {
    const prefix = `/proxy/${process.env.PORT || "3000"}/_next/`;
    expect(stylesheetPaths.some((path) => path.startsWith(prefix))).toBe(true);
    expect(scriptPaths.every((path) => path.startsWith(prefix))).toBe(true);
  }
  expect(
    await page
      .locator(".app-shell")
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe("grid");
  await expect(
    page.getByRole("heading", { name: "Your AI workbench" }),
  ).toBeVisible();
  await expect(page.locator("#proxy-route option")).toHaveCount(3);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeEnabled();

  const composer = page.getByRole("textbox", { name: "Message" });
  await composer.click();
  await expect(composer).toBeFocused();
  await composer.fill("First prompt");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Reply 1")).toBeVisible();

  const routeSelector = page.getByLabel("Proxy route");
  await routeSelector.click();
  await routeSelector.press("ArrowDown");
  await routeSelector.press("Enter");
  await expect(routeSelector).toHaveValue("anthropic-messages");
  await page.getByRole("textbox", { name: "Message" }).fill("Follow-up prompt");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Reply 2")).toBeVisible();
  await expect(page.getByText("TOTAL 28")).toBeVisible();

  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual({
    routeId: "anthropic-messages",
    messages: [
      { role: "user", content: "First prompt" },
      { role: "assistant", content: "Reply 1" },
      { role: "user", content: "Follow-up prompt" },
    ],
  });

  await page.getByRole("button", { name: "Rename First prompt" }).click();
  await page.getByRole("textbox", { name: "Conversation name" }).fill("Research notes");
  await page.getByRole("button", { name: "Save conversation name" }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();

  const savedChat = page
    .getByRole("list", { name: "Saved conversations" })
    .locator(".conversation-select")
    .filter({ hasText: "Research notes" });
  await expect(savedChat).toBeVisible();
  await savedChat.click();
  await expect(page.getByText("First prompt", { exact: true })).toBeVisible();
  await expect(page.getByText("Follow-up prompt", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Proxy route")).toHaveValue("anthropic-messages");

  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your AI workbench" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Saved conversations" })
      .locator(".conversation-select")
      .filter({ hasText: "Research notes" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  const openNavigation = page.locator(".mobile-nav-toggle");
  await expect(openNavigation).toBeVisible();
  await expect(openNavigation).toHaveAttribute("aria-label", "Open conversations");
  await expect(openNavigation).toHaveAttribute("aria-expanded", "false");
  await openNavigation.click();
  await expect(page.getByRole("button", { name: "Close conversations" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page
    .getByRole("list", { name: "Saved conversations" })
    .locator(".conversation-select")
    .filter({ hasText: "Research notes" })
    .click();
  await expect(page.getByRole("button", { name: "Open conversations" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByText("First prompt", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Open conversations" }).click();
  await page.getByRole("button", { name: "Delete Research notes" }).click();
  await expect(page.getByRole("button", { name: /Research notes/ })).toHaveCount(0);
  await page.getByRole("button", { name: /new conversation/i }).click();
  await expect(page.getByRole("heading", { name: "Your AI workbench" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Open conversations" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  const mobileComposer = page.getByRole("textbox", { name: "Message" });
  await mobileComposer.click();
  await expect(mobileComposer).toBeFocused();
  expect(browserErrors).toEqual([]);
});

test("preserves a failed prompt and retries it without another external request", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/chat", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "RATE_LIMITED", message: "The proxy is busy. Try again." },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(assistantResponse("Retry succeeded", "openai-chat")),
    });
  });

  await createAndEnter(page);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeEnabled();
  await page.getByRole("textbox", { name: "Message" }).fill("Keep this prompt");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("The proxy is busy. Try again.")).toBeVisible();
  await expect(
    page.getByTestId("message-user").getByText("Keep this prompt", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry this prompt" }).click();
  await expect(page.getByText("Retry succeeded")).toBeVisible();
  await expect(page.getByTestId("message-user")).toHaveCount(1);
  expect(attempts).toBe(2);
});

test("keeps the account entry accessible and responsive on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openRegistration(page);
  const displayNameField = page.getByLabel("Display name");
  await expect(displayNameField).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.keyboard.press("Tab");
  const passwordField = page.getByLabel("Password", { exact: true });
  await expect(passwordField).toBeFocused();
  expect(await passwordField.evaluate((element) => getComputedStyle(element).outlineWidth)).not.toBe("0px");
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeDisabled();
  await expect(page.getByText("Google sign-in is not connected.")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await registerAccount(page, "mobile@example.com");
  await login(page, "mobile@example.com");
  await expect(page.getByRole("heading", { name: "Your AI workbench" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeEnabled();
});
