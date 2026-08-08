import type { FileEntry } from "../types";

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  svg: "xml",
  xml: "xml",
  md: "markdown",
  py: "python",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
  sh: "shell",
};

export function languageFromFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_LANGUAGE[extension] ?? "plaintext";
}

export function findEntryByPath(root: FileEntry, targetPath: string): FileEntry | null {
  if (root.path === targetPath) return root;
  if (root.kind === "directory" && root.children) {
    for (const child of root.children) {
      const found = findEntryByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}
