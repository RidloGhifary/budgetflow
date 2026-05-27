import { BadRequestError } from "../../utils/app-error";
import { JOB_TYPES } from "../background-jobs/background-job.constants";
import type { JobHandler } from "../background-jobs/job-registry";
import { processDataImportJob } from "./data-import.service";

export const dataImportJobHandler: JobHandler = {
  type: JOB_TYPES.DATA_IMPORT_PROCESS,
  async handle(job, context) {
    const payload = getImportPayload(job.payload);

    return processDataImportJob(payload.importId, payload.includeDuplicates, context.updateProgress, {
      isFinalAttempt: job.attempts >= job.maxAttempts
    });
  }
};

function getImportPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new BadRequestError("Import job payload is invalid");
  }

  const importId = (payload as { importId?: unknown }).importId;
  const includeDuplicates = (payload as { includeDuplicates?: unknown }).includeDuplicates;

  if (typeof importId !== "string" || importId.length === 0 || typeof includeDuplicates !== "boolean") {
    throw new BadRequestError("Import job payload is invalid");
  }

  return {
    importId,
    includeDuplicates
  };
}

