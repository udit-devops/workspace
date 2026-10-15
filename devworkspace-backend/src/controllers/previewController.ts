import fs from "node:fs";
import type { Request, Response } from "express";
import { previewService } from "../services/previewService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PathGuardError } from "../utils/pathGuard.js";

// Read per request: module-level env reads can run before dotenv.config().
const clientOrigin = () => process.env.CLIENT_URL || "http://localhost:5173";

export const createSession = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const workspace = req.body?.workspace;
  if (typeof workspace !== "string" || !workspace) throw new PathGuardError("workspace is required");

  const session = await previewService.createSession(req.user.id, workspace);
  res.json({
    token: session.token,
    baseUrl: `${req.protocol}://${req.get("host")}/preview/${session.token}/`,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

export const serveFile = asyncHandler(async (req: Request, res: Response) => {
  const headers = previewService.securityHeaders(clientOrigin());

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.set({ ...headers, Allow: "GET, HEAD" });
    return res.status(405).type("text/plain").send("Method Not Allowed");
  }

  const session = previewService.getSession(String(req.params.token));
  if (!session) {
    res.set(headers);
    return res.status(404).type("text/plain").send("Preview link expired. Press Run again in the editor.");
  }

  // "/preview/<token>" must end in "/" or relative asset URLs resolve wrongly.
  if (req.path === "/" && !req.originalUrl.split("?")[0].endsWith("/")) {
    return res.redirect(301, `${req.baseUrl}/`);
  }

  try {
    const file = await previewService.resolveFile(session, req.path);
    res.set({
      ...headers,
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Last-Modified": file.mtime.toUTCString(),
    });
    if (req.method === "HEAD") return res.status(200).end();

    const stream = fs.createReadStream(file.path);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch (err: any) {
    const status = err instanceof PathGuardError ? err.statusCode : 500;
    res.set(headers);
    res.status(status).type("text/plain").send(status === 404 ? "Not found" : "Unable to serve file");
  }
});
