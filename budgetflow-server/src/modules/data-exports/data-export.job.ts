import { BadRequestError } from "../../utils/app-error";
import { JOB_TYPES } from "../background-jobs/background-job.constants";
import type { JobHandler } from "../background-jobs/job-registry";
import { processDataExportJob } from "./data-export.service";

export const dataExportJobHandler: JobHandler = {
  type: JOB_TYPES.DATA_EXPORT_CREATE,
  async handle(job, context) {
    const exportId = getExportIdFromPayload(job.payload);

    return processDataExportJob(exportId, context.updateProgress, {
      isFinalAttempt: job.attempts >= job.maxAttempts
    });
  }
};

function getExportIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("exportId" in payload)) {
    throw new BadRequestError("Export job payload is invalid");
  }

  const exportId = (payload as { exportId?: unknown }).exportId;

  if (typeof exportId !== "string" || exportId.length === 0) {
    throw new BadRequestError("Export job payload is invalid");
  }

  return exportId;
}
