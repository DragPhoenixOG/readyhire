import { type Browser, type Page, expect } from "@playwright/test";
import path from "node:path";

export const PASSWORD = "Readyhire@123";
export const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");

/** Opens a fresh browser context signed in as the given seeded user. */
export async function signIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  return page;
}

/** The error or success message rendered by <ActionForm>. */
export function formError(page: Page) {
  return page.locator("p[role=alert]");
}
