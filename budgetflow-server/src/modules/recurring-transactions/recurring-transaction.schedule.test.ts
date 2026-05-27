import assert from "node:assert/strict";
import test from "node:test";

import { getNextRunDate, getNextRunDateAfter } from "./recurring-transaction.schedule";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const isoDate = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;

test("calculates daily next date with interval", () => {
  const next = getNextRunDate(
    {
      frequency: "DAILY",
      interval: 2,
      startDate: date("2026-06-01")
    },
    date("2026-06-04")
  );

  assert.equal(isoDate(next), "2026-06-05");
});

test("calculates weekly next date on the same weekday", () => {
  const next = getNextRunDate(
    {
      frequency: "WEEKLY",
      interval: 1,
      startDate: date("2026-06-01")
    },
    date("2026-06-10")
  );

  assert.equal(isoDate(next), "2026-06-15");
});

test("calculates monthly next date with month-end clamping", () => {
  const next = getNextRunDateAfter(
    {
      frequency: "MONTHLY",
      interval: 1,
      startDate: date("2026-01-31")
    },
    date("2026-01-31")
  );

  assert.equal(isoDate(next), "2026-02-28");
});

test("keeps monthly schedule anchored to the original day after February", () => {
  const next = getNextRunDate(
    {
      frequency: "MONTHLY",
      interval: 1,
      startDate: date("2026-01-31")
    },
    date("2026-03-01")
  );

  assert.equal(isoDate(next), "2026-03-31");
});

test("calculates yearly next date with leap-year clamping", () => {
  const next = getNextRunDateAfter(
    {
      frequency: "YEARLY",
      interval: 1,
      startDate: date("2024-02-29")
    },
    date("2024-02-29")
  );

  assert.equal(isoDate(next), "2025-02-28");
});

test("returns null when the next run would pass the end date", () => {
  const next = getNextRunDateAfter(
    {
      endDate: date("2026-06-30"),
      frequency: "MONTHLY",
      interval: 1,
      startDate: date("2026-06-01")
    },
    date("2026-06-01")
  );

  assert.equal(next, null);
});
