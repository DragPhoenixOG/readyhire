import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("ADMIN");
  const [pendingVerifications, pendingRecruiters, openReports] = await Promise.all([
    db.candidateProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.recruiterProfile.count({ where: { approvalStatus: "PENDING" } }),
    db.ghostingReport.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <AppShell
      user={user}
      roleLabel="Admin"
      root="/admin"
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/verifications", label: "Verifications", count: pendingVerifications },
        { href: "/admin/recruiters", label: "Recruiters", count: pendingRecruiters },
        { href: "/admin/applications", label: "Applications" },
        { href: "/admin/reports", label: "Ghosting reports", count: openReports },
        { href: "/admin/users", label: "Users" },
      ]}
    >
      {children}
    </AppShell>
  );
}
