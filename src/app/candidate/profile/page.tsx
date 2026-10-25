import type { Metadata } from "next";
import { updateProfile } from "@/actions/candidate";
import { removeResume } from "@/actions/documents";
import { ActionForm } from "@/components/action-form";
import { DocumentUploader } from "@/components/document-uploader";
import { ResumeLink } from "@/components/resume-link";
import { Card, Field, PageHeader, inputClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { CITIES } from "@/lib/constants";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Profile" };

export default async function CandidateProfilePage() {
  const { user, profile } = await requireCandidate();
  const companyLocked = profile.verificationStatus === "PENDING" || profile.verificationStatus === "VERIFIED";
  const resume = await db.resume.findUnique({ where: { candidateId: profile.id } });

  return (
    <>
      <PageHeader title="Profile" description="What recruiters see alongside your verified notice summary." />
      <Card className="max-w-3xl">
        <ActionForm action={updateProfile} submitLabel="Save profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input value={user.name} disabled className={inputClass} />
            </Field>
            <Field label="Email">
              <input value={user.email} disabled className={inputClass} />
            </Field>
            <Field label="Headline" htmlFor="headline" className="sm:col-span-2">
              <input
                id="headline"
                name="headline"
                defaultValue={profile.headline ?? ""}
                placeholder="Backend engineer · Java, Spring, AWS"
                className={inputClass}
              />
            </Field>
            <Field
              label="Current company"
              htmlFor="currentCompany"
              hint={
                companyLocked ? "Locked while verification is pending or complete." : "Must match your offer letter."
              }
            >
              <input
                id="currentCompany"
                name="currentCompany"
                defaultValue={profile.currentCompany ?? ""}
                readOnly={companyLocked}
                className={inputClass}
              />
            </Field>
            <Field label="Current title" htmlFor="currentTitle">
              <input
                id="currentTitle"
                name="currentTitle"
                defaultValue={profile.currentTitle ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Total experience (years)" htmlFor="experienceYears">
              <input
                id="experienceYears"
                name="experienceYears"
                type="number"
                step="0.5"
                min={0}
                max={50}
                defaultValue={profile.experienceYears ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="City" htmlFor="city">
              <select id="city" name="city" defaultValue={profile.city ?? ""} required className={inputClass}>
                <option value="" disabled>
                  Select a city
                </option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Skills" htmlFor="skills" hint="Comma separated." className="sm:col-span-2">
              <input id="skills" name="skills" defaultValue={profile.skills ?? ""} className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </Card>
      <Card
        title="Resume"
        description="Optional, PDF up to 5 MB. Recruiters can open it once you apply to one of their jobs, including any contact details in it. It isn't shown in the talent pool."
        className="mt-6 max-w-3xl"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,20rem)]">
          <div className="min-w-0 space-y-3">
            <ResumeLink resume={resume} />
            {resume && (
              <ActionForm
                action={removeResume}
                submitLabel="Remove resume"
                variant="ghost"
                size="sm"
                confirm="Remove your resume? Recruiters you've applied to will no longer be able to open it."
              />
            )}
          </div>
          <DocumentUploader
            target={{ kind: "resume" }}
            label="Resume file"
            submitLabel={resume ? "Replace resume" : "Upload resume"}
            variant={resume ? "secondary" : "primary"}
          />
        </div>
      </Card>
    </>
  );
}
