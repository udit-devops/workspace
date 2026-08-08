/**
 * Filesystem adapter — the single abstraction layer for file access.
 *
 * Every component talks to fsAdapter, never to the HTTP API directly.
 * In the browser it proxies to the backend /files routes. In Electron it calls
 * the preload bridge (window.devos) directly, bypassing HTTP entirely.
 * Switching runtimes later = changing this one file.
 *
 * Paths are normalized to forward slashes on the way in/out so tab keys and
 * comparisons are stable across Windows and POSIX.
 */
import { api } from "../../../api/api";
import type { FileEntry } from "../types";

const devos = (window as unknown as { devos?: Record<string, any> }).devos;
export const isElectron = Boolean(devos);

export interface ReadFileResult {
  path: string;
  name: string;
  language: string;
  content: string;
  encoding: "utf8" | "binary";
  size: number;
}

export interface CreateEntryResult {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  language?: string;
}

const toPosix = (p: string): string => p.replace(/\\/g, "/");

function normalizeTree(node: FileEntry): FileEntry {
  return {
    ...node,
    path: toPosix(node.path),
    children: node.children?.map(normalizeTree),
  };
}

export const fsAdapter = {
  isElectron,

  async getRoot(): Promise<string> {
    if (isElectron) return devos!.getRoot();
    const res = await api.get("/files/root");
    return toPosix(res.data.root as string);
  },

  async listDir(dirPath: string): Promise<{ name: string; path: string }[]> {
    if (isElectron) return devos!.listDir(dirPath);
    const res = await api.get("/files/dirs", { params: { workspace: dirPath, path: dirPath } });
    return (res.data.dirs as { name: string; path: string }[]).map((d) => ({
      ...d,
      path: toPosix(d.path),
    }));
  },

  async getTree(
    workspace: string
  ): Promise<{ workspace: string; tree: FileEntry }> {
    if (isElectron) {
      const tree = await devos!.getTree(workspace);
      return { workspace, tree: normalizeTree(tree) };
    }
    const res = await api.get("/files/tree", { params: { workspace } });
    return { workspace: res.data.workspace, tree: normalizeTree(res.data.tree) };
  },

  async readFile(workspace: string, filePath: string): Promise<ReadFileResult> {
    if (isElectron) {
      const file = await devos!.readFile(filePath);
      return { ...file, path: toPosix(file.path) };
    }
    const res = await api.get("/files/read", { params: { workspace, path: filePath } });
    return res.data.file;
  },

  async writeFile(
    workspace: string,
    filePath: string,
    content: string
  ): Promise<ReadFileResult> {
    if (isElectron) {
      return devos!.writeFile(filePath, content);
    }
    const res = await api.put("/files/write", { workspace, path: filePath, content });
    return res.data.file;
  },

  async createItem(
    workspace: string,
    parentPath: string,
    name: string,
    kind: "file" | "directory"
  ): Promise<CreateEntryResult> {
    if (isElectron) {
      return devos!.createItem(parentPath, name, kind);
    }
    const res = await api.post("/files/create", {
      workspace,
      parentPath,
      name,
      type: kind,
    });
    return res.data.entry;
  },

  async deleteItem(workspace: string, filePath: string): Promise<{ path: string }> {
    if (isElectron) {
      return devos!.deleteItem(filePath);
    }
    const res = await api.delete("/files/delete", {
      params: { workspace, path: filePath },
    });
    return res.data.result;
  },
};
