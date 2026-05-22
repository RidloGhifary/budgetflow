import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceUrl =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";
const outputPath = path.resolve(process.cwd(), "src/modules/auth/data/disposable_email_blocklist.conf");

async function main() {
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to download disposable email blocklist: ${response.status} ${response.statusText}`);
  }

  const fileContent = await response.text();
  const domains = fileContent
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, fileContent, "utf8");

  console.log(`Saved ${domains.length} disposable email domains to ${outputPath}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
