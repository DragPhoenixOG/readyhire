import { expect, test } from "@playwright/test";
import { formError, signIn } from "./helpers";

test("a recruiter is approved or rejected once, then the decision is shown read-only", async ({ browser }) => {
  // Two admins with the page open at the same time.
  const first = await signIn(browser, "admin@readyhire.in");
  const second = await signIn(browser, "admin@readyhire.in");
  await first.goto("/admin/recruiters");
  await second.goto("/admin/recruiters");
  const kavya = (page: typeof first) => page.getByRole("row").filter({ hasText: "kavya.iyer@fabrikam.io" });

  await kavya(first).getByRole("radio", { name: "Approve" }).check();
  await kavya(first).getByRole("button", { name: "Save" }).click();
  await expect(kavya(first).getByText("Approved", { exact: true })).toBeVisible();
  await expect(kavya(first).getByRole("radio", { name: "Approve" })).toBeChecked();
  await expect(kavya(first).getByRole("radio", { name: "Approve" })).toBeDisabled();
  await expect(kavya(first).getByRole("radio", { name: "Reject" })).toBeDisabled();
  await expect(kavya(first).getByRole("button", { name: "Save" })).toBeDisabled();
  await expect(kavya(first).getByText(/^Decided /)).toBeVisible();

  // The second admin's page still shows the old form; their decision is refused.
  await kavya(second).getByRole("radio", { name: "Reject" }).check();
  await kavya(second).getByLabel("Decision note").fill("Looks like a duplicate account.");
  await kavya(second).getByRole("button", { name: "Save" }).click();
  await expect(formError(second)).toContainText("already been approved or rejected");
  await second.reload();
  await expect(kavya(second).getByText("Approved", { exact: true })).toBeVisible();
  await expect(kavya(second).getByRole("radio", { name: "Approve" })).toBeChecked();
});
