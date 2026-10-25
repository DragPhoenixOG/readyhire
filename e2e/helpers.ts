import { type Browser, type Page, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

export const PASSWORD = "Readyhire@123";
export const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");
const OUTBOX = path.join(__dirname, "..", ".e2e", "outbox.jsonl");

/** Opens a fresh browser context signed in as the given user. */
export async function signIn(browser: Browser, email: string, password = PASSWORD): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  return page;
}

/** The error message rendered by <ActionForm> and the document uploader. */
export function formError(page: Page) {
  return page.locator("p[role=alert]");
}

type SentEmail = { to: string; subject: string; text: string };

/** Emails "sent" by the console driver, newest last. */
export function sentEmails(to?: string): SentEmail[] {
  let lines: string[] = [];
  try {
    lines = readFileSync(OUTBOX, "utf8").trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
  const all = lines.map((line) => JSON.parse(line) as SentEmail);
  return to ? all.filter((e) => e.to === to) : all;
}

/** Waits for an email to `to` whose subject matches, and returns the first app link in it. */
export async function linkFromEmail(to: string, subject: RegExp): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      () => {
        const email = sentEmails(to)
          .reverse()
          .find((e) => subject.test(e.subject));
        link = email?.text.match(/https?:\/\/\S+/)?.[0];
        return link;
      },
      { timeout: 10_000 },
    )
    .toBeTruthy();
  return link!;
}
