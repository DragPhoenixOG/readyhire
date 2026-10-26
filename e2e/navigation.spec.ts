import { type Page, expect, test } from "@playwright/test";
import { signIn } from "./helpers";

const highlighted = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true });

test("the logo returns to the dashboard and the menu highlights Dashboard, not the last tab", async ({ browser }) => {
  const ananya = await signIn(browser, "ananya.sharma@example.com");
  await ananya.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Jobs" }).click();
  await expect(ananya.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();
  await expect(highlighted(ananya, "Jobs")).toHaveClass(/border-brand-700/);

  await ananya.getByRole("link", { name: "Readyhire" }).click();
  await expect(ananya.getByRole("heading", { name: "Welcome, Ananya" })).toBeVisible();
  await expect(highlighted(ananya, "Dashboard")).toHaveAttribute("aria-current", "page");
  await expect(highlighted(ananya, "Dashboard")).toHaveClass(/border-brand-700/);
  await expect(highlighted(ananya, "Jobs")).not.toHaveClass(/border-brand-700/);
});
