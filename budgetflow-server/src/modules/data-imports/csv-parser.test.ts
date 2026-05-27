import assert from "node:assert/strict";
import test from "node:test";

import { parseCsv } from "./csv-parser";

test("parses valid CSV with quoted commas and preserved row numbers", () => {
  const parsed = parseCsv('date,type,amount,note\n2026-05-24,expense,50000,"Lunch, team"\n\n2026-05-25,income,8000000,Salary');

  assert.deepEqual(parsed.headers, ["date", "type", "amount", "note"]);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].rowNumber, 2);
  assert.equal(parsed.records[0].data.note, "Lunch, team");
  assert.equal(parsed.records[1].rowNumber, 4);
});

test("handles BOM and quoted newlines", () => {
  const parsed = parseCsv('\uFEFFdate,note\n2026-05-24,"line one\nline two"');

  assert.equal(parsed.headers[0], "date");
  assert.equal(parsed.records[0].data.note, "line one\nline two");
});

test("rejects malformed CSV quotes", () => {
  assert.throws(() => parseCsv('date,note\n2026-05-24,"unfinished'), /unclosed quoted value/);
});

