import { FREE_EMAIL_DOMAINS } from "@/lib/constants";

/** Returns the bare host for a website the recruiter typed, or null when it isn't a valid URL. */
function websiteHost(website: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Basic company-domain check: no free/disposable mailboxes, a plausible domain,
 * and (when a website is given) an email domain that belongs to that website.
 */
export function checkRecruiterDomain(email: string, website: string | null): string | null {
  const domain = email.split("@")[1] ?? "";
  if (FREE_EMAIL_DOMAINS.has(domain)) {
    return `Personal email providers like ${domain} aren't accepted. Sign up with your official company email.`;
  }
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    return "That email domain doesn't look valid.";
  }
  if (website) {
    const host = websiteHost(website);
    if (!host) return "Enter a valid company website, e.g. northwind.com.";
    const related = domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`);
    if (!related) {
      return `Your email domain (${domain}) must match your company website (${host}).`;
    }
  }
  return null;
}
