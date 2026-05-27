import type { Category, TransactionType, Wallet } from "@prisma/client";

import { REQUIRED_TRANSACTION_IMPORT_FIELDS, type TransactionImportField } from "./data-import.constants";

export interface TransactionImportMapping {
  amount?: string;
  category?: string;
  date?: string;
  externalId?: string;
  note?: string;
  type?: string;
  wallet?: string;
}

export interface NormalizedTransactionImportRow {
  amount: number;
  categoryId: string;
  categoryName: string;
  duplicateKey: string;
  externalId?: string | null;
  note?: string | null;
  transactionDate: string;
  type: TransactionType;
  walletId: string;
  walletName: string;
}

export interface NormalizeRowInput {
  categories: Category[];
  mapping: TransactionImportMapping;
  rawData: Record<string, string>;
  wallets: Wallet[];
}

const aliasesByField: Record<TransactionImportField, string[]> = {
  amount: ["amount", "nominal", "value", "total", "jumlah", "harga"],
  category: ["category", "kategori", "group"],
  date: ["date", "transaction_date", "tanggal", "tgl", "waktu", "created_at"],
  externalId: ["external_id", "external id", "reference", "ref", "id"],
  note: ["description", "note", "catatan", "memo", "title", "name"],
  type: ["type", "transaction_type", "jenis", "income_expense", "debit_credit"],
  wallet: ["account", "wallet", "rekening", "source", "payment_method"]
};

const incomeAliases = new Set(["income", "pemasukan", "credit", "masuk", "deposit", "in"]);
const expenseAliases = new Set(["expense", "pengeluaran", "debit", "keluar", "withdrawal", "out"]);

export function detectTransactionImportMapping(headers: string[]): TransactionImportMapping {
  const normalizedHeaders = headers.map((header) => ({
    header,
    normalized: normalizeHeaderAlias(header)
  }));
  const mapping: TransactionImportMapping = {};
  const usedHeaders = new Set<string>();

  (Object.keys(aliasesByField) as TransactionImportField[]).forEach((field) => {
    const aliases = new Set(aliasesByField[field].map(normalizeHeaderAlias));
    const match = normalizedHeaders.find((header) => aliases.has(header.normalized) && !usedHeaders.has(header.header));

    if (match) {
      mapping[field] = match.header;
      usedHeaders.add(match.header);
    }
  });

  return mapping;
}

export function getMissingRequiredImportFields(mapping: TransactionImportMapping) {
  return REQUIRED_TRANSACTION_IMPORT_FIELDS.filter((field) => !mapping[field]);
}

export function normalizeTransactionImportRow(input: NormalizeRowInput) {
  const errors: string[] = [];
  const dateValue = readMappedValue(input.rawData, input.mapping.date);
  const typeValue = readMappedValue(input.rawData, input.mapping.type);
  const amountValue = readMappedValue(input.rawData, input.mapping.amount);
  const walletValue = readMappedValue(input.rawData, input.mapping.wallet);
  const categoryValue = readMappedValue(input.rawData, input.mapping.category);
  const noteValue = readMappedValue(input.rawData, input.mapping.note);
  const externalIdValue = readMappedValue(input.rawData, input.mapping.externalId);

  const transactionDate = parseImportDate(dateValue);
  const type = normalizeTransactionType(typeValue);
  const amount = parseImportAmount(amountValue);
  const wallet = findWalletByName(input.wallets, walletValue);
  const category = type ? findCategoryByName(input.categories, categoryValue, type) : null;
  const note = normalizeOptionalString(noteValue, 500);
  const externalId = normalizeOptionalString(externalIdValue, 120);

  if (!dateValue) {
    errors.push("Date is required.");
  } else if (!transactionDate) {
    errors.push("Date format is invalid or ambiguous.");
  }

  if (!typeValue) {
    errors.push("Transaction type is required.");
  } else if (!type) {
    errors.push("Transaction type must be income or expense.");
  }

  if (!amountValue) {
    errors.push("Amount is required.");
  } else if (amount === null) {
    errors.push("Amount must be a positive number.");
  }

  if (!walletValue) {
    errors.push("Wallet is required.");
  } else if (!wallet) {
    errors.push(`Wallet "${walletValue}" was not found.`);
  }

  if (!categoryValue) {
    errors.push("Category is required.");
  } else if (type && !category) {
    errors.push(`Category "${categoryValue}" was not found for ${type.toLowerCase()} transactions.`);
  }

  if (noteValue && note === null) {
    errors.push("Note is too long.");
  }

  if (externalIdValue && externalId === null) {
    errors.push("External ID is too long.");
  }

  if (errors.length > 0 || !transactionDate || !type || amount === null || !wallet || !category) {
    return {
      errors,
      normalizedData: null
    };
  }

  const normalizedData: NormalizedTransactionImportRow = {
    amount,
    categoryId: category.id,
    categoryName: category.name,
    duplicateKey: buildTransactionImportDuplicateKey({
      amount,
      categoryId: category.id,
      externalId,
      note,
      transactionDate,
      type,
      walletId: wallet.id
    }),
    externalId,
    note,
    transactionDate,
    type,
    walletId: wallet.id,
    walletName: wallet.name
  };

  return {
    errors: [],
    normalizedData
  };
}

