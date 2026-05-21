import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

import { BadRequestError } from "../utils/app-error";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return next(new BadRequestError("Validation failed", fieldErrors));
    }

    req.body = result.data;
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return next(new BadRequestError("Validation failed", fieldErrors));
    }

    req.query = result.data as Request["query"];
    return next();
  };
}
