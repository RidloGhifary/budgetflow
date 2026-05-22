import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const blocklistFilePath = resolveBlocklistFilePath();

export const disposableEmailDomains = loadDisposableEmailDomains();

export function isDisposableEmailDomain(domain: string) {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return false;
  }

  const domainParts = normalizedDomain.split(".");

  for (let index = 0; index <= domainParts.length - 2; index += 1) {
    const candidate = domainParts.slice(index).join(".");

    if (disposableEmailDomains.has(candidate)) {
      return true;
    }
  }

  return false;
}

export function parseDisposableEmailBlocklist(fileContent: string) {
  return new Set(
    fileContent
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*$/, ""))
      .map((domain) => normalizeDomain(domain))
      .filter(Boolean)
  );
}

export function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

function loadDisposableEmailDomains() {
  return parseDisposableEmailBlocklist(readFileSync(blocklistFilePath, "utf8"));
}

function resolveBlocklistFilePath() {
  const candidates = [
    path.resolve(process.cwd(), "src/modules/auth/data/disposable_email_blocklist.conf"),
    path.resolve(__dirname, "data/disposable_email_blocklist.conf")
  ];

  const filePath = candidates.find((candidate) => existsSync(candidate));

  if (!filePath) {
    throw new Error("Disposable email blocklist file was not found.");
  }

  return filePath;
}
