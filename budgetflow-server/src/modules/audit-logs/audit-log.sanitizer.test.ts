import assert from "node:assert/strict";
import test from "node:test";

import { getChangedFields, sanitizeAuditPayload } from "./audit-log.sanitizer";

test("sanitizes sensitive audit payload fields recursively", () => {
  const sanitized = sanitizeAuditPayload({
    amount: 150000,
    nested: {
      accessToken: "super-secret-token",
      refresh_token: "refresh-secret"
    },
    password: "plain-text-password",
    user: "ridlo"
  });

  assert.deepEqual(sanitized, {
    amount: 150000,
    nested: {
      accessToken: "[REDACTED]",
      refresh_token: "[REDACTED]"
    },
    password: "[REDACTED]",
    user: "ridlo"
  });
});

test("detects changed audit snapshot fields", () => {
  const changedFields = getChangedFields(
    {
      amount: 100000,
      categoryId: "food",
      note: "old"
    },
    {
      amount: 150000,
      categoryId: "food",
      note: "new"
    }
  );

  assert.deepEqual(changedFields.sort(), ["amount", "note"]);
});
