import { splitList } from "@/lib/format";

/**
 * Everything the AI is allowed to know when drafting a reply to an application. Built only from what the recruiter
 * already sees before replying, and only what a reply needs: the job, the candidate's profile and their verified
 * joining timeline. Contact details, documents, resumes and other offers are deliberately absent
 * (docs/architecture/hiring-coordination.md, rule R7).
 */
export type ResponseContext = {
  job: {
    title: string;
    company: string;
    location: string;
    workMode: string;
    experience: string;
    minExperienceYears: number;
    skills: string[];
    joiningWindowDays: number | null;
    description: string;
  };
  candidate: {
    firstName: string;
    headline: string | null;
    currentTitle: string | null;
    experienceYears: number | null;
    skills: string[];
    city: string | null;
    noticeVerified: boolean;
    daysUntilAvailable: number | null;
    coverNote: string | null;
  };
};

type ContextSource = {
  coverNote: string | null;
  job: {
    title: string;
    location: string;
    workMode: string;
    minExperience: number;
    maxExperience: number | null;
    skills: string;
    maxJoiningDays: number | null;
    description: string;
    company: { name: string };
  };
  candidate: {
    headline: string | null;
    currentTitle: string | null;
    experienceYears: number | null;
    skills: string | null;
    city: string | null;
    user: { name: string };
  };
  summary: {
    notice: { verified: boolean; daysToLastWorkingDay: number | null };
  };
};

export function buildResponseContext(source: ContextSource): ResponseContext {
  const { job, candidate, summary } = source;
  const daysToLastDay = summary.notice.daysToLastWorkingDay;
  return {
    job: {
      title: job.title,
      company: job.company.name,
      location: job.location,
      workMode: job.workMode,
      experience:
        job.maxExperience != null ? `${job.minExperience}-${job.maxExperience} years` : `${job.minExperience}+ years`,
      minExperienceYears: job.minExperience,
      skills: splitList(job.skills),
      joiningWindowDays: job.maxJoiningDays,
      description: job.description,
    },
    candidate: {
      firstName: candidate.user.name.split(" ")[0],
      headline: candidate.headline,
      currentTitle: candidate.currentTitle,
      experienceYears: candidate.experienceYears,
      skills: splitList(candidate.skills),
      city: candidate.city,
      noticeVerified: summary.notice.verified,
      // Available from the day after the last working day; never negative.
      daysUntilAvailable: daysToLastDay == null ? null : Math.max(0, daysToLastDay + 1),
      coverNote: source.coverNote,
    },
  };
}
