import crypto from "node:crypto";

import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

import { env } from "../../config/env";

const encryptionAlgorithm = "aes-256-gcm";
const encryptedSecretPrefix = "v1";
const issuer = "BudgetFlow";

export function generateTwoFactorSecret() {
  return generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string) {
  return generateURI({
    issuer,
    label: email,
    secret
  });
}

export function verifyTotpCode(secret: string, code: string) {
  const normalizedCode = normalizeOtpCode(code);

  if (!normalizedCode) {
    return false;
  }

  return verifySync({
    epochTolerance: 30,
    secret,
    token: normalizedCode
  }).valid;
}

export function normalizeOtpCode(value: string) {
  const normalized = value.replace(/\s+/g, "");

  return /^\d{6}$/.test(normalized) ? normalized : null;
}

export function generateChallengeToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function verifyTokenHash(value: string, expectedHash: string) {
  const actualHash = hashToken(value);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function encryptTwoFactorSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(encryptionAlgorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [encryptedSecretPrefix, iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptTwoFactorSecret(value: string) {
  const [version, ivValue, authTagValue, encryptedValue] = value.split(":");

  if (version !== encryptedSecretPrefix || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Invalid encrypted 2FA secret");
  }

  const decipher = crypto.createDecipheriv(encryptionAlgorithm, getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export async function toQrCodeDataUrl(otpAuthUrl: string) {
  return QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220
  });
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(env.jwtSecret).digest();
}
