import type { Metadata } from "next";
import Link from "next/link";
import { CommitmentBadge, OffersBadge, joinabilityLabel } from "@/components/candidate-signals";
import { CheckIcon } from "@/components/status";
import { Badge, Chips, EmptyState, PageHeader, buttonClass, inlineInputClass } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { requireApprovedRecruiter } from "@/lib/auth";
import { candidateSummaryInclude, listableCandidateWhere, summarizeCandidate } from "@/lib/candidate";
import { CITIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { addDays, formatDate, splitList } from "@/lib/format";

export const metadata: Metadata = { title: "Verified talent" };

export default async function TalentPoolPage({ searchParams }: PageProps<"/recruiter/candidates">) {
  const { recruiter } = await requireApprovedRecruiter();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const city = typeof params.city === "string" && (CITIES as readonly string[]).includes(params.city) ? params.city : "";
  const within = typeof params.within === "string" && /^\d+$/.test(params.within) ? Number(params.within) : null;
  const uncommitted = params.uncommitted === "1";

  const where: Prisma.CandidateProfileWhereInput = {
    ...listableCandidateWhere,
    ...(city ? { city } : {}),
    ...(uncommitted ? { committedApplicationId: null } : {}),
    ...(within != null ? { lastWorkingDay: { lte: addDays(new Date(), within) } } : {}),
    ...(q
      ? {
          OR: [
            { skills: { contains: q, mode: "insensitive" } },
            { headline: { contains: q, mode: "insensitive" } },
            { currentTitle: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const candidates = await db.candidateProfile.findMany({
    where,
    include: candidateSummaryInclude,
    orderBy: { lastWorkingDay: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Verified talent"
        description="Only candidates whose notice period, resignation and offer letter have been verified by Readyhire."
      />
      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Skill, title or name" aria-label="Search candidates" className={`${inlineInputClass} w-full max-w-xs`} />
        <select name="city" defaultValue={city} aria-label="City" className={inlineInputClass}>
          <option value="">Any city</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select name="within" defaultValue={within ?? ""} aria-label="Joining window" className={inlineInputClass}>
          <option value="">Any joining date</option>
          <option value="15">Can join within 15 days</option>
          <option value="30">Within 30 days</option>
          <option value="60">Within 60 days</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <input type="checkbox" name="uncommitted" value="1" defaultChecked={uncommitted} className="accent-brand-700" /> Not committed
        </label>
        <button type="submit" className={buttonClass("secondary")}>
          Filter
        </button>
      </form>

      {candidates.length === 0 ? (
        <EmptyState title="No verified candidates match" description="Try widening the filters." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {candidates.map((c) => {
            const summary = summarizeCandidate(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/recruiter/candidates/${c.id}`}
                  className="block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-brand-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{c.user.name}</p>
                      <p className="truncate text-sm text-slate-600">{c.headline ?? c.currentTitle}</p>
                    </div>
                    <Badge tone="green">
                      <CheckIcon /> Verified
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {[c.currentTitle, c.currentCompany].filter(Boolean).join(" at ")}
                    {c.experienceYears != null && ` · ${c.experienceYears} yrs`}
                    {c.city && ` · ${c.city}`}
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900">{joinabilityLabel(summary.notice)}</p>
                    <p className="text-xs text-slate-500">
                      {c.noticePeriodDays}-day notice · resigned {formatDate(c.resignationDate)} · LWD {formatDate(c.lastWorkingDay)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <OffersBadge summary={summary} />
                    <CommitmentBadge summary={summary} recruiterId={recruiter.id} />
                    {summary.upheldGhosting > 0 && <Badge tone="red">{summary.upheldGhosting} ghosting report(s)</Badge>}
                  </div>
                  <div className="mt-3">
                    <Chips items={splitList(c.skills).slice(0, 6)} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
