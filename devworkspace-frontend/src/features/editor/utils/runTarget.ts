/**
 * Decides what the editor's Run button does for a workspace.
 *
 *   1. The active tab is an .html/.htm file   -> preview that file
 *   2. index.html at the workspace root       -> preview it
 *   3. package.json with a dev/start script   -> run it in the terminal
 *   4. any other .html file (shallowest first) -> preview it
 */
import type { FileEntry } from "../types";

export type RunTarget =
  | { kind: "static"; entry: string }
  | { kind: "node"; packageJsonPath: string }
  | { kind: "none" };

const isHtml = (name: string) => /\.html?$/i.test(name);

/** Path of `filePath` relative to the tree root, with forward slashes. */
export function relativeToRoot(root: FileEntry, filePath: string): string | null {
  const base = root.path.replace(/\/+$/, "") + "/";
  if (!filePath.toLowerCase().startsWith(base.toLowerCase())) return null;
  return filePath.slice(base.length);
}

function shallowestHtml(root: FileEntry): FileEntry | null {
  const queue: FileEntry[] = [root];
  while (queue.length) {
    const node = queue.shift()!;
    for (const child of node.children ?? []) {
      if (child.kind === "file" && isHtml(child.name)) return child;
    }
    for (const child of node.children ?? []) {
      if (child.kind === "directory") queue.push(child);
    }
  }
  return null;
}

export function pickRunTarget(root: FileEntry, activePath: string | null): RunTarget {
  if (activePath && isHtml(activePath)) {
    const rel = relativeToRoot(root, activePath);
    if (rel) return { kind: "static", entry: rel };
  }

  const top = root.children ?? [];
  const index = top.find((c) => c.kind === "file" && /^index\.html?$/i.test(c.name));
  if (index) return { kind: "static", entry: index.name };

  const pkg = top.find((c) => c.kind === "file" && c.name === "package.json");
  if (pkg) return { kind: "node", packageJsonPath: pkg.path };

  const html = shallowestHtml(root);
  if (html) {
    const rel = relativeToRoot(root, html.path);
    if (rel) return { kind: "static", entry: rel };
  }
  return { kind: "none" };
}

/** Picks the script to run from package.json contents ("dev" preferred). */
export function pickNpmScript(packageJson: string): string | null {
  try {
    const scripts = (JSON.parse(packageJson) as { scripts?: Record<string, string> }).scripts ?? {};
    for (const name of ["dev", "start", "serve", "preview"]) {
      if (typeof scripts[name] === "string") return name;
    }
  } catch {
    // Invalid package.json: nothing runnable.
  }
  return null;
}

/** Shell command that installs dependencies on first run, then runs the script. */
export function npmRunCommand(script: string): string {
  const isWindows = /windows/i.test(navigator.userAgent);
  // The backend terminal is PowerShell on Windows (no `&&` in 5.1), bash elsewhere.
  return isWindows
    ? `if (!(Test-Path node_modules)) { npm install }; npm run ${script}`
    : `[ -d node_modules ] || npm install; npm run ${script}`;
}
