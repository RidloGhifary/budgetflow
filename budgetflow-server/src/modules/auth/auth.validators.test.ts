import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { changePasswordSchema, deleteAccountSchema } from "./auth.validators";
import { compareRecoveryCode, generateRecoveryCodes, hashRecoveryCodes, normalizeRecoveryCode } from "./recovery-code.service";

describe("account trust validators", () => {
  it("requires current password and matching new password confirmation", () => {
    assert.equal(
      changePasswordSchema.safeParse({
        confirmNewPassword: "new-password-123",
        currentPassword: "",
        newPassword: "new-password-123"
      }).success,
      false
    );

    assert.equal(
      changePasswordSchema.safeParse({
        confirmNewPassword: "different-password",
        currentPassword: "current-password",
        newPassword: "new-password-123"
      }).success,
      false
    );

    assert.equal(
      changePasswordSchema.safeParse({
        confirmNewPassword: "new-password-123",
        currentPassword: "current-password",
        newPassword: "new-password-123"
      }).success,
      true
    );
  });

  it("requires the strong account deletion confirmation text", () => {
    assert.equal(
      deleteAccountSchema.safeParse({
        confirmation: "delete",
        password: "current-password"
      }).success,
      false
    );

    assert.equal(
      deleteAccountSchema.safeParse({
        code: "123456",
        confirmation: "DELETE",
        password: "current-password"
      }).success,
      true
    );
  });
});

describe("recovery codes", () => {
  it("generates normalized recovery codes and stores them as hashes", async () => {
    const [code] = generateRecoveryCodes(1);

    assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.equal(normalizeRecoveryCode(` ${code.toLowerCase()} `), normalizeRecoveryCode(code));

    const [hash] = await hashRecoveryCodes([code]);

    assert.notEqual(hash, normalizeRecoveryCode(code));
    assert.equal(await compareRecoveryCode(code, hash), true);
    assert.equal(await compareRecoveryCode("WRONG-CODE-0000", hash), false);
  });
});
