import { z } from "zod";

const maxRangeDays = 366;

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be valid"
});

export const financialHealthQuerySchema = z
  .object({
    compareEndDate: dateSchema.optional(),
    compareStartDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    startDate: dateSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    validateDatePair(value.startDate, value.endDate, "startDate", "endDate", context);
    validateDatePair(value.compareStartDate, value.compareEndDate, "compareStartDate", "compareEndDate", context);
    validateDateRange(value.startDate, value.endDate, "endDate", context);
    validateDateRange(value.compareStartDate, value.compareEndDate, "compareEndDate", context);
  });

export type FinancialHealthQueryInput = z.infer<typeof financialHealthQuerySchema>;

function validateDatePair(
  startDate: Date | undefined,
  endDate: Date | undefined,
  startPath: string,
  endPath: string,
  context: z.RefinementCtx
) {
  if (startDate && !endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [endPath],
      message: `${endPath} is required when ${startPath} is provided`
    });
  }

  if (endDate && !startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [startPath],
      message: `${startPath} is required when ${endPath} is provided`
    });
  }
}

function validateDateRange(
  startDate: Date | undefined,
  endDate: Date | undefined,
  endPath: string,
  context: z.RefinementCtx
) {
  if (!startDate || !endDate) {
    return;
  }

  if (startDate > endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [endPath],
      message: "End date must be after start date"
    });
    return;
  }

  if (getInclusiveDayCount(startDate, endDate) > maxRangeDays) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [endPath],
      message: `Financial health date range cannot be more than ${maxRangeDays} days`
    });
  }
}

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}
