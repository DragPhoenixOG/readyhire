import type { WorkMode } from "@/generated/prisma/enums";
import { WORK_MODE_LABEL } from "@/lib/constants";
import { formatCtcRange } from "@/lib/format";

type JobLike = {
  location: string;
  workMode: WorkMode;
  minExperience: number;
  maxExperience: number | null;
  ctcMinLpa: number | null;
  ctcMaxLpa: number | null;
  maxJoiningDays: number | null;
  openings: number;
};

export function experienceLabel(job: Pick<JobLike, "minExperience" | "maxExperience">) {
  return job.maxExperience != null ? `${job.minExperience}–${job.maxExperience} yrs` : `${job.minExperience}+ yrs`;
}

export function JobMeta({ job }: { job: JobLike }) {
  const items = [
    job.location,
    WORK_MODE_LABEL[job.workMode],
    experienceLabel(job),
    formatCtcRange(job.ctcMinLpa, job.ctcMaxLpa),
    job.maxJoiningDays != null ? `Join within ${job.maxJoiningDays} days` : "Flexible joining",
    `${job.openings} opening${job.openings === 1 ? "" : "s"}`,
  ];
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
      {items.map((item, i) => (
        <span key={i} className="whitespace-nowrap">
          {item}
        </span>
      ))}
    </p>
  );
}
