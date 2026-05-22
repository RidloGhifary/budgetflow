import { env } from "../../config/env";
import { isDisposableEmailDomain, normalizeDomain } from "./disposable-email.service";

const configuredBlockedDomains = env.auth.blockedEmailDomains
  .split(",")
  .map((domain) => normalizeDomain(domain))
  .filter(Boolean);

const configuredBlockedDomainSet = new Set(configuredBlockedDomains);

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

  return isDisposableEmailDomain(domain) || isConfiguredBlockedDomain(domain);
}

function isConfiguredBlockedDomain(domain: string) {
  const domainParts = domain.split(".");

  for (let index = 0; index <= domainParts.length - 2; index += 1) {
    const candidate = domainParts.slice(index).join(".");

    if (configuredBlockedDomainSet.has(candidate)) {
      return true;
    }
  }

  return false;
}
