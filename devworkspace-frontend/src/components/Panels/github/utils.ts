import { gh } from "./theme";

/* ------------------------------------------------------------ time */

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.round(mo / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

/* ------------------------------------------------------------ languages */

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Python: "#3572A5",
  Java: "#b07219",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#dea584",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Shell: "#89e051",
  PowerShell: "#012456",
  Jupyter: "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
};

export const languageColor = (lang: string | null) => (lang && LANGUAGE_COLORS[lang]) || gh.textFaint;

/* ------------------------------------------------------------ remotes */

/** Parses an origin URL (https or ssh) into its GitHub web URL, if it is one. */
export function parseGitHubRemote(remote: string | null) {
  if (!remote) return null;
  const m =
    remote.match(/^https:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/i) ||
    remote.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i) ||
    remote.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i);
  if (!m) return null;
  const [, owner, repo] = m;
  const webUrl = `https://github.com/${owner}/${repo}`;
  return {
    owner,
    repo,
    webUrl,
    branchUrl: (b: string) => `${webUrl}/tree/${encodeURIComponent(b)}`,
    compareUrl: (b: string) => `${webUrl}/compare/${encodeURIComponent(b)}?expand=1`,
    commitUrl: (hash: string) => `${webUrl}/commit/${hash}`,
  };
}

/* ------------------------------------------------------------ file status */

export interface StatusInfo {
  letter: string;
  label: string;
  color: string;
  soft: string;
}

/** Human-readable description of a porcelain status letter. */
export function statusInfo(code: string): StatusInfo {
  switch (code) {
    case "?":
    case "U":
      return { letter: "U", label: "New file (untracked)", color: gh.green, soft: gh.greenSoft };
    case "A":
      return { letter: "A", label: "Added", color: gh.green, soft: gh.greenSoft };
    case "D":
      return { letter: "D", label: "Deleted", color: gh.red, soft: gh.redSoft };
    case "R":
      return { letter: "R", label: "Renamed", color: gh.accent, soft: gh.accentSoft };
    case "C":
      return { letter: "C", label: "Copied", color: gh.accent, soft: gh.accentSoft };
    default:
      return { letter: "M", label: "Modified", color: gh.amber, soft: gh.amberSoft };
  }
}

export function splitPath(p: string) {
  const i = p.lastIndexOf("/");
  return i === -1 ? { name: p, dir: "" } : { name: p.slice(i + 1), dir: p.slice(0, i) };
}

/* ------------------------------------------------------------ diff parsing */

export interface DiffLine {
  kind: "add" | "del" | "ctx" | "note";
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed";
  oldPath?: string;
  binary: boolean;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

/**
 * Parses unified diff text (git diff / git show, or the panel's synthetic
 * "new file" diff for untracked files) into files → hunks → numbered lines.
 * Text before the first file header (e.g. a commit message) is ignored.
 */
export function parseUnifiedDiff(text: string, fallbackPath = ""): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  const startFile = (path: string) => {
    file = { path, status: "modified", binary: false, additions: 0, deletions: 0, hunks: [] };
    files.push(file);
    hunk = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");

    const git = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (git) {
      startFile(git[2]);
      continue;
    }
    const synthetic = line.match(/^new file: (.+)$/);
    if (synthetic) {
      startFile(synthetic[1]);
      file!.status = "added";
      continue;
    }

    const hh = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (hh) {
      if (!file) startFile(fallbackPath);
      oldNo = Number(hh[1]);
      newNo = Number(hh[2]);
      hunk = { header: line, lines: [] };
      file!.hunks.push(hunk);
      continue;
    }

    if (!file) continue;
    const f = file as DiffFile;

    if (!hunk) {
      if (line.startsWith("new file mode")) f.status = "added";
      else if (line.startsWith("deleted file mode")) f.status = "deleted";
      else if (line.startsWith("rename from ")) {
        f.status = "renamed";
        f.oldPath = line.slice("rename from ".length);
      } else if (line.startsWith("Binary files")) f.binary = true;
      continue;
    }

    const h = hunk as DiffHunk;
    if (line.startsWith("+")) {
      h.lines.push({ kind: "add", text: line.slice(1), oldNo: null, newNo: newNo++ });
      f.additions++;
    } else if (line.startsWith("-")) {
      h.lines.push({ kind: "del", text: line.slice(1), oldNo: oldNo++, newNo: null });
      f.deletions++;
    } else if (line.startsWith("\\")) {
      h.lines.push({ kind: "note", text: line.slice(2), oldNo: null, newNo: null });
    } else if (line === "") {
      // Git writes context lines with a leading space, so a bare "" is only
      // the trailing newline at the end of the output.
      continue;
    } else if (line.startsWith(" ")) {
      h.lines.push({ kind: "ctx", text: line.slice(1), oldNo: oldNo++, newNo: newNo++ });
    } else {
      hunk = null; // next file's metadata
    }
  }
  return files;
}

/* ------------------------------------------------------------ commit messages */

export const COMMIT_TYPES: { type: string; hint: string }[] = [
  { type: "feat", hint: "A new feature" },
  { type: "fix", hint: "A bug fix" },
  { type: "docs", hint: "Documentation only" },
  { type: "style", hint: "Formatting, styling, no logic change" },
  { type: "refactor", hint: "Code change that is not a fix or feature" },
  { type: "chore", hint: "Tooling, config, dependencies" },
];

/** Replaces (or adds) a conventional-commit prefix on the first line. */
export function applyCommitType(message: string, type: string): string {
  const [first = "", ...rest] = message.split("\n");
  const stripped = first.replace(/^(feat|fix|docs|style|refactor|chore|test|perf|build|ci)(\([^)]*\))?!?:\s*/, "");
  return [`${type}: ${stripped}`, ...rest].join("\n");
}
