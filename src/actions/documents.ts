"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireCandidate } from "@/lib/auth";
import { verificationEditable } from "@/lib/candidate";
import { DOCUMENT_INFO } from "@/lib/constants";
import { db } from "@/lib/db";
import { type ActionState, done, fail } from "@/lib/forms";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { signPayload, verifyPayload } from "@/lib/signing";
import { documentStore } from "@/lib/storage";
import { UPLOAD_URL_TTL_SECONDS, type UploadTarget } from "@/lib/storage/types";
import { allowedUploadTypes, cleanFileName, matchesSignature, uploadProblem } from "@/lib/upload-rules";

// Documents go straight from the browser to storage:
//   1. prepareDocumentUpload checks permissions and returns a signed upload URL + ticket
//   2. the browser PUTs the file to that URL
//   3. completeDocumentUpload checks the stored object's size and signature, then records it.

const TICKET_PURPOSE = "document-upload";

const targetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("required"),
    type: z.enum(["OFFER_LETTER", "NOTICE_POLICY", "RESIGNATION_PROOF"]),
  }),
  z.object({ kind: z.literal("offer"), offerId: z.string().min(1).max(50) }),
  z.object({ kind: z.literal("resume") }),
]);
export type UploadTargetInput = z.infer<typeof targetSchema>;

const uploadKind = (target: UploadTargetInput) => (target.kind === "resume" ? "resume" : "document");

const prepareSchema = z.object({
  target: targetSchema,
  fileName: z.string().min(1).max(300),
  contentType: z.string().max(100),
  size: z.number().int(),
});

type Ticket = {
  candidateId: string;
  key: string;
  contentType: string;
  size: number;
  fileName: string;
  target: UploadTargetInput;
};

export type PrepareUploadResult = { ok: true; upload: UploadTarget; ticket: string } | { ok: false; error: string };

async function targetProblem(candidateId: string, verificationStatus: string, target: UploadTargetInput) {
  // The resume isn't part of verification, so it can change at any time.
  if (target.kind === "resume") return null;
  if (target.kind === "required") {
    return verificationEditable(verificationStatus)
      ? null
      : "Documents are locked while verification is pending or complete.";
  }
  const offer = await db.offer.findFirst({
    where: { id: target.offerId, candidateId },
    select: { id: true },
  });
  return offer ? null : "Offer not found.";
}

export async function prepareDocumentUpload(input: z.input<typeof prepareSchema>): Promise<PrepareUploadResult> {
  const { user, profile } = await requireCandidate();
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload request." };
  const { target, fileName, contentType, size } = parsed.data;

  const limit = await rateLimit(`upload:${user.id}`, 30, 60 * 60);
  if (!limit.ok) return { ok: false, error: retryMessage(limit.retryAfterSeconds) };

  const problem =
    uploadProblem(contentType, size, uploadKind(target)) ??
    (await targetProblem(profile.id, profile.verificationStatus, target));
  if (problem) return { ok: false, error: problem };

  const key = `candidates/${profile.id}/${randomUUID()}.${allowedUploadTypes(uploadKind(target))[contentType]}`;
  const upload = await documentStore().createUpload(key, contentType, size);
  const ticket = await signPayload(
    TICKET_PURPOSE,
    {
      candidateId: profile.id,
      key,
      contentType,
      size,
      fileName: cleanFileName(fileName),
      target,
    } satisfies Ticket,
    UPLOAD_URL_TTL_SECONDS + 10 * 60,
  );
  return { ok: true, upload, ticket };
}

export async function completeDocumentUpload(ticketToken: string): Promise<ActionState> {
  const { profile } = await requireCandidate();
  const ticket = await verifyPayload<Ticket>(TICKET_PURPOSE, String(ticketToken));
  if (!ticket || ticket.candidateId !== profile.id) return fail("This upload expired. Please try again.");

  // A double submit of the same ticket is harmless.
  const existing =
    ticket.target.kind === "resume"
      ? await db.resume.findUnique({ where: { storageKey: ticket.key }, select: { id: true } })
      : await db.document.findUnique({ where: { storageKey: ticket.key }, select: { id: true } });
  if (existing) return done();

  const store = documentStore();
  const stored = await store.stat(ticket.key);
  if (!stored) return fail("The file didn't finish uploading. Please try again.");
  const head = await store.readHead(ticket.key, 16);
  const problem =
    stored.size !== ticket.size
      ? "The uploaded file doesn't match what was expected. Please try again."
      : !matchesSignature(ticket.contentType, head)
        ? ticket.target.kind === "resume"
          ? "That file isn't a valid PDF."
          : "That file isn't a valid PDF, PNG, JPG or WebP."
        : await targetProblem(profile.id, profile.verificationStatus, ticket.target);
  if (problem) {
    await store.remove(ticket.key);
    return fail(problem);
  }

  const file = {
    storageKey: ticket.key,
    fileName: ticket.fileName,
    mimeType: ticket.contentType,
    sizeBytes: ticket.size,
  };
  let replacedKeys: string[] = [];

  if (ticket.target.kind === "required") {
    const type = ticket.target.type;
    // One current document per required type: a new upload replaces the previous one.
    const previous = await db.document.findMany({
      where: { candidateId: profile.id, type },
    });
    await db.$transaction([
      db.document.deleteMany({
        where: { id: { in: previous.map((d) => d.id) } },
      }),
      db.document.create({ data: { candidateId: profile.id, type, ...file } }),
    ]);
    replacedKeys = previous.map((d) => d.storageKey);
  } else if (ticket.target.kind === "resume") {
    // One resume per candidate: a new upload replaces the previous one.
    const previous = await db.resume.findUnique({ where: { candidateId: profile.id } });
    await db.resume.upsert({
      where: { candidateId: profile.id },
      create: { candidateId: profile.id, ...file },
      update: { ...file, uploadedAt: new Date() },
    });
    replacedKeys = previous ? [previous.storageKey] : [];
  } else {
    const offerId = ticket.target.offerId;
    const offer = await db.offer.findUniqueOrThrow({
      where: { id: offerId },
      include: { document: true },
    });
    await db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: { candidateId: profile.id, type: "OTHER_OFFER", ...file },
      });
      await tx.offer.update({
        where: { id: offerId },
        data: { documentId: document.id },
      });
      if (offer.document) await tx.document.delete({ where: { id: offer.document.id } });
    });
    replacedKeys = offer.document ? [offer.document.storageKey] : [];
  }

  await Promise.all(replacedKeys.map((key) => store.remove(key)));
  refresh();
  return done(
    ticket.target.kind === "required"
      ? `${DOCUMENT_INFO[ticket.target.type].label} uploaded.`
      : ticket.target.kind === "resume"
        ? "Resume uploaded."
        : "Offer letter attached. Readyhire will verify it.",
  );
}

export async function removeResume(): Promise<ActionState> {
  const { profile } = await requireCandidate();
  const resume = await db.resume.findUnique({ where: { candidateId: profile.id } });
  if (!resume) return done("Resume removed.");
  await db.resume.delete({ where: { id: resume.id } });
  await documentStore().remove(resume.storageKey);
  refresh();
  return done("Resume removed.");
}
