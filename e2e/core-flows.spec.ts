import { type Page, expect, test } from "@playwright/test";
import { SAMPLE_PDF, formError, signIn } from "./helpers";

// The flows build on each other (verify → apply → respond → commit), so they run in order.
test.describe.configure({ mode: "serial" });

test("recruiters must sign up with a company email domain", async ({ page }) => {
  await page.goto("/signup/recruiter");
  await page.getByLabel("Full name").fill("Test Recruiter");
  await page.getByLabel("Work email").fill("someone@gmail.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Company name").fill("Tailspin Toys");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(formError(page)).toContainText("Personal email providers");

  await page.getByLabel("Work email").fill("lead@tailspin.com");
  await page.getByLabel("Company website").fill("northwind.com");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(formError(page)).toContainText("must match your company website");

  await page.getByLabel("Company website").fill("tailspin.com");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Your account is awaiting approval")).toBeVisible();
});

test("a candidate is listed only after an admin verifies every document", async ({ browser }) => {
  const neha = await signIn(browser, "neha.gupta@example.com");
  await neha.goto("/candidate/profile");
  await neha.getByLabel("Current company").fill("Tailspin Toys");
  await neha.getByLabel("Skills").fill("Playwright, TypeScript");
  await neha.getByRole("button", { name: "Save profile" }).click();
  await expect(neha.getByText("Profile saved.")).toBeVisible();

  await neha.goto("/candidate/verification");
  await neha.getByLabel("Notice period (days)").fill("30");
  await neha.getByLabel("Resignation date").fill("2026-10-20");
  await neha.getByLabel("Last working day").fill("2026-11-19");
  await neha.getByRole("button", { name: "Save notice details" }).click();
  await expect(neha.getByText("Notice details saved.")).toBeVisible();

  for (const label of ["Current offer letter", "Notice period policy", "Resignation evidence"]) {
    const row = neha.getByRole("listitem").filter({ hasText: label });
    await row.getByLabel(`${label} file`).setInputFiles(SAMPLE_PDF);
    await row.getByRole("button", { name: "Upload" }).click();
    await expect(neha.getByText(`${label} uploaded.`)).toBeVisible();
  }
  await neha.getByRole("button", { name: "Submit for verification" }).click();
  await expect(neha.getByText("Under review")).toBeVisible();

  const priya = await signIn(browser, "priya.menon@northwind.com");
  await priya.goto("/recruiter/candidates");
  await expect(priya.getByText("Neha Gupta")).toHaveCount(0);

  const admin = await signIn(browser, "admin@readyhire.in");
  await admin.goto("/admin/verifications");
  await admin.getByRole("link", { name: "Neha Gupta" }).click();
  await admin.getByRole("button", { name: "Approve & list candidate" }).click();
  await expect(formError(admin)).toContainText("Verify the current offer letter");

  for (let i = 0; i < 3; i++) {
    const form = admin.locator("form:has(input[name=documentId])").nth(i);
    await form.getByLabel("Verified").check();
    await form.getByRole("button", { name: "Save review" }).click();
    await expect(form.getByRole("status")).toContainText("verified");
  }
  await admin.getByLabel("Verification method").selectOption("SCREEN_SHARE");
  await admin.getByRole("button", { name: "Approve & list candidate" }).click();
  await expect(admin.getByText("Revoke verification")).toBeVisible();

  await priya.reload();
  await expect(priya.getByText("Neha Gupta")).toBeVisible();
});

test("every application gets an accept with a message or a reject with a reason", async ({ browser }) => {
  const neha = await signIn(browser, "neha.gupta@example.com");
  const applyTo = async (title: string) => {
    await neha.goto("/candidate/jobs");
    await neha.getByRole("link", { name: new RegExp(title) }).click();
    await neha.getByRole("button", { name: "Apply with verified profile" }).click();
    await expect(neha.getByText("Awaiting response").first()).toBeVisible();
  };
  await applyTo("QA Automation Engineer");
  await applyTo("Data Engineer");

  const priya = await signIn(browser, "priya.menon@northwind.com");
  const openApplication = async (job: string) => {
    await priya.goto("/recruiter/applications?tab=response");
    await priya.getByRole("row").filter({ hasText: "Neha Gupta" }).filter({ hasText: job }).getByRole("link").click();
    await expect(priya.getByText("Response required")).toBeVisible();
  };

  // The server rejects vague reasons even if the browser's own validation is bypassed.
  await openApplication("Data Engineer");
  await priya.getByLabel("Reason", { exact: true }).selectOption("Skills don't match the role");
  const reason = priya.getByLabel("Explanation for the candidate");
  await reason.evaluate((el) => el.removeAttribute("minlength"));
  await reason.fill("No.");
  priya.once("dialog", (d) => d.accept());
  await priya.getByRole("button", { name: "Reject application" }).click();
  await expect(formError(priya)).toContainText("at least 15 characters");

  await reason.fill("We need production Spark experience for this role.");
  priya.once("dialog", (d) => d.accept());
  await priya.getByRole("button", { name: "Reject application" }).click();
  await expect(priya.getByRole("heading", { name: "Outcome" })).toBeVisible();

  await openApplication("QA Automation Engineer");
  await priya.getByLabel("Message to the candidate").fill("Thanks Neha — let's start with a Playwright exercise.");
  await priya.getByRole("button", { name: "Accept application" }).click();
  await expect(priya.getByRole("heading", { name: "Next step" })).toBeVisible();

  await neha.goto("/candidate/applications");
  await expect(neha.getByRole("row").filter({ hasText: "Data Engineer" })).toContainText(
    "We need production Spark experience for this role.",
  );
});

test("a candidate can commit to only one role at a time", async ({ browser }) => {
  const neha = await signIn(browser, "neha.gupta@example.com");
  await neha.goto("/candidate/applications");
  await neha.getByRole("link", { name: "QA Automation Engineer" }).click();
  neha.once("dialog", (d) => d.accept());
  await neha.getByRole("button", { name: "Commit to this role" }).click();
  await expect(neha.getByText("You're committed to this role")).toBeVisible();

  await neha.goto("/candidate/jobs");
  await neha.getByRole("link", { name: /Senior Backend Engineer/ }).click();
  await expect(neha.getByText("You're committed to another role")).toBeVisible();

  const priya = await signIn(browser, "priya.menon@northwind.com");
  await priya.goto("/recruiter/applications?tab=progress");
  await priya.getByRole("row").filter({ hasText: "Neha Gupta" }).getByRole("link").click();
  await expect(priya.getByText("Committed to this role").first()).toBeVisible();
});

test("recruiters with overdue responses can't post new jobs", async ({ browser }) => {
  const arjun: Page = await signIn(browser, "arjun.rao@contoso.com");
  await expect(arjun.getByText(/overdue for a response/)).toBeVisible();
  await arjun.goto("/recruiter/jobs/new");
  await expect(arjun.getByText("Posting is paused")).toBeVisible();
});

test("only admins and the owner can open candidate documents", async ({ browser }) => {
  const admin = await signIn(browser, "admin@readyhire.in");
  await admin.goto("/admin/verifications?status=PENDING");
  await admin.getByRole("link", { name: "Rohan Verma" }).click();
  const href = await admin.getByRole("link", { name: "resignation-acceptance.pdf" }).getAttribute("href");
  expect((await admin.request.get(href!)).status()).toBe(200);

  const priya = await signIn(browser, "priya.menon@northwind.com");
  expect((await priya.request.get(href!)).status()).toBe(404);
});
