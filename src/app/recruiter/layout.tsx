import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Notice, buttonClass } from "@/components/ui";
import { requireRecruiter } from "@/lib/auth";
import { db } from "@/lib/db";
import { overdueWhere } from "@/lib/jobs";

export default async function RecruiterLayout({ children }: LayoutProps<"/recruiter">) {
  const { user, recruiter } = await requireRecruiter();
  const approved = recruiter.approvalStatus === "APPROVED";

  const [awaiting, overdue] = approved
    ? await Promise.all([
        db.application.count({
          where: { status: "APPLIED", job: { recruiterId: recruiter.id } },
        }),
        db.application.count({
          where: { ...overdueWhere(), job: { recruiterId: recruiter.id } },
        }),
      ])
    : [0, 0];

  return (
    <AppShell
      user={user}
      roleLabel={`Recruiter · ${recruiter.company.name}`}
      root="/recruiter"
      nav={
        approved
          ? [
              { href: "/recruiter", label: "Dashboard" },
              {
                href: "/recruiter/applications",
                label: "Applications",
                count: awaiting,
              },
              { href: "/recruiter/jobs", label: "Jobs" },
              { href: "/recruiter/candidates", label: "Verified talent" },
            ]
          : [{ href: "/recruiter", label: "Dashboard" }]
      }
      banner={
        overdue > 0 ? (
          <Notice
            tone="red"
            title={`${overdue} application${overdue === 1 ? " is" : "s are"} overdue for a response`}
            action={
              <Link href="/recruiter/applications?tab=response" className={buttonClass("danger", "sm")}>
                Respond now
              </Link>
            }
          >
            Every application must be accepted or rejected with a reason within 72 hours. Posting new jobs is paused
            until you catch up.
          </Notice>
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
