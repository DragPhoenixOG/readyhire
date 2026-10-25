import { changePassword, signOutEverywhere } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Card, DescriptionList, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export function AccountSettings({ user }: { user: CurrentUser }) {
  return (
    <>
      <PageHeader title="Account" description="Sign-in details and security." />
      <div className="grid max-w-4xl items-start gap-6 lg:grid-cols-2">
        <Card title="Your account">
          <DescriptionList
            items={[
              { label: "Name", value: user.name },
              { label: "Email", value: user.email },
              {
                label: "Email confirmed",
                value: formatDateTime(user.emailVerifiedAt),
              },
              {
                label: "Role",
                value: user.role.charAt(0) + user.role.slice(1).toLowerCase(),
              },
            ]}
          />
        </Card>
        <Card title="Change password" description="You'll stay signed in here and be signed out everywhere else.">
          <ActionForm action={changePassword} submitLabel="Change password" resetOnSuccess>
            <Field label="Current password" htmlFor="current">
              <input
                id="current"
                name="current"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </Field>
            <Field label="New password" htmlFor="password" hint="At least 8 characters.">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Repeat new password" htmlFor="confirm">
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={inputClass}
              />
            </Field>
          </ActionForm>
        </Card>
        <Card
          title="Sessions"
          description="Lost a device or signed in somewhere public? End every session, including this one."
        >
          <form action={signOutEverywhere}>
            <button type="submit" className={buttonClass("secondary")}>
              Sign out everywhere
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
