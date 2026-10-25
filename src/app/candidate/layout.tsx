import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Notice, buttonClass } from "@/components/ui";
import { requireCandidate } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CandidateLayout({ children }: LayoutProps<"/candidate">) {
  const { user, profile } = await requireCandidate();
  const unconfirmedInterviews = await db.interview.count({
    where: {
      status: "SCHEDULED",
      candidateConfirmed: false,
      scheduledAt: { gte: new Date() },
      application: { candidateId: profile.id },
    },
  });

  const banner =
    profile.verificationStatus === "VERIFIED" ? null : (
      <Notice
        tone={
          profile.verificationStatus === "REJECTED"
            ? "red"
            : profile.verificationStatus === "PENDING"
              ? "blue"
              : "amber"
        }
        title={
          profile.verificationStatus === "PENDING"
            ? "Verification in progress"
            : profile.verificationStatus === "REJECTED"
              ? "Verification needs changes"
              : "Your profile isn't visible to recruiters yet"
        }
        action={
          <Link href="/candidate/verification" className={buttonClass("secondary", "sm")}>
            {profile.verificationStatus === "PENDING" ? "View status" : "Complete verification"}
          </Link>
        }
      >
        {profile.verificationStatus === "PENDING"
          ? "The Readyhire team is reviewing your documents. You can apply to jobs once you're verified."
          : profile.verificationStatus === "REJECTED"
            ? (profile.rejectionReason ?? "Update your documents and submit again.")
            : "Upload your offer letter, notice policy and resignation evidence to get verified and start applying."}
      </Notice>
    );

  return (
    <AppShell
      user={user}
      roleLabel="Candidate"
      root="/candidate"
      banner={banner}
      nav={[
        { href: "/candidate", label: "Dashboard" },
        { href: "/candidate/verification", label: "Verification" },
        { href: "/candidate/jobs", label: "Jobs" },
        {
          href: "/candidate/applications",
          label: "Applications",
          count: unconfirmedInterviews,
        },
        { href: "/candidate/offers", label: "My offers" },
        { href: "/candidate/profile", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
