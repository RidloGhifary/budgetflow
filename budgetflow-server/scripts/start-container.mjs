import { existsSync, readdirSync } from "node:fs";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "server";
const waitTimeoutMs = parsePositiveInteger(process.env.DB_WAIT_TIMEOUT_MS, 60000);
const waitIntervalMs = parsePositiveInteger(process.env.DB_WAIT_INTERVAL_MS, 1000);

const modeConfig = {
  "server": {
    finalCommand: ["pnpm", "start"],
    migrate: true
  },
  "server-dev": {
    finalCommand: ["pnpm", "dev"],
    migrate: true
  },
  "worker": {
    finalCommand: ["pnpm", "worker"],
    migrate: false
  }
};

const config = modeConfig[mode];

if (!config) {
  console.error(`[startup] Unknown container start mode "${mode}".`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("[startup] DATABASE_URL is required.");
  process.exit(1);
}

const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);

console.log(`[startup] Mode: ${mode}`);
console.log(`[startup] DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);
console.log(`[startup] Waiting for PostgreSQL at ${databaseUrl.host}:${databaseUrl.port}...`);

await waitForDatabase(databaseUrl.host, databaseUrl.port);
console.log("[startup] PostgreSQL is reachable.");

assertPrismaFiles();
runCommand(["pnpm", "exec", "prisma", "generate", "--schema", "prisma/schema.prisma"], "Prisma client generation");

if (config.migrate) {
  runCommand(["pnpm", "exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"], "Prisma migration deploy");
}

await runLongLivedCommand(config.finalCommand);

function parseDatabaseUrl(value) {
  try {
    const parsed = new URL(value);
    const port = Number(parsed.port || 5432);

    if (!["postgresql:", "postgres:"].includes(parsed.protocol)) {
      throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol");
    }

    if (!parsed.hostname) {
      throw new Error("DATABASE_URL must include a database host");
    }

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error("DATABASE_URL must include a numeric TCP port between 1 and 65535");
    }

    return {
      host: parsed.hostname,
      port
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL";

    console.error(`[startup] DATABASE_URL is not a valid PostgreSQL URL: ${maskDatabaseUrl(value)}`);
    console.error(`[startup] ${message}. Expected format: postgresql://user:password@postgres:5432/budgetflow?schema=public`);
    process.exit(1);
  }
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[startup] Ignoring invalid positive integer value "${value}". Using ${fallback}.`);
    return fallback;
  }

  return parsed;
}

function maskDatabaseUrl(value) {
  try {
    const parsed = new URL(value);

    if (parsed.password) {
      parsed.password = "****";
    }

    return parsed.toString();
  } catch {
    return roughMaskDatabaseUrl(value);
  }
}

function roughMaskDatabaseUrl(value) {
  const protocolSeparatorIndex = value.indexOf("://");
  const credentialsEndIndex = value.lastIndexOf("@");

  if (protocolSeparatorIndex >= 0 && credentialsEndIndex > protocolSeparatorIndex) {
    const protocolPrefix = value.slice(0, protocolSeparatorIndex + 3);
    const credentials = value.slice(protocolSeparatorIndex + 3, credentialsEndIndex);
    const username = credentials.split(":")[0] || "<user>";

    return `${protocolPrefix}${username}:****${value.slice(credentialsEndIndex)}`;
  }

  return "[invalid DATABASE_URL]";
}

async function waitForDatabase(host, port) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt <= waitTimeoutMs) {
    try {
      await connectOnce(host, port);
      return;
    } catch (error) {
      lastError = error;
      console.log(`[startup] PostgreSQL is not ready yet: ${error.message}`);
      await sleep(waitIntervalMs);
    }
  }

  console.error(
    `[startup] Timed out after ${waitTimeoutMs}ms waiting for PostgreSQL at ${host}:${port}. Last error: ${lastError?.message ?? "unknown"}`
  );
  process.exit(1);
}

function connectOnce(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout: 3000 });

    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("connection timed out"));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertPrismaFiles() {
  if (!existsSync("prisma/schema.prisma")) {
    console.error("[startup] Missing prisma/schema.prisma in the container image.");
    process.exit(1);
  }

  if (!existsSync("prisma/migrations")) {
    console.error("[startup] Missing prisma/migrations in the container image.");
    process.exit(1);
  }

  const migrationDirectories = readdirSync("prisma/migrations", { withFileTypes: true }).filter((entry) => entry.isDirectory());

  if (migrationDirectories.length === 0) {
    console.error("[startup] prisma/migrations exists but contains no migration directories.");
    process.exit(1);
  }

  console.log(`[startup] Found Prisma schema and ${migrationDirectories.length} migration directories.`);
}

function runCommand(command, label) {
  console.log(`[startup] Running ${label}: ${command.join(" ")}`);
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit"
  });

  if (result.error) {
    console.error(`[startup] ${label} could not start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[startup] ${label} failed with exit code ${result.status ?? "unknown"}.`);
    process.exit(result.status ?? 1);
  }
}

function runLongLivedCommand(command) {
  console.log(`[startup] Starting process: ${command.join(" ")}`);

  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      stdio: "inherit"
    });

    const forwardSignal = (signal) => {
      if (!child.killed) {
        child.kill(signal);
      }
    };

    process.on("SIGTERM", forwardSignal);
    process.on("SIGINT", forwardSignal);

    child.on("exit", (code, signal) => {
      process.off("SIGTERM", forwardSignal);
      process.off("SIGINT", forwardSignal);

      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exit(code ?? 0);
      resolve();
    });
  });
}
