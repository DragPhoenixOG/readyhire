import { expect, test } from "@playwright/test";
import { e2eEnv } from "../playwright.config";
import { SAMPLE_PDF, formError, linkFromEmail, sentEmails, signIn } from "./helpers";

// The flows build on each other (verify → apply → respond → commit), so they run in order.
test.describe.configure({ mode: "serial" });

test("recruiters sign up with a company domain and confirm their work email", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();

  // Dashboards stay locked until the inbox is confirmed.
  await page.goto("/recruiter");
  await expect(page).toHaveURL(/\/verify-email$/);

  await page.goto(await linkFromEmail("lead@tailspin.com", /Confirm your email/));
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByText("Your account is awaiting approval")).toBeVisible();
});

test("candidates confirm their email and can reset a forgotten password", async ({ page }) => {
  await page.goto("/signup/candidate");
  await page.getByLabel("Full name").fill("Meena Pillai");
  await page.getByLabel("Email").fill("meena.pillai@example.com");
  await page.getByLabel("Password").fill("first-password");
  await page.getByLabel("City").selectOption("Hyderabad");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();

  await page.goto(await linkFromEmail("meena.pillai@example.com", /Confirm your email/));
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByRole("heading", { name: "Welcome, Meena" })).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("meena.pillai@example.com");
  await page.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");

  const resetLink = await linkFromEmail("meena.pillai@example.com", /Reset your Readyhire password/);
  await page.goto(resetLink);
  await page.getByLabel("New password", { exact: true }).fill("second-password");
  await page.getByLabel("Repeat new password").fill("second-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "Welcome, Meena" })).toBeVisible();

  // Reset links are single-use.
  await page.goto(resetLink);
  await expect(page.getByText("expired or was already used")).toBeVisible();
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
  await expect.poll(() => sentEmails("neha.gupta@example.com").some((e) => /verified/.test(e.subject))).toBe(true);

  await admin.goto("/admin/audit");
  await expect(admin.getByText("CANDIDATE_VERIFIED")).toBeVisible();

  await priya.reload();
  await expect(priya.getByText("Neha Gupta")).toBeVisible();
});

test("uploads are checked by content, not by the declared type", async ({ browser }) => {
  const divya = await signIn(browser, "divya.menon@example.com");
  await divya.goto("/candidate/verification");
  const row = divya.getByRole("listitem").filter({ hasText: "Resignation evidence" });
  await row.getByLabel("Resignation evidence file").setInputFiles({
    name: "resignation.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("this is not really a pdf"),
  });
  await row.getByRole("button", { name: "Replace file" }).click();
  await expect(row.getByRole("alert")).toContainText("isn't a valid PDF");
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
  await expect
    .poll(() => sentEmails("priya.menon@northwind.com").filter((e) => /New application/.test(e.subject)).length)
    .toBe(2);

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
  await expect
    .poll(() => sentEmails("neha.gupta@example.com").some((e) => /accepted your application/.test(e.subject)))
    .toBe(true);
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

test("overdue responses pause job posting and trigger a reminder", async ({ browser, request }) => {
  const arjun = await signIn(browser, "arjun.rao@contoso.com");
  await expect(arjun.getByText(/overdue for a response/)).toBeVisible();
  await arjun.goto("/recruiter/jobs/new");
  await expect(arjun.getByText("Posting is paused")).toBeVisible();

  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  const run = await request.get("/api/cron/reminders", {
    headers: { Authorization: `Bearer ${e2eEnv.CRON_SECRET}` },
  });
  expect(run.ok()).toBe(true);
  expect(sentEmails("arjun.rao@contoso.com").some((e) => /overdue/.test(e.subject))).toBe(true);
});

test("only admins and the owner can open candidate documents", async ({ browser }) => {
  const admin = await signIn(browser, "admin@readyhire.in");
  await admin.goto("/admin/verifications?status=PENDING");
  await admin.getByRole("link", { name: "Rohan Verma" }).click();
  const href = await admin.getByRole("link", { name: "resignation-acceptance.pdf" }).getAttribute("href");

  const asAdmin = await admin.request.get(href!);
  expect(asAdmin.status()).toBe(200);
  expect(asAdmin.headers()["content-type"]).toBe("application/pdf");

  const priya = await signIn(browser, "priya.menon@northwind.com");
  expect((await priya.request.get(href!)).status()).toBe(404);
});

test("pages are served with a nonce-based content security policy", async ({ request }) => {
  const response = await request.get("/login");
  const csp = response.headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'self'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});

test("an open application page shows the recruiter's response without a reload", async ({ browser }) => {
  const karthik = await signIn(browser, "karthik.iyer@example.com");
  await karthik.goto("/candidate/applications");
  await karthik.getByRole("link", { name: "Frontend Engineer (React)" }).click();
  await expect(karthik.getByText("Awaiting response").first()).toBeVisible();

  const arjun = await signIn(browser, "arjun.rao@contoso.com");
  await arjun.goto("/recruiter/applications?tab=response");
  await arjun.getByRole("row").filter({ hasText: "Karthik Iyer" }).getByRole("link").click();
  await arjun.getByLabel("Message to the candidate").fill("Your design-system work stands out — let's talk this week.");
  await arjun.getByRole("button", { name: "Accept application" }).click();
  await expect(arjun.getByRole("heading", { name: "Next step" })).toBeVisible();

  // Returning to the tab refreshes immediately; otherwise the page polls every 20 seconds.
  await karthik.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(karthik.getByText("Your design-system work stands out").first()).toBeVisible({ timeout: 25_000 });
});

test("after an offer, the candidate sees the recruiter's offer message as the latest response", async ({ browser }) => {
  const vikram = await signIn(browser, "vikram.singh@example.com");
  await vikram.goto("/candidate/applications");
  await expect(vikram.getByRole("row").filter({ hasText: "Cloud DevOps Engineer" })).toContainText(
    "Offer released at 31 LPA",
  );
  await vikram.getByRole("link", { name: "Cloud DevOps Engineer" }).click();
  const response = vikram.getByRole("region").filter({ hasText: "Recruiter response" });
  await expect(vikram.getByText(/^Offer extended /)).toBeVisible();
  await expect(vikram.getByText("Offer released at 31 LPA, joining in 10 days.").first()).toBeVisible();
  await expect(response.getByText("Great AKS background")).toHaveCount(0);
});

test("admins see the recruiter's latest reply (the offer message) on the applications page", async ({ browser }) => {
  const admin = await signIn(browser, "admin@readyhire.in");
  await admin.goto("/admin/applications?status=OFFERED");
  const row = admin.getByRole("row").filter({ hasText: "Vikram Singh" });
  await expect(row).toContainText("Offer released at 31 LPA");
  await expect(row).not.toContainText("Great AKS background");
});
