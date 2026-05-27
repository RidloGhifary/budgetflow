export const DATA_IMPORT_TYPES = {
  TRANSACTIONS: "TRANSACTIONS"
} as const;

export const DATA_IMPORT_FORMATS = {
  CSV: "CSV",
  XLSX: "XLSX"
} as const;

export const DATA_IMPORT_MIME_TYPES = {
  CSV: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
  XLSX: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
} as const;

export const REQUIRED_TRANSACTION_IMPORT_FIELDS = ["date", "type", "amount", "wallet", "category"] as const;

export type TransactionImportField =
  | (typeof REQUIRED_TRANSACTION_IMPORT_FIELDS)[number]
  | "note"
  | "externalId";

