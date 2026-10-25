import type { Metadata } from "next";
import { updateProfile } from "@/actions/candidate";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageHeader, inputClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { CITIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Profile" };

export default async function CandidateProfilePage() {
  const { user, profile } = await requireCandidate();
  const companyLocked = profile.verificationStatus === "PENDING" || profile.verificationStatus === "VERIFIED";

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
    </>
  );
}
