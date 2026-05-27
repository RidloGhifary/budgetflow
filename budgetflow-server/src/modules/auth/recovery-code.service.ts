import crypto from "node:crypto";

import { comparePassword, hashPassword } from "../../utils/password";

export const recoveryCodeCount = 10;

export function generateRecoveryCodes(count = recoveryCodeCount) {
  return Array.from({ length: count }, () => formatRecoveryCode(crypto.randomBytes(9).toString("base64url").toUpperCase()));
}

export async function hashRecoveryCodes(codes: string[]) {
  return Promise.all(codes.map((code) => hashPassword(normalizeRecoveryCode(code))));
}

export function normalizeRecoveryCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export async function compareRecoveryCode(value: string, hash: string) {
  return comparePassword(normalizeRecoveryCode(value), hash);
}

function formatRecoveryCode(value: string) {
  const safeValue = value.replace(/[^A-Z0-9]/g, "").slice(0, 12).padEnd(12, "0");

  return `${safeValue.slice(0, 4)}-${safeValue.slice(4, 8)}-${safeValue.slice(8, 12)}`;
}
