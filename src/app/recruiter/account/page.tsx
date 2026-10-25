import type { Metadata } from "next";
import { AccountSettings } from "@/components/account-settings";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireRole("RECRUITER");
  return <AccountSettings user={user} />;
}
