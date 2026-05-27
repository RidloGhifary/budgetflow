import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { NotFoundError } from "../../utils/app-error";

export async function saveImportFile({
  buffer,
  fileName,
  importId,
  userId
}: {
  buffer: Buffer;
  fileName: string;
  importId: string;
  userId: string;
}) {
  const storageKey = path.posix.join(userId, `${importId}-${sanitizeStorageFileName(fileName)}`);
  const filePath = getImportFilePath(storageKey);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  const stat = await fs.stat(filePath);

  return {
    fileSize: stat.size,
    storageKey
  };
}

export async function assertImportFileExists(storageKey: string) {
  const filePath = getImportFilePath(storageKey);

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    throw new NotFoundError("Import file was not found");
  }
}

export function getImportFilePath(storageKey: string) {
  const root = env.imports.storageDir;
  const filePath = path.resolve(root, storageKey);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new NotFoundError("Import file was not found");
  }

  return filePath;
}

export function sanitizeOriginalFileName(fileName: string) {
  return sanitizeStorageFileName(fileName).slice(0, 180) || "budgetflow-import.csv";
}

function sanitizeStorageFileName(fileName: string) {
  return fileName
    .replace(/[/\\]/g, "_")
    .replace(/[\r\n"]/g, "_")
    .replace(/[^\w .@()-]/g, "_")
    .trim();
}

