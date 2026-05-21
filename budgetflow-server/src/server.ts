import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const server = app.listen(env.port, () => {
  logger.info(
    {
      port: env.port,
      nodeEnv: env.nodeEnv
    },
    "BudgetFlow API server started"
  );
});

server.on("error", (error: NodeJS.ErrnoException) => {
  logger.error({ error }, "BudgetFlow API server failed to start");
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down BudgetFlow API server");

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
