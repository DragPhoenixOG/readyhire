import type { Metadata } from "next";
import Link from "next/link";
import { JobMeta } from "@/components/job-meta";
import { ApplicationStatusBadge } from "@/components/status";
import { Badge, Chips, EmptyState, PageHeader, buttonClass, inlineInputClass } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { requireCandidate } from "@/lib/auth";
import { WORK_MODE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { visibleJobWhere } from "@/lib/jobs";
import { daysFromToday, splitList, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: PageProps<"/candidate/jobs">) {
  const { profile } = await requireCandidate();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const mode = typeof params.mode === "string" && params.mode in WORK_MODE_LABEL ? params.mode : "";

  const where: Prisma.JobWhereInput = {
    ...visibleJobWhere,
    ...(mode ? { workMode: mode as keyof typeof WORK_MODE_LABEL } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { skills: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [jobs, myApplications] = await Promise.all([
    db.job.findMany({ where, include: { company: true }, orderBy: { createdAt: "desc" } }),
    db.application.findMany({ where: { candidateId: profile.id }, select: { jobId: true, status: true } }),
  ]);
  const appliedStatus = new Map(myApplications.map((a) => [a.jobId, a.status]));
  const daysToJoin =
    profile.verificationStatus === "VERIFIED" && profile.lastWorkingDay
      ? Math.max(0, daysFromToday(profile.lastWorkingDay) + 1)
      : null;

  return (
    <>
      <PageHeader title="Jobs" description="Open roles from verified company recruiters." />

      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, skill, company or city"
          aria-label="Search jobs"
          className={`${inlineInputClass} w-full max-w-sm`}
        />
        <select name="mode" defaultValue={mode} aria-label="Work mode" className={inlineInputClass}>
          <option value="">Any work mode</option>
          {Object.entries(WORK_MODE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary")}>
          Search
        </button>
      </form>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs match" description="Try a different search." />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const applied = appliedStatus.get(job.id);
            const fits = daysToJoin != null && job.maxJoiningDays != null ? daysToJoin <= job.maxJoiningDays : null;
            return (
              <li key={job.id}>
                <Link
                  href={`/candidate/jobs/${job.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-brand-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="text-sm text-slate-600">{job.company.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fits === true && <Badge tone="green">Fits your joining date</Badge>}
                      {fits === false && <Badge tone="amber">Joining window is tighter than your notice</Badge>}
                      {applied && <ApplicationStatusBadge status={applied} />}
                    </div>
                  </div>
                  <div className="mt-2">
                    <JobMeta job={job} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Chips items={splitList(job.skills).slice(0, 6)} />
                    <span className="text-xs text-slate-500">Posted {timeAgo(job.createdAt)}</span>
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
