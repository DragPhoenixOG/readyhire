import { expect, test } from "@playwright/test";
import { SAMPLE_PDF, formError, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("candidates upload, replace and remove a PDF resume", async ({ browser }) => {
  const neha = await signIn(browser, "neha.gupta@example.com");
  await neha.goto("/candidate/profile");
  await expect(neha.getByText("No resume uploaded")).toBeVisible();

  await neha.getByLabel("Resume file").setInputFiles({
    name: "resume.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await neha.getByRole("button", { name: "Upload resume" }).click();
  await expect(formError(neha)).toContainText("Upload your resume as a PDF.");

  await neha.getByLabel("Resume file").setInputFiles(SAMPLE_PDF);
  await neha.getByRole("button", { name: "Upload resume" }).click();
  await expect(neha.getByText("Resume uploaded.")).toBeVisible();
  const first = await neha.getByRole("link", { name: "sample.pdf" }).getAttribute("href");
  const opened = await neha.request.get(first!);
  expect(opened.status()).toBe(200);
  expect(opened.headers()["content-type"]).toBe("application/pdf");

  // A new upload replaces the old file.
  await neha.getByLabel("Resume file").setInputFiles(SAMPLE_PDF);
  await neha.getByRole("button", { name: "Replace resume" }).click();
  await expect(neha.getByText("Resume uploaded.")).toBeVisible();
  await expect(neha.getByRole("link", { name: "sample.pdf" })).toHaveCount(1);

  neha.once("dialog", (d) => d.accept());
  await neha.getByRole("button", { name: "Remove resume" }).click();
  await expect(neha.getByText("No resume uploaded")).toBeVisible();
  expect((await neha.request.get(first!)).status()).toBe(404);
});

test("only recruiters the candidate applied to can open the resume", async ({ browser, request }) => {
  // Vikram applied to Arjun's (Contoso) jobs, not Priya's (Northwind).
  const arjun = await signIn(browser, "arjun.rao@contoso.com");
  await arjun.goto("/recruiter/applications?tab=offers");
  await arjun.getByRole("link", { name: "Vikram Singh" }).click();
  const resume = arjun.getByRole("link", { name: "vikram-singh-resume.pdf" });
  await expect(resume).toBeVisible();
  const href = (await resume.getAttribute("href"))!;
  expect((await arjun.request.get(href)).status()).toBe(200);

  const admin = await signIn(browser, "admin@readyhire.in");
  expect((await admin.request.get(href)).status()).toBe(200);

  const priya = await signIn(browser, "priya.menon@northwind.com");
  expect((await priya.request.get(href)).status()).toBe(404);
  const ananya = await signIn(browser, "ananya.sharma@example.com");
  expect((await ananya.request.get(href)).status()).toBe(404);
  expect((await request.get(href)).status()).toBe(401);
});
