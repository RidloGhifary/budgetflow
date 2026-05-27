import { getTransactionReport } from "../reports/report.service";
import { createCsv, type CsvColumn } from "../reports/csv.util";
import type { DataExportTransactionFilters } from "./data-export.validators";

const csvContentType = "text/csv; charset=utf-8";

type TransactionExportRow = Awaited<ReturnType<typeof getTransactionReport>>["transactions"][number];

export async function generateTransactionCsvExport(userId: string, filters: DataExportTransactionFilters) {
  const report = await getTransactionReport(userId, filters);
  const fileName = `budgetflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  const csv = createCsv(report.transactions, transactionExportColumns);

  return {
    buffer: Buffer.from(`\uFEFF${csv}`, "utf8"),
    fileName,
    mimeType: csvContentType,
    rowCount: report.transactions.length
  };
}

const transactionExportColumns: Array<CsvColumn<TransactionExportRow>> = [
  { header: "Transaction ID", value: (transaction) => transaction.id },
  { header: "Date", value: (transaction) => dateOnly(transaction.transactionDate) },
  { header: "Type", value: (transaction) => transaction.type },
  { header: "Purpose", value: (transaction) => transaction.purpose },
  { header: "Amount", value: (transaction) => transaction.amount },
  { header: "Wallet ID", value: (transaction) => transaction.walletId },
  { header: "Wallet", value: (transaction) => transaction.wallet.name },
  { header: "Category ID", value: (transaction) => transaction.categoryId },
  { header: "Category", value: (transaction) => transaction.category.name },
  { header: "Recurring Transaction ID", value: (transaction) => transaction.recurringTransactionId },
  { header: "Note", value: (transaction) => transaction.note },
  { header: "Created At", value: (transaction) => isoDateTime(transaction.createdAt) },
  { header: "Updated At", value: (transaction) => isoDateTime(transaction.updatedAt) }
];

function dateOnly(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function isoDateTime(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