export function parseImportAmount(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const compact = trimmed
    .replace(/rp/gi, "")
    .replace(/[^\d,.-]/g, "");

  if (!compact || compact.includes("-")) {
    return null;
  }

  const normalized = normalizeAmountSeparators(compact);

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

export function parseImportDate(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);

  if (isoDateMatch) {
    return buildUtcDate(Number(isoDateMatch[1]), Number(isoDateMatch[2]), Number(isoDateMatch[3]));
  }

  const localDateMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (localDateMatch) {
    const day = Number(localDateMatch[1]);
    const month = Number(localDateMatch[2]);

    if (day <= 12 && month <= 12) {
      return null;
    }

    return buildUtcDate(Number(localDateMatch[3]), month, day);
  }

  return null;
}

export function normalizeTransactionType(value: string | null | undefined): TransactionType | null {
  const normalized = normalizeHeaderAlias(value ?? "");

  if (incomeAliases.has(normalized)) {
    return "INCOME";
  }

  if (expenseAliases.has(normalized)) {
    return "EXPENSE";
  }

  return null;
}

export function buildTransactionImportDuplicateKey(input: {
  amount: number;
  categoryId: string;
  externalId?: string | null;
  note?: string | null;
  transactionDate: string;
  type: TransactionType;
  walletId: string;
}) {
  if (input.externalId) {
    return `external:${input.externalId.trim().toLowerCase()}`;
  }

  return [
    input.transactionDate.slice(0, 10),
    input.type,
    input.amount.toFixed(2),
    input.walletId,
    input.categoryId,
    (input.note ?? "").trim().toLowerCase()
  ].join("|");
}

function normalizeAmountSeparators(value: string) {
  const separators = [...value].filter((char) => char === "." || char === ",");

  if (separators.length === 0) {
    return /^\d+$/.test(value) ? value : null;
  }

  const hasComma = value.includes(",");
  const hasDot = value.includes(".");

  if (hasComma && hasDot) {
    const decimalSeparator = value.lastIndexOf(",") > value.lastIndexOf(".") ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const decimalParts = value.split(decimalSeparator);

    if (decimalParts.length !== 2 || decimalParts[1].length > 2) {
      return null;
    }

    return `${decimalParts[0].replaceAll(thousandsSeparator, "")}.${decimalParts[1]}`;
  }

  const separator = hasComma ? "," : ".";
  const parts = value.split(separator);

  if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
    return `${parts[0]}.${parts[1]}`;
  }

  if (parts.length >= 2 && parts.slice(1).every((part) => part.length === 3)) {
    return parts.join("");
  }

  return null;
}

function readMappedValue(row: Record<string, string>, header: string | undefined) {
  if (!header) {
    return "";
  }

  return row[header]?.trim() ?? "";
}

function findWalletByName(wallets: Wallet[], value: string) {
  const normalized = normalizeName(value);

  return wallets.find((wallet) => normalizeName(wallet.name) === normalized) ?? null;
}

function findCategoryByName(categories: Category[], value: string, type: TransactionType) {
  const normalized = normalizeName(value);

  return categories.find((category) => category.type === type && normalizeName(category.name) === normalized) ?? null;
}

function normalizeOptionalString(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length <= maxLength ? trimmed : null;
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeHeaderAlias(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[-\s]/g, "_").toLowerCase();
}

function buildUtcDate(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString();
}

