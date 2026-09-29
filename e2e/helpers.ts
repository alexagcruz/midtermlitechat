import { expect, type Page } from "@playwright/test";

export async function openRegistration(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Deeda" })).toBeVisible();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
}

export async function registerAccount(
  page: Page,
  email: string,
  password = "correct-horse-1",
  displayName = "Deeda Test User",
) {
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("form", { name: "Create account" })
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Account created. Log in with your email and password.",
  );
  await expect(page.getByLabel("Email")).toHaveValue(email.trim().toLowerCase());
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
}

export async function login(page: Page, email: string, password = "correct-horse-1") {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

export async function createAndEnter(
  page: Page,
  email = "person@example.com",
  password = "correct-horse-1",
) {
  await openRegistration(page);
  await registerAccount(page, email, password);
  await login(page, email, password);
  await expect(page.getByRole("heading", { name: "Your AI workbench" })).toBeVisible();
}
