import path from "node:path";
import fs from "node:fs/promises";

export class PathGuardError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PathGuardError";
    this.statusCode = statusCode;
  }
}

export interface GuardedPaths {
 
  target: string;

  workspace: string;
  
  root: string;
  /** Whether target !== workspace. */
  inside: boolean;
}

const MAX_PATH_LENGTH = 4096;

export async function getSandboxRoot(): Promise<string> {
  const configured = process.env.WORKSPACE_ROOT;
  if (!configured) {
    throw new PathGuardError("WORKSPACE_ROOT is not configured", 500);
  }
  const resolved = path.resolve(configured);
  const real = await safeRealpath(resolved);
  if (!real) {
    throw new PathGuardError("WORKSPACE_ROOT does not exist", 500);
  }
  return real;
}

/** Validate + resolve a client-supplied path against the sandbox and workspace. */
export async function resolveInWorkspace(
  workspacePath: string,
  requestedPath: string
): Promise<GuardedPaths> {
  if (typeof workspacePath !== "string" || typeof requestedPath !== "string") {
    throw new PathGuardError("Invalid path");
  }
  if (workspacePath.length === 0 || requestedPath.length === 0) {
    throw new PathGuardError("Path is required");
  }
  if (workspacePath.includes("\0") || requestedPath.includes("\0")) {
    throw new PathGuardError("Invalid path: null bytes are not allowed");
  }
  if (
    workspacePath.length > MAX_PATH_LENGTH ||
    requestedPath.length > MAX_PATH_LENGTH
  ) {
    throw new PathGuardError("Path is too long", 413);
  }

  const root = await getSandboxRoot();

  const workspace = path.resolve(workspacePath);
  const candidate = path.resolve(requestedPath);

  if (!isInside(root, workspace)) {
    throw new PathGuardError("Workspace escapes the allowed sandbox", 403);
  }
  if (!isInside(workspace, candidate)) {
    throw new PathGuardError("Path escapes the allowed workspace", 403);
  }

  // realpath resolves symlinks and 8.3 short names so nothing can escape.
  const realWorkspace = await safeRealpath(workspace);
  if (!realWorkspace) {
    throw new PathGuardError("Workspace directory does not exist", 404);
  }
  if (!isInside(root, realWorkspace)) {
    throw new PathGuardError("Workspace escapes the allowed sandbox", 403);
  }

  const realTarget = await safeRealpath(candidate);
  if (realTarget) {
    if (!isInside(realWorkspace, realTarget)) {
      throw new PathGuardError("Path escapes the allowed workspace", 403);
    }
    if (!isInside(root, realTarget)) {
      throw new PathGuardError("Path escapes the allowed sandbox", 403);
    }
  }

  return {
    target: realTarget ?? candidate,
    workspace: realWorkspace,
    root,
    inside: realTarget
      ? path.relative(realWorkspace, realTarget) !== ""
      : path.relative(realWorkspace, candidate) !== "",
  };
}

/** Realpath that returns null instead of throwing when the entry doesn't exist. */
export async function safeRealpath(p: string): Promise<string | null> {
  try {
    return await fs.realpath(p);
  } catch {
    return null;
  }
}

/** Case-insensitive containment check (safe for both NTFS and POSIX). */
export function isInside(root: string, target: string): boolean {
  const rel = path.relative(normalize(root), normalize(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function normalize(p: string): string {
  return path.resolve(p).toLowerCase();
}
