import type { Response } from "express";

interface ApiResponseOptions<T> {
  statusCode?: number;
  message: string;
  data?: T;
}

export function sendSuccess<T>(res: Response, options: ApiResponseOptions<T>) {
  return res.status(options.statusCode ?? 200).json({
    success: true,
    message: options.message,
    data: options.data ?? null
  });
}

export function sendError(
  res: Response,
  options: {
    statusCode: number;
    message: string;
    code?: string;
    errors?: unknown;
  }
) {
  return res.status(options.statusCode).json({
    success: false,
    message: options.message,
    code: options.code ?? "ERROR",
    errors: options.errors ?? null
  });
}
