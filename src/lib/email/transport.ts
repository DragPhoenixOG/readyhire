import "server-only";
import { appendFile } from "node:fs/promises";
import { env } from "@/lib/env";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

async function sendWithResend(message: EmailMessage) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
}

type SmtpTransport = { sendMail: (options: Record<string, unknown>) => Promise<unknown> };
let smtp: SmtpTransport | undefined;

async function sendWithSmtp(message: EmailMessage) {
  if (!smtp) {
    const nodemailer = await import("nodemailer");
    smtp = nodemailer.createTransport(env.SMTP_URL!);
  }
  await smtp.sendMail({ from: env.EMAIL_FROM, ...message });
}

async function sendToConsole(message: EmailMessage) {
  console.info(`\n[email] To: ${message.to}\n[email] Subject: ${message.subject}\n${message.text}\n`);
  if (env.EMAIL_OUTBOX_FILE) {
    await appendFile(env.EMAIL_OUTBOX_FILE, `${JSON.stringify({ ...message, sentAt: new Date().toISOString() })}\n`);
  }
}

/** Sends an email with the configured provider. Never throws: email problems must not break user actions. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    if (env.EMAIL_DRIVER === "resend") await sendWithResend(message);
    else if (env.EMAIL_DRIVER === "smtp") await sendWithSmtp(message);
    else await sendToConsole(message);
    return true;
  } catch (error) {
    console.error(`[email] Failed to send "${message.subject}" to ${message.to}:`, error);
    return false;
  }
}
