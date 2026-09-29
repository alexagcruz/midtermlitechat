import { expect, test } from "@playwright/test";

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

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your AI workbench" }),
  ).toBeVisible();
  await expect(page.locator("#proxy-route option")).toHaveCount(3);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeEnabled();

  await page.getByRole("textbox", { name: "Message" }).fill("First prompt");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Reply 1")).toBeVisible();

  await page.getByLabel("Proxy route").selectOption("anthropic-messages");
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
  await page.getByRole("button", { name: "Close conversations" }).click();
  await expect(page.getByRole("button", { name: "Open conversations" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
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

  await page.goto("/");
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
