import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { WorkerRunner } from "./modules/background-jobs/worker-runner";
import { JobRegistry } from "./modules/background-jobs/job-registry";
import { dataExportJobHandler } from "./modules/data-exports/data-export.job";
import { dataImportJobHandler } from "./modules/data-imports/data-import.job";

const registry = new JobRegistry();

registry.register(dataExportJobHandler);
registry.register(dataImportJobHandler);

const runner = new WorkerRunner(registry, {
  concurrency: env.jobs.concurrency,
  lockTimeoutMs: env.jobs.lockTimeoutMs,
  pollIntervalMs: env.jobs.pollIntervalMs,
  queueName: "default"
});

runner.start();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down BudgetFlow worker");

  await runner.stop();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "BudgetFlow worker crashed");
  void shutdown("uncaughtException");
});
