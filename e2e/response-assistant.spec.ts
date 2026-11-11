import { type Page, expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

const openApplication = async (page: Page, candidate: string) => {
  await page.goto("/recruiter/applications?tab=response");
  await page.getByRole("row").filter({ hasText: candidate }).getByRole("link").first().click();
  await expect(page.getByText("Response required")).toBeVisible();
};

test("recruiters can start a reply from an AI draft, and only what they send counts", async ({ browser }) => {
  const priya = await signIn(browser, "priya.menon@northwind.com");

  // Accept, sending the draft as it is.
  await openApplication(priya, "Aditya Kumar");
  const acceptForm = priya.locator("form").filter({ has: priya.getByRole("button", { name: "Accept application" }) });
  await acceptForm.getByRole("button", { name: "Draft with AI" }).click();
  const message = priya.getByLabel("Message to the candidate");
  await expect(message).toHaveValue(/^Hi Aditya, thank you for applying/);
  await expect(acceptForm.getByText("only what you send counts as your reply")).toBeVisible();
  await acceptForm.getByRole("button", { name: "Accept application" }).click();
  await expect(priya.getByRole("heading", { name: "Next step" })).toBeVisible();

  // Reject, editing the draft first.
  await openApplication(priya, "Pooja Das");
  const rejectForm = priya.locator("form").filter({ has: priya.getByRole("button", { name: "Reject application" }) });
  await rejectForm.getByRole("button", { name: "Draft with AI" }).click();
  const reason = priya.getByLabel("Explanation for the candidate");
  await expect(reason).toHaveValue(/^Hi Pooja/);
  await expect(priya.getByLabel("Reason", { exact: true })).not.toHaveValue("");
  await reason.fill(`${await reason.inputValue()} We'd be glad to see you apply for future analytics roles.`);
  priya.once("dialog", (d) => d.accept());
  await rejectForm.getByRole("button", { name: "Reject application" }).click();
  await expect(priya.getByRole("heading", { name: "Outcome" })).toBeVisible();

  // Admins can see which replies were sent as unchanged AI drafts.
  const admin = await signIn(browser, "admin@readyhire.in");
  await admin.goto("/admin/applications");
  const row = (candidate: string, job: string) =>
    admin.getByRole("row").filter({ hasText: candidate }).filter({ hasText: job });
  await expect(row("Aditya Kumar", "Senior Backend Engineer")).toContainText("AI draft, sent unedited");
  await expect(row("Pooja Das", "Data Engineer")).toContainText("Edited from an AI draft");
  await expect(row("Pooja Das", "Data Engineer")).not.toContainText("sent unedited");
});
