import assert from "node:assert/strict";
import test from "node:test";

import { getCalendarDateRange, toCalendarDateKey } from "./calendar-date";
import {
  buildRecurringPreviewOccurrences,
  getRecurringOccurrenceKey,
  type CalendarRecurringPreviewRule
} from "./calendar-recurring-preview";

const baseRule: CalendarRecurringPreviewRule = {
  amount: 149000,
  category: {
    id: "category-1",
    name: "Subscriptions",
    type: "EXPENSE"
  },
  categoryId: "category-1",
  endDate: null,
  frequency: "MONTHLY",
  id: "recurring-1",
  interval: 1,
  name: "Streaming",
  nextRunDate: new Date("2026-05-31T00:00:00.000Z"),
  note: null,
  startDate: new Date("2026-01-31T00:00:00.000Z"),
  status: "ACTIVE",
  type: "EXPENSE",
  wallet: {
    currentBalance: 1000000,
    id: "wallet-1",
    name: "Main",
    type: "BANK"
  },
  walletId: "wallet-1"
};

test("normalizes calendar date ranges inclusively", () => {
  const range = getCalendarDateRange(new Date("2026-05-01T14:30:00.000Z"), new Date("2026-05-03T02:00:00.000Z"));

  assert.equal(toCalendarDateKey(range.startDate), "2026-05-01");
  assert.equal(toCalendarDateKey(range.endDate), "2026-05-03");
  assert.equal(toCalendarDateKey(range.endExclusive), "2026-05-04");
  assert.equal(range.totalDays, 3);
});

test("builds active recurring previews inside the range", () => {
  const previews = buildRecurringPreviewOccurrences({
    endDate: new Date("2026-07-31T00:00:00.000Z"),
    rules: [baseRule],
    startDate: new Date("2026-05-01T00:00:00.000Z")
  });

  assert.deepEqual(previews.map((preview) => toCalendarDateKey(preview.scheduledDate)), [
    "2026-05-31",
    "2026-06-30",
    "2026-07-31"
  ]);
});

test("does not preview paused, cancelled, completed, or already-generated occurrences", () => {
  const generatedOccurrenceKeys = new Set([
    getRecurringOccurrenceKey(baseRule.id, new Date("2026-05-31T00:00:00.000Z"))
  ]);
  const previews = buildRecurringPreviewOccurrences({
    endDate: new Date("2026-06-30T00:00:00.000Z"),
    generatedOccurrenceKeys,
    rules: [
      baseRule,
      { ...baseRule, id: "paused", status: "PAUSED" },
      { ...baseRule, id: "cancelled", status: "CANCELLED" },
      { ...baseRule, id: "completed", status: "COMPLETED" }
    ],
    startDate: new Date("2026-05-01T00:00:00.000Z")
  });

  assert.deepEqual(
    previews.map((preview) => `${preview.recurringTransactionId}:${toCalendarDateKey(preview.scheduledDate)}`),
    ["recurring-1:2026-06-30"]
  );
});

test("respects recurring end dates without mutating rules", () => {
  const rule = {
    ...baseRule,
    endDate: new Date("2026-06-15T00:00:00.000Z")
  };
  const previews = buildRecurringPreviewOccurrences({
    endDate: new Date("2026-12-31T00:00:00.000Z"),
    rules: [rule],
    startDate: new Date("2026-05-01T00:00:00.000Z")
  });

  assert.deepEqual(previews.map((preview) => toCalendarDateKey(preview.scheduledDate)), ["2026-05-31"]);
  assert.ok(rule.nextRunDate);
  assert.equal(toCalendarDateKey(rule.nextRunDate), "2026-05-31");
});
