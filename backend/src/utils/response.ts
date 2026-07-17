import { Response } from "express";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export function sendSuccess<T>(res: Response, data: T, message = "Success", statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = "Success",
): void {
  const body: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    meta: { page, limit, total },
  };
  res.status(200).json(body);
}

export function sendError(res: Response, message: string, statusCode = 500, code = "INTERNAL_ERROR"): void {
  res.status(statusCode).json({ success: false, message, code });
}
