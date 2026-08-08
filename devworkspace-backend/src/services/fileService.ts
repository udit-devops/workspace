/**
 * File system operations exposed to the editor.
 *
 * All paths are passed through resolveInWorkspace() before touching the disk,
 * so no entry point here can escape WORKSPACE_ROOT.
 *
 * Caching:
 *   - Tree listings are cached (invalidated on create/delete/write).
 *   - File contents are cached (invalidated on write of the same file).
 *   The cache is deliberately simple and per-process; a Redis layer can replace
 *   it behind the same keys without changing route/controller code.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  PathGuardError,
  resolveInWorkspace,
} from "../utils/pathGuard.js";
import {
  collectGitignores,
  compileIgnoreRules,
  type IgnoreRules,
} from "../utils/ignoreList.js";
import { fileCache, treeCache } from "../utils/cache.js";

export const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
export const MAX_TREE_DEPTH = 10;
export const MAX_ENTRIES_PER_DIR = 5000;
export const MAX_TREE_TOTAL = 50_000;

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  language?: string;
  children?: FileEntry[];
}

export interface ReadResult {
  path: string;
  name: string;
  language: string;
  content: string;
  encoding: "utf8" | "binary";
  size: number;
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "typescript", tsx: "typescript", mts: "typescript", cts: "typescript",
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  json: "json", jsonc: "json", css: "css", scss: "scss", less: "less",
  html: "html", htm: "html", md: "markdown", markdown: "markdown",
  svg: "xml", xml: "xml", py: "python", sql: "sql", yml: "yaml", yaml: "yaml",
  sh: "shell", bash: "shell", zsh: "shell", tsconfig: "json",
  env: "dotenv", ini: "ini", toml: "ini", dockerfile: "dockerfile",
  lock: "plaintext", gitignore: "gitignore", vue: "vue", svelte: "svelte",
};

export function languageFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "dockerfile") return "dockerfile";
  if (lower === ".gitignore") return "gitignore";
  if (lower === ".env" || lower.endsWith(".env")) return "dotenv";
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

function isValidName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 255) return false;
  if (name.includes("\0")) return false;
  if (name === "." || name === "..") return false;
  if (/[<>:"|?*\\]/u.test(name)) return false; // illegal on Windows
  return true;
}

export class FileService {
  async getTree(workspacePath: string): Promise<FileEntry> {
    const cacheKey = `tree:${this.norm(workspacePath)}`;
    const cached = treeCache.get<FileEntry>(cacheKey);
    if (cached) return cached;

    const { target } = await resolveInWorkspace(workspacePath, workspacePath);
    const gitignores = await collectGitignores(target);
    const rules = compileIgnoreRules(undefined, gitignores);
    const root = await this.buildTree(target, rules);

    treeCache.set(cacheKey, root);
    return root;
  }

  /**
   * Immediate subdirectories of a folder — used by the in-browser "Open Folder"
   * dialog. Only directory names/paths are returned (no content), and the path
   * is still validated against WORKSPACE_ROOT + the workspace.
   */
  async listDirs(
    workspacePath: string,
    dirPath: string
  ): Promise<{ name: string; path: string }[]> {
    const { target } = await resolveInWorkspace(workspacePath, dirPath);
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) {
      throw new PathGuardError("Target is not a directory", 400);
    }
    const entries = await fs.readdir(target, { withFileTypes: true });
    const dirs: { name: string; path: string }[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      dirs.push({ name: entry.name, path: path.join(target, entry.name) });
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    return dirs;
  }
  async readFile(workspacePath: string, filePath: string): Promise<ReadResult> {
    const cacheKey = `file:${this.norm(filePath)}`;
    const cached = fileCache.get<ReadResult>(cacheKey);
    if (cached) return cached;

    const { target } = await resolveInWorkspace(workspacePath, filePath);
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      throw new PathGuardError("Target is a directory, not a file", 400);
    }
    if (stat.size > MAX_FILE_SIZE) {
      throw new PathGuardError(
        `File exceeds the ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB limit`,
        413
      );
    }

    const buffer = await fs.readFile(target);
    const binary = this.isBinary(buffer);
    const content = binary
      ? buffer.toString("base64")
      : buffer.toString("utf8");

    const result: ReadResult = {
      path: target,
      name: path.basename(target),
      language: binary ? "plaintext" : languageFromName(path.basename(target)),
      content,
      encoding: binary ? "binary" : "utf8",
      size: stat.size,
    };
    fileCache.set(cacheKey, result);
    return result;
  }

  async writeFile(
    workspacePath: string,
    filePath: string,
    content: string
  ): Promise<ReadResult> {
    const { target } = await resolveInWorkspace(workspacePath, filePath);
    if (content.length > MAX_FILE_SIZE) {
      throw new PathGuardError(
        `Write exceeds the ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB limit`,
        413
      );
    }
    const parent = path.dirname(target);
    await fs.mkdir(parent, { recursive: true });
    await fs.writeFile(target, content, "utf8");

    const result: ReadResult = {
      path: target,
      name: path.basename(target),
      language: languageFromName(path.basename(target)),
      content,
      encoding: "utf8",
      size: Buffer.byteLength(content, "utf8"),
    };
    fileCache.set(`file:${this.norm(target)}`, result);
    this.invalidateTree(target);
    return result;
  }

  async createItem(
    workspacePath: string,
    parentPath: string,
    name: string,
    kind: "file" | "directory"
  ): Promise<FileEntry> {
    if (!isValidName(name)) {
      throw new PathGuardError("Invalid name", 400);
    }
    const { target: parent } = await resolveInWorkspace(workspacePath, parentPath);
    const stat = await fs.stat(parent);
    if (!stat.isDirectory()) {
      throw new PathGuardError("Parent is not a directory", 400);
    }

    const target = path.join(parent, name);
    const existing = await fs.stat(target).catch(() => null);
    if (existing) {
      throw new PathGuardError("An item with this name already exists", 409);
    }

    if (kind === "directory") {
      await fs.mkdir(target);
    } else {
      await fs.writeFile(target, "", "utf8");
    }
    this.invalidateTree(target);
    return {
      id: target,
      name,
      path: target,
      kind,
      language: kind === "file" ? languageFromName(name) : undefined,
    };
  }

  async deleteItem(workspacePath: string, filePath: string): Promise<{ path: string }> {
    const { target, inside } = await resolveInWorkspace(workspacePath, filePath);
    if (!inside) {
      throw new PathGuardError("Cannot delete the workspace root", 400);
    }
    await fs.rm(target, { recursive: true, force: true });
    fileCache.delete(`file:${this.norm(target)}`);
    this.invalidateTree(target);
    return { path: target };
  }

  private async buildTree(
    absoluteRoot: string,
    rules: IgnoreRules
  ): Promise<FileEntry> {
    let total = 0;
    const rootName = path.basename(absoluteRoot) || absoluteRoot;

    const walk = async (dir: string, depth: number): Promise<FileEntry> => {
      const name = path.basename(dir) || dir;
      const relative = this.toPosix(path.relative(absoluteRoot, dir));
      if (depth > 0 && rules.isIgnored(relative, true)) {
        return { id: dir, name, path: dir, kind: "directory" };
      }

      let dirents;
      try {
        dirents = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return { id: dir, name, path: dir, kind: "directory", children: [] };
      }

      const children: FileEntry[] = [];
      for (const dirent of dirents) {
        if (++total > MAX_TREE_TOTAL) break;
        const childPath = path.join(dir, dirent.name);
        const childRelative = this.toPosix(path.relative(absoluteRoot, childPath));

        if (dirent.isDirectory()) {
          if (rules.isIgnored(childRelative, true)) continue;
          if (depth >= MAX_TREE_DEPTH) continue;
          children.push(await walk(childPath, depth + 1));
        } else if (dirent.isFile()) {
          if (rules.isIgnored(childRelative, false)) continue;
          let stat;
          try {
            stat = await fs.stat(childPath);
          } catch {
            continue;
          }
          if (stat.size > MAX_FILE_SIZE) continue;
          children.push({
            id: childPath,
            name: dirent.name,
            path: childPath,
            kind: "file",
            language: languageFromName(dirent.name),
          });
        }
      }
      children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      if (children.length > MAX_ENTRIES_PER_DIR) {
        children.length = MAX_ENTRIES_PER_DIR;
      }
      return { id: dir, name, path: dir, kind: "directory", children };
    };

    const root = await walk(absoluteRoot, 0);
    root.name = rootName;
    return root;
  }

  private isBinary(buffer: Buffer): boolean {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
    for (const byte of sample) {
      if (byte === 0) return true;
    }
    return false;
  }

  private invalidateTree(filePath: string): void {
    // Invalidate tree caches that contain this path. With a single shared tree
    // cache we simply clear it — tree builds are cheap and correctness wins.
    treeCache.clear();
  }

  private norm(p: string): string {
    return path.normalize(p).toLowerCase();
  }

  private toPosix(p: string): string {
    return p.split(path.sep).join("/");
  }
}

export const fileService = new FileService();
