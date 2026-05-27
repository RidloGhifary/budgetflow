import assert from "node:assert/strict";
import test from "node:test";

import {
  detectTransactionImportMapping,
  normalizeTransactionImportRow,
  normalizeTransactionType,
  parseImportAmount,
  parseImportDate
} from "./transaction-import-normalizer";

const wallet = {
  createdAt: new Date(),
  currentBalance: 0,
  id: "wallet-1",
  initialBalance: 0,
  name: "BCA",
  type: "BANK",
  updatedAt: new Date(),
  userId: "user-1"
} as never;

const categories = [
  {
    color: null,
    createdAt: new Date(),
    icon: null,
    id: "category-expense",
    name: "Food",
    type: "EXPENSE",
    updatedAt: new Date(),
    userId: "user-1"
  },
  {
    color: null,
    createdAt: new Date(),
    icon: null,
    id: "category-income",
    name: "Salary",
    type: "INCOME",
    updatedAt: new Date(),
    userId: "user-1"
  }
] as never;

test("detects common and Indonesian transaction import headers", () => {
  const mapping = detectTransactionImportMapping(["Tanggal", "Jenis", "Nominal", "Rekening", "Kategori", "Catatan"]);

  assert.equal(mapping.date, "Tanggal");
  assert.equal(mapping.type, "Jenis");
  assert.equal(mapping.amount, "Nominal");
  assert.equal(mapping.wallet, "Rekening");
  assert.equal(mapping.category, "Kategori");
  assert.equal(mapping.note, "Catatan");
});

test("normalizes transaction types", () => {
  assert.equal(normalizeTransactionType("pemasukan"), "INCOME");
  assert.equal(normalizeTransactionType("keluar"), "EXPENSE");
  assert.equal(normalizeTransactionType("unknown"), null);
});

test("parses common amount formats", () => {
  assert.equal(parseImportAmount("50000"), 50000);
  assert.equal(parseImportAmount("50,000"), 50000);
  assert.equal(parseImportAmount("50.000"), 50000);
  assert.equal(parseImportAmount("Rp 50.000,25"), 50000.25);
  assert.equal(parseImportAmount("50,000.25"), 50000.25);
});

test("rejects invalid and negative amount formats", () => {
  assert.equal(parseImportAmount("-50000"), null);
  assert.equal(parseImportAmount("abc"), null);
  assert.equal(parseImportAmount("50.00.0"), null);
});

test("parses supported dates and rejects ambiguous dates", () => {
  assert.equal(parseImportDate("2026-05-24")?.slice(0, 10), "2026-05-24");
  assert.equal(parseImportDate("24/05/2026")?.slice(0, 10), "2026-05-24");
  assert.equal(parseImportDate("05/06/2026"), null);
});

test("validates and normalizes a transaction import row", () => {
  const result = normalizeTransactionImportRow({
    categories,
    mapping: {
      amount: "amount",
      category: "category",
      date: "date",
      note: "note",
      type: "type",
      wallet: "wallet"
    },
    rawData: {
      amount: "50.000",
      category: "Food",
      date: "2026-05-24",
      note: "Lunch",
      type: "expense",
      wallet: "bca"
    },
    wallets: [wallet]
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.normalizedData?.amount, 50000);
  assert.equal(result.normalizedData?.walletId, "wallet-1");
  assert.equal(result.normalizedData?.categoryId, "category-expense");
});

