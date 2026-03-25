import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
};
