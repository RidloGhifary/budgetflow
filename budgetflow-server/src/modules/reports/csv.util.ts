export type CsvValue = string | number | boolean | Date | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

export function createCsv<T>(rows: T[], columns: Array<CsvColumn<T>>) {
  const headerRow = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const bodyRows = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(","));

  return [headerRow, ...bodyRows].join("\n");
}

function escapeCsvValue(value: CsvValue) {
  const serialized = serializeCsvValue(value);

  if (/[",\n\r]/.test(serialized)) {
    return `"${serialized.replace(/"/g, '""')}"`;
  }

  return serialized;
}

function serializeCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
