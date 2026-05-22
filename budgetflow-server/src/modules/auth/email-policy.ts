import { env } from "../../config/env";
import { disposableEmailDomains } from "./disposable-email-domains";

const configuredBlockedDomains = env.auth.blockedEmailDomains
  .split(",")
  .map((domain) => normalizeDomain(domain))
  .filter(Boolean);

const blockedDomains = new Set([...disposableEmailDomains, ...configuredBlockedDomains]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [, domain = ""] = normalizedEmail.split("@");

  return normalizeDomain(domain);
}

export function isBlockedEmailDomain(email: string) {
  const domain = getEmailDomain(email);

  if (!domain) {
    return false;
  }

  if (blockedDomains.has(domain)) {
    return true;
  }

  return Array.from(blockedDomains).some((blockedDomain) => domain.endsWith(`.${blockedDomain}`));
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}
