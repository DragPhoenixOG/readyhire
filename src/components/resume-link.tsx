import { formatDate } from "@/lib/format";

type ResumeFile = { id: string; fileName: string; uploadedAt: Date };

/** Link to a candidate's resume (opens through /api/resumes, which checks who may see it). */
export function ResumeLink({ resume }: { resume: ResumeFile | null | undefined }) {
  if (!resume) return <span className="text-sm text-slate-500">No resume uploaded</span>;
  return (
    <span className="text-sm">
      <a href={`/api/resumes/${resume.id}`} target="_blank" className="font-medium text-brand-700 hover:underline">
        {resume.fileName}
      </a>{" "}
      <span className="text-slate-500">· updated {formatDate(resume.uploadedAt)}</span>
    </span>
  );
}
