import type { BackgroundJobRecord } from "./background-job.repository";

export interface JobHandlerContext {
  updateProgress: (progress: number, result?: unknown) => Promise<unknown>;
}

export interface JobHandler {
  handle: (job: BackgroundJobRecord, context: JobHandlerContext) => Promise<unknown>;
  type: string;
}

export class JobRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(handler: JobHandler) {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Job handler already registered for ${handler.type}`);
    }

    this.handlers.set(handler.type, handler);
  }

  get(type: string) {
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new Error(`No job handler registered for ${type}`);
    }

    return handler;
  }
}
