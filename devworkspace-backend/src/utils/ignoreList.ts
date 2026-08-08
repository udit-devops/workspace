/**
 * .gitignore parsing + default ignore rules.
 *
 * Implemented from scratch (no dependency). Supports the core gitignore
 * semantics the tree builder needs:
 *   - "#" comments and blank lines
 *   - trailing "/" = directory-only
 *   - leading "!" = re-include (negation)
 *   - leading "/" = anchored to the ignore-file location
 *   - "/" anywhere else = relative to the ignore-file location
 *   - no "/" = matches the basename at any depth
 *   - "**" segments handled as "match zero-or-more directories"
 */
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORES: string[] = [
  ".git/",
  ".svn/",
  ".hg/",
  "node_modules/",
  "dist/",
  "build/",
  "out/",
  "coverage/",
  ".next/",
  ".nuxt/",
  ".cache/",
  ".parcel-cache/",
  ".turbo/",
  ".idea/",
  ".vscode/",
  ".DS_Store",
  "Thumbs.db",
  "*.log",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

interface GitIgnoreRule {
  negate: boolean;
  dirOnly: boolean;
  anchored: boolean;
  segments: string[];
}

export interface IgnoreRules {
  /** Relative POSIX-style path -> is it ignored (directory pruned from tree). */
  isIgnored: (relativePath: string, isDirectory: boolean) => boolean;
}

function compilePattern(line: string): GitIgnoreRule | null {
  if (!line || line.startsWith("#")) return null;

  let negate = false;
  if (line.startsWith("!")) {
    negate = true;
    line = line.slice(1);
  }
  if (line.startsWith("\\!")) line = line.slice(1);

  let dirOnly = false;
  if (line.endsWith("/")) {
    dirOnly = true;
    line = line.slice(0, -1);
  }

  let anchored = false;
  if (line.startsWith("/")) {
    anchored = true;
    line = line.slice(1);
  }

  if (!line) return null;

  // Escape the "**/" prefix into a marker segment so splitting works.
  let hasGlobstarPrefix = false;
  if (line.startsWith("**/")) {
    hasGlobstarPrefix = true;
    line = line.slice(3);
  }
  const segments = line.split("/").filter(Boolean);
  if (hasGlobstarPrefix) segments.unshift("**");

  if (segments.length === 0) return null;

  return { negate, dirOnly, anchored, segments };
}

function segmentsMatch(pattern: string[], candidate: string[]): boolean {
  // Dynamic-programming globstar matcher. "**" consumes any number of segments.
  const m = pattern.length;
  const n = candidate.length;
  const dp: boolean[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
  dp[0][0] = true;
  for (let i = 1; i <= m; i++) {
    if (pattern[i - 1] === "**") dp[i][0] = dp[i - 1][0];
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const pat = pattern[i - 1];
      if (pat === "**") {
        dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
      } else if (segmentsEqual(pat, candidate[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1];
      }
    }
  }
  return dp[m][n];
}

function segmentsEqual(pattern: string, candidate: string): boolean {
  if (pattern === candidate) return true;
  if (!pattern.includes("*") && !pattern.includes("?")) return false;
  const re = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "__GLOBSTAR__")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]")
        .replace(/__GLOBSTAR__/g, ".*") +
      "$"
  );
  return re.test(candidate);
}

/** Build matcher rules from default ignores + any parsed .gitignore files. */
export function compileIgnoreRules(
  defaultPatterns: string[] = DEFAULT_IGNORES,
  gitignoreContents: string[] = []
): IgnoreRules {
  const rules: GitIgnoreRule[] = [];

  for (const p of defaultPatterns) {
    const rule = compilePattern(p);
    if (rule) rules.push(rule);
  }
  for (const content of gitignoreContents) {
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("!") && line.slice(1).trim().startsWith("#")) continue;
      const rule = compilePattern(line);
      if (rule) rules.push(rule);
    }
  }

  return {
    isIgnored(relativePath, isDirectory) {
      const segments = relativePath.split("/").filter(Boolean);
      let ignored = false;
      for (const rule of rules) {
        if (rule.dirOnly && !isDirectory) continue;
        // Anchored rules match against the full relative path; unanchored
        // rules also match the final basename alone (gitignore "no slash" rule).
        let matches = segmentsMatch(rule.segments, segments);
        if (!matches && !rule.anchored) {
          matches = segmentsMatch(rule.segments, [segments[segments.length - 1] ?? ""]);
        }
        if (matches) ignored = !rule.negate;
      }
      return ignored;
    },
  };
}

/** Read and parse nested .gitignore files under a workspace root (max depth 6). */
export async function collectGitignores(root: string): Promise<string[]> {
  const contents: string[] = [];
  const seen = new Set<string>();
  async function walk(dir: string, depth: number) {
    if (depth > 6 || contents.length > 50) return;
    let dirents;
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of dirents) {
      if (d.isDirectory() && d.name === "node_modules") continue;
    }
    const gitignore = path.join(dir, ".gitignore");
    if (!seen.has(gitignore)) {
      seen.add(gitignore);
      try {
        const stat = await fs.stat(gitignore);
        if (stat.size <= 64 * 1024) {
          contents.push(await fs.readFile(gitignore, "utf8"));
        }
      } catch {
        // no .gitignore here
      }
    }
    if (depth < 6) {
      for (const d of dirents) {
        if (d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules") {
          await walk(path.join(dir, d.name), depth + 1);
        }
      }
    }
  }
  await walk(root, 0);
  return contents;
}
