import { BadRequestError } from "../../utils/app-error";

export interface ParsedCsvRecord {
  data: Record<string, string>;
  rowNumber: number;
  values: string[];
}

export interface ParsedCsv {
  headers: string[];
  records: ParsedCsvRecord[];
}

interface CsvRow {
  rowNumber: number;
  values: string[];
}

export function parseCsv(content: string): ParsedCsv {
  const rows = parseCsvRows(content);
  const nonEmptyRows = rows.filter((row) => !isEmptyCsvRow(row.values));

  if (nonEmptyRows.length === 0) {
    throw new BadRequestError("CSV file is empty");
  }

  const headerRow = nonEmptyRows[0];
  const headers = headerRow.values.map((header) => header.trim());

  if (headers.some((header) => header.length === 0)) {
    throw new BadRequestError("CSV header row cannot contain empty columns");
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  const duplicateHeader = normalizedHeaders.find((header, index) => normalizedHeaders.indexOf(header) !== index);

  if (duplicateHeader) {
    throw new BadRequestError(`CSV header "${duplicateHeader}" is duplicated`);
  }

  const records = nonEmptyRows.slice(1).map((row) => {
    const data: Record<string, string> = {};

    headers.forEach((header, index) => {
      data[header] = row.values[index]?.trim() ?? "";
    });

    return {
      data,
      rowNumber: row.rowNumber,
      values: row.values
    };
  });

  return {
    headers,
    records
  };
}

function parseCsvRows(content: string): CsvRow[] {
  const source = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const rows: CsvRow[] = [];
  let currentValue = "";
  let currentRow: string[] = [];
  let rowNumber = 1;
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentValue += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === '"') {
      if (currentValue.length > 0) {
        throw new BadRequestError(`CSV quote is misplaced near row ${rowNumber}`);
      }
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (char === "\r" || char === "\n") {
      currentRow.push(currentValue);
      rows.push({ rowNumber, values: currentRow });
      currentRow = [];
      currentValue = "";
      rowNumber += 1;

      if (char === "\r" && next === "\n") {
        index += 1;
      }
      continue;
    }

    currentValue += char;
  }

  if (inQuotes) {
    throw new BadRequestError("CSV contains an unclosed quoted value");
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push({ rowNumber, values: currentRow });
  }

  return rows;
}

function isEmptyCsvRow(values: string[]) {
  return values.every((value) => value.trim().length === 0);
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

