import assert from "node:assert/strict";
import test from "node:test";

import { JobRegistry, type JobHandler } from "./job-registry";

const handler: JobHandler = {
  type: "example.job",
  async handle() {
    return { ok: true };
  }
};

test("registers and resolves job handlers by type", () => {
  const registry = new JobRegistry();

  registry.register(handler);

  assert.equal(registry.get("example.job"), handler);
});

test("rejects duplicate and unknown job handlers", () => {
  const registry = new JobRegistry();

  registry.register(handler);

  assert.throws(() => registry.register(handler), /already registered/);
  assert.throws(() => registry.get("missing.job"), /No job handler registered/);
});
