import type { Metadata } from "next";
import Link from "next/link";
import { postJob } from "@/actions/recruiter";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Notice, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { requireApprovedRecruiter } from "@/lib/auth";
import { WORK_MODE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { overdueWhere } from "@/lib/jobs";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const { recruiter } = await requireApprovedRecruiter();
  const overdue = await db.application.count({
    where: { ...overdueWhere(), job: { recruiterId: recruiter.id } },
  });

  return (
    <>
      <PageHeader
        title="Post a job"
        description={`Posting for ${recruiter.company.name}. Only verified candidates can apply.`}
        back={{ href: "/recruiter/jobs", label: "Jobs" }}
      />
      {overdue > 0 ? (
        <Notice
          tone="red"
          title="Posting is paused"
          action={
            <Link href="/recruiter/applications?tab=response" className={buttonClass("danger", "sm")}>
              Respond now
            </Link>
          }
        >
          You have {overdue} application{overdue === 1 ? "" : "s"} waiting longer than 72 hours for a response.
        </Notice>
      ) : (
        <Card className="max-w-3xl">
          <ActionForm action={postJob} submitLabel="Publish job" pendingLabel="Publishing…">
            <Field label="Job title" htmlFor="title">
              <input id="title" name="title" required maxLength={120} className={inputClass} />
            </Field>
            <Field label="Description" htmlFor="description" hint="Responsibilities, team, interview process.">
              <textarea id="description" name="description" rows={8} required className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" htmlFor="location">
                <input id="location" name="location" required placeholder="Hyderabad" className={inputClass} />
              </Field>
              <Field label="Work mode" htmlFor="workMode">
                <select id="workMode" name="workMode" defaultValue="HYBRID" className={inputClass}>
                  {Object.entries(WORK_MODE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Minimum experience (years)" htmlFor="minExperience">
                <input
                  id="minExperience"
                  name="minExperience"
                  type="number"
                  min={0}
                  max={40}
                  required
                  defaultValue={0}
                  className={inputClass}
                />
              </Field>
              <Field label="Maximum experience (years)" htmlFor="maxExperience">
                <input id="maxExperience" name="maxExperience" type="number" min={0} max={50} className={inputClass} />
              </Field>
              <Field label="CTC from (LPA)" htmlFor="ctcMinLpa">
                <input id="ctcMinLpa" name="ctcMinLpa" type="number" step="0.5" min={0} className={inputClass} />
              </Field>
              <Field label="CTC up to (LPA)" htmlFor="ctcMaxLpa">
                <input id="ctcMaxLpa" name="ctcMaxLpa" type="number" step="0.5" min={0} className={inputClass} />
              </Field>
              <Field
                label="Joining window (days)"
                htmlFor="maxJoiningDays"
                hint="How soon you need someone to join. Leave blank if flexible."
              >
                <input
                  id="maxJoiningDays"
                  name="maxJoiningDays"
                  type="number"
                  min={0}
                  max={365}
                  className={inputClass}
                />
              </Field>
              <Field label="Openings" htmlFor="openings">
                <input
                  id="openings"
                  name="openings"
                  type="number"
                  min={1}
                  max={100}
                  required
                  defaultValue={1}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Skills" htmlFor="skills" hint="Comma separated, e.g. Java, Spring Boot, AWS">
              <input id="skills" name="skills" required className={inputClass} />
            </Field>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
