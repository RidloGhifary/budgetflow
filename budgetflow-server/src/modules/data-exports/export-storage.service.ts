import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { NotFoundError } from "../../utils/app-error";

export async function saveExportFile({
  buffer,
  exportId,
  fileName,
  userId
}: {
  buffer: Buffer;
  exportId: string;
  fileName: string;
  userId: string;
}) {
  const storageKey = path.posix.join(userId, `${exportId}-${fileName}`);
  const filePath = getExportFilePath(storageKey);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  const stat = await fs.stat(filePath);

  return {
    fileSize: stat.size,
    storageKey
  };
}

export async function assertExportFileExists(storageKey: string) {
  const filePath = getExportFilePath(storageKey);

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    throw new NotFoundError("Export file was not found");
  }
}

export function getExportFilePath(storageKey: string) {
  const root = env.exports.storageDir;
  const filePath = path.resolve(root, storageKey);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new NotFoundError("Export file was not found");
  }

  return filePath;
}
