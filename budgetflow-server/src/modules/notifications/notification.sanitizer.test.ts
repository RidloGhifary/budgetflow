import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeNotificationMetadata } from "./notification.sanitizer";

test("sanitizes sensitive notification metadata fields recursively", () => {
  const sanitized = sanitizeNotificationMetadata({
    amount: 149000,
    authorization: "Bearer secret",
    browser: "Firefox",
    nested: {
      accessToken: "access-token",
      cookie: "session-cookie",
      scheduledForDate: "2026-06-01T00:00:00.000Z"
    },
    password: "plain-text-password"
  });

  assert.deepEqual(sanitized, {
    amount: 149000,
    authorization: "[REDACTED]",
    browser: "Firefox",
    nested: {
      accessToken: "[REDACTED]",
      cookie: "[REDACTED]",
      scheduledForDate: "2026-06-01T00:00:00.000Z"
    },
    password: "[REDACTED]"
  });
});

test("keeps safe notification metadata useful for display", () => {
  const sanitized = sanitizeNotificationMetadata({
    budgetName: "Groceries",
    percentageUsed: 86,
    read: false,
    scheduledForDate: new Date("2026-06-01T00:00:00.000Z")
  });

  assert.deepEqual(sanitized, {
    budgetName: "Groceries",
    percentageUsed: 86,
    read: false,
    scheduledForDate: "2026-06-01T00:00:00.000Z"
  });
});
