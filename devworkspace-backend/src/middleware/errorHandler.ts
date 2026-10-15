import type { Request, Response, NextFunction } from "express";

/** Friendly messages for errors raised by express' body parsers. */
const PARSER_MESSAGES: Record<string, string> = {
  "entity.too.large": "Request is too large. Files up to 1 MB can be saved from the editor.",
  "entity.parse.failed": "Malformed JSON in request body.",
  "encoding.unsupported": "Unsupported request encoding.",
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = Number(err?.statusCode || err?.status) || 500;

  if (status >= 500) console.error(err);

  // Client errors carry a message meant for the user; server errors don't
  // leak internals outside development.
  const message =
    PARSER_MESSAGES[err?.type] ||
    (status < 500 || process.env.NODE_ENV !== "production"
      ? err?.message || "Server Error"
      : "Server Error");

  if (res.headersSent) return;
  return res.status(status).json({ success: false, message });
};
