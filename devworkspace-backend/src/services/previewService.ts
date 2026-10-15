/**
 * Static preview server for the editor's Run button.
 *
 * Security model
 *  - A logged-in user creates a preview session for one workspace and gets an
 *    unguessable token (256-bit). The token is the capability: preview URLs
 *    need no cookie, so the page works inside a sandboxed iframe.
 *  - Every response carries `Content-Security-Policy: sandbox ...` without
 *    `allow-same-origin`, so preview pages run in an opaque origin. Code from a
 *    cloned repo therefore cannot read the app's cookies or call the API as
 *    the user, even though it is served from the backend's host.
 *  - Paths go through pathGuard (no escaping the workspace, symlinks
 *    resolved), and dotfiles/dot-directories (.git, .env, ...) are never served.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PathGuardError, resolveInWorkspace } from "../utils/pathGuard.js";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_SESSIONS = 500;

interface PreviewSession {
  token: string;
  userId: string;
  workspace: string;
  expiresAt: number;
}

const sessions = new Map<string, PreviewSession>();

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
};

function pruneExpired() {
  const now = Date.now();
  for (const [token, s] of sessions) if (s.expiresAt <= now) sessions.delete(token);
}

export const previewService = {
  /** Reuses the user's live session for the same workspace, else creates one. */
  async createSession(userId: string, workspace: string): Promise<PreviewSession> {
    const { workspace: real } = await resolveInWorkspace(workspace, workspace);
    pruneExpired();

    for (const s of sessions.values()) {
      if (s.userId === userId && s.workspace === real) {
        s.expiresAt = Date.now() + SESSION_TTL_MS;
        return s;
      }
    }

    if (sessions.size >= MAX_SESSIONS) {
      // Drop the session closest to expiry rather than growing unbounded.
      const oldest = [...sessions.values()].sort((a, b) => a.expiresAt - b.expiresAt)[0];
      sessions.delete(oldest.token);
    }

    const session: PreviewSession = {
      token: crypto.randomBytes(32).toString("hex"),
      userId,
      workspace: real,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    sessions.set(session.token, session);
    return session;
  },

  getSession(token: string): PreviewSession | null {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const s = sessions.get(token);
    if (!s) return null;
    if (s.expiresAt <= Date.now()) {
      sessions.delete(token);
      return null;
    }
    return s;
  },

  /**
   * Maps a URL path inside a session to a file on disk.
   * Directories resolve to their index.html.
   */
  async resolveFile(session: PreviewSession, urlPath: string) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      throw new PathGuardError("Malformed URL", 400);
    }

    const segments = decoded.split(/[\\/]+/).filter(Boolean);
    if (segments.some((s) => s.startsWith("."))) {
      throw new PathGuardError("Not found", 404);
    }

    let { target } = await resolveInWorkspace(session.workspace, path.join(session.workspace, ...segments));
    let stat = await fs.promises.stat(target).catch(() => null);

    if (stat?.isDirectory()) {
      ({ target } = await resolveInWorkspace(session.workspace, path.join(target, "index.html")));
      stat = await fs.promises.stat(target).catch(() => null);
    }
    if (!stat || !stat.isFile()) throw new PathGuardError("Not found", 404);

    const ext = path.extname(target).toLowerCase();
    return {
      path: target,
      size: stat.size,
      mtime: stat.mtime,
      contentType: MIME[ext] ?? "application/octet-stream",
    };
  },

  /** Headers applied to every preview response. */
  securityHeaders(clientOrigin: string): Record<string, string> {
    return {
      "Content-Security-Policy": [
        "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads",
        `frame-ancestors 'self' ${clientOrigin}`,
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
      "Cross-Origin-Resource-Policy": "cross-origin",
    };
  },
};
