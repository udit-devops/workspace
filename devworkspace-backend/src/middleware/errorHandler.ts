import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: status < 500 && err.message ? err.message : "Server Error",
  });
};
