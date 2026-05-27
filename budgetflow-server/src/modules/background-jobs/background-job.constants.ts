export const JOB_TYPES = {
  DATA_EXPORT_CREATE: "data_export.create",
  DATA_IMPORT_PROCESS: "data_import.process"
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];
