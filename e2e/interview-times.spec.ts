import { type Page, expect, test } from "@playwright/test";
import { sentEmails, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

const HOUR = 60 * 60 * 1000;
const CRON = { Authorization: "Bearer readyhire-e2e-cron-secret" };

/** A time `hoursAhead` from now as a datetime-local value in IST, the zone the form uses. */
const istInput = (hoursAhead: number) =>
  new Date(Date.now() + hoursAhead * HOUR + 5.5 * HOUR).toISOString().slice(0, 16);

const openAdityaDevops = async (arjun: Page) => {
  await arjun.goto("/recruiter/applications?tab=progress");
  await arjun
    .getByRole("row")
    .filter({ hasText: "Aditya Kumar" })
    .filter({ hasText: "Cloud DevOps Engineer" })
    .getByRole("link")
    .first()
    .click();
  await expect(arjun.getByRole("heading", { name: "Next step" })).toBeVisible();
};

const offerTimes = async (arjun: Page, round: string, hoursAhead: number[]) => {
  const form = arjun.locator("form").filter({ has: arjun.getByRole("button", { name: "Send times" }) });
  if (!(await form.isVisible())) await arjun.locator("summary", { hasText: "Offer interview times" }).click();
  await form.getByLabel("Round").fill(round);
  for (const [i, hours] of hoursAhead.entries()) await form.getByLabel(`Option ${i + 1} (IST)`).fill(istInput(hours));
  await form.getByLabel("Meeting link or address").fill("https://meet.example.com/contoso-devops");
  await form.getByRole("button", { name: "Send times" }).click();
  await expect(arjun.getByText("Waiting for Aditya to pick a time")).toBeVisible();
};

test("candidates pick one of the offered times, then get a calendar file and one reminder", async ({
  browser,
  request,
}) => {
  const arjun = await signIn(browser, "arjun.rao@contoso.com");
  await openAdityaDevops(arjun);
  await offerTimes(arjun, "Technical round 1", [3, 26]);
  await expect
    .poll(() =>
      sentEmails("aditya.kumar@example.com").some((e) => /Pick a time for your Technical round 1/.test(e.subject)),
    )
    .toBe(true);

  const aditya = await signIn(browser, "aditya.kumar@example.com");
  await expect(aditya.getByRole("link", { name: "Pick a time" })).toBeVisible();
  await aditya.getByRole("link", { name: "Pick a time" }).click();
  const card = aditya
    .locator("section")
    .filter({ has: aditya.getByRole("heading", { name: "Pick an interview time" }) });
  await expect(card.getByRole("radio")).toHaveCount(2);
  await card.getByRole("radio").first().check();
  await card.getByRole("button", { name: "Book this time" }).click();

  // Booked from the candidate's own pick, so it is already confirmed.
  await expect(aditya.getByRole("heading", { name: "Pick an interview time" })).toBeHidden();
  const interviews = aditya.locator("section").filter({ has: aditya.getByRole("heading", { name: "Interviews" }) });
  await expect(interviews).toContainText("Technical round 1");
  await expect(interviews).toContainText("Candidate confirmed");
  await expect
    .poll(() =>
      sentEmails("arjun.rao@contoso.com").some((e) => /Aditya Kumar booked Technical round 1/.test(e.subject)),
    )
    .toBe(true);

  // The calendar file is for the two people involved, and names no one.
  const href = await interviews.getByRole("link", { name: "Add to calendar (.ics)" }).getAttribute("href");
  const ics = await aditya.request.get(href!);
  expect(ics.status()).toBe(200);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = (await ics.text()).replace(/\r\n /g, ""); // unfold long lines
  expect(body).toContain("BEGIN:VEVENT");
  expect(body).toContain("SUMMARY:Technical round 1: Cloud DevOps Engineer\\, Contoso Technology Centre");
  expect(body).not.toContain("Aditya");
  expect((await arjun.request.get(href!)).status()).toBe(200);
  const priya = await signIn(browser, "priya.menon@northwind.com");
  expect((await priya.request.get(href!)).status()).toBe(404);
  expect((await request.get(href!)).status()).toBe(401);

  // The interview is about 3 hours away: one reminder each, however often the scheduler runs.
  const reminders = () =>
    sentEmails("aditya.kumar@example.com").filter((e) => /Reminder: Technical round 1/.test(e.subject));
  const first = await request.get("/api/cron/reminders", { headers: CRON });
  expect(first.status()).toBe(200);
  expect((await first.json()).interviewReminders).toBeGreaterThanOrEqual(1);
  await request.get("/api/cron/reminders", { headers: CRON });
  expect(reminders()).toHaveLength(1);
  expect(sentEmails("arjun.rao@contoso.com").filter((e) => /Reminder: Technical round 1/.test(e.subject))).toHaveLength(
    1,
  );
});

test("candidates can ask for other times, and recruiters can withdraw times they offered", async ({ browser }) => {
  const arjun = await signIn(browser, "arjun.rao@contoso.com");
  await openAdityaDevops(arjun);
  await offerTimes(arjun, "System design", [30, 50, 74]);

  const aditya = await signIn(browser, "aditya.kumar@example.com");
  await aditya.goto("/candidate/applications");
  await aditya.getByRole("link", { name: "Cloud DevOps Engineer" }).first().click();
  await expect(aditya.getByRole("radio")).toHaveCount(3);
  await aditya.getByText("None of these work").click();
  await aditya
    .getByLabel("When are you available?")
    .fill("I'm travelling this week; any weekday after 4 pm next week works.");
  await aditya.getByRole("button", { name: "Ask for other times" }).click();
  await expect(aditya.getByRole("heading", { name: "Pick an interview time" })).toBeHidden();

  await arjun.reload();
  await expect(arjun.getByText("Aditya asked for other times for System design")).toBeVisible();
  await expect(arjun.getByText("any weekday after 4 pm next week works").first()).toBeVisible();
  expect(
    sentEmails("arjun.rao@contoso.com").some((e) => /Aditya Kumar needs other times for System design/.test(e.subject)),
  ).toBe(true);

  // Offer again, then take the times back before Aditya answers.
  await offerTimes(arjun, "System design", [170, 194]);
  arjun.once("dialog", (d) => d.accept());
  await arjun.getByRole("button", { name: "Withdraw these times" }).click();
  await expect(arjun.getByText("Waiting for Aditya to pick a time")).toBeHidden();
  await aditya.reload();
  await expect(aditya.getByRole("heading", { name: "Pick an interview time" })).toBeHidden();
  await expect(aditya.getByRole("heading", { name: "Activity" })).toBeVisible();
  await expect(aditya.getByText("Interview times withdrawn")).toBeVisible();
});
