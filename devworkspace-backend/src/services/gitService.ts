/**
 * Local git operations for the editor's Source Control panel.
 *
 * Runs the system `git` binary (full git behaviour: hooks, .gitignore, large
 * repos). Every workspace and file path goes through pathGuard so nothing can
 * escape WORKSPACE_ROOT.
 *
 * Authentication: when the user has connected GitHub, their token is handed to
 * git for the single command via GIT_CONFIG_* environment variables — it never
 * appears in argv and is never written to .git/config. Without a connection,
 * git falls back to the machine's own credential helper.
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { getSandboxRoot, PathGuardError, resolveInWorkspace } from "../utils/pathGuard.js";

export interface GitAuth {
  token: string;
  login: string;
  email: string;
}

export class GitCommandError extends Error {
  statusCode = 400;
}

export interface GitFileChange {
  path: string;
  /** Previous path for renames. */
  from?: string;
  /** Staged state (X in porcelain), " " when nothing staged. */
  index: string;
  /** Working tree state (Y in porcelain), " " when clean. */
  worktree: string;
}

const MAX_DIFF_BYTES = 512 * 1024;

function authEnv(auth?: GitAuth | null): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  if (!auth) return env;
  const basic = Buffer.from(`x-access-token:${auth.token}`).toString("base64");
  return {
    ...env,
    GIT_CONFIG_COUNT: "2",
    // Empty value resets the helper list so the machine's helper isn't consulted.
    GIT_CONFIG_KEY_0: "credential.helper",
    GIT_CONFIG_VALUE_0: "",
    GIT_CONFIG_KEY_1: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_1: `AUTHORIZATION: basic ${basic}`,
  };
}

function run(
  cwd: string,
  args: string[],
  opts: { auth?: GitAuth | null; okCodes?: number[]; timeout?: number } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        env: authEnv(opts.auth),
        maxBuffer: 32 * 1024 * 1024,
        timeout: opts.timeout ?? 120_000,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        const code = err ? (typeof err.code === "number" ? err.code : -1) : 0;
        if (err && !(opts.okCodes ?? []).includes(code)) {
          const msg = (stderr || err.message).toString().trim();
          return reject(new GitCommandError(scrub(msg, opts.auth) || "git command failed"));
        }
        resolve(stdout.toString());
      }
    );
  });
}

/** Never let a token leak back to the client through an error message. */
function scrub(text: string, auth?: GitAuth | null) {
  return auth ? text.split(auth.token).join("***") : text;
}

/**
 * Validates the workspace and returns the folder git should run in: the
 * repository's top level (porcelain paths are relative to it), as long as
 * that is still inside the sandbox; otherwise the workspace itself.
 */
async function guardWorkspace(workspace: string) {
  const { workspace: real } = await resolveInWorkspace(workspace, workspace);
  const top = (await run(real, ["rev-parse", "--show-toplevel"], { okCodes: [128] }).catch(() => "")).trim();
  if (!top) return real;
  try {
    const { workspace: realTop } = await resolveInWorkspace(top, top);
    return realTop;
  } catch {
    return real;
  }
}

async function guardFiles(workspace: string, files: unknown): Promise<string[]> {
  if (!Array.isArray(files) || files.length === 0 || files.some((f) => typeof f !== "string" || !f)) {
    throw new PathGuardError("paths must be a non-empty array of strings");
  }
  for (const f of files as string[]) {
    await resolveInWorkspace(workspace, path.join(workspace, f));
  }
  return files as string[];
}

function parseBranchHeader(line: string) {
  // Examples: "main...origin/main [ahead 1, behind 2]", "main", "No commits yet on main", "HEAD (no branch)"
  const header = line.replace(/^## /, "");
  let branch = header;
  let upstream: string | null = null;
  let ahead = 0;
  let behind = 0;

  const noCommits = header.match(/^No commits yet on (.+)$/);
  if (noCommits) return { branch: noCommits[1], upstream, ahead, behind, detached: false };
  if (header.startsWith("HEAD (no branch)")) {
    return { branch: "HEAD", upstream, ahead, behind, detached: true };
  }

  const m = header.match(/^(.+?)(?:\.\.\.(\S+))?(?: \[(.+)\])?$/);
  if (m) {
    branch = m[1];
    upstream = m[2] ?? null;
    const track = m[3] ?? "";
    ahead = Number(track.match(/ahead (\d+)/)?.[1] ?? 0);
    behind = Number(track.match(/behind (\d+)/)?.[1] ?? 0);
  }
  return { branch, upstream, ahead, behind, detached: false };
}

export const gitService = {
  async status(workspace: string) {
    const cwd = await guardWorkspace(workspace);
    const inside = await run(cwd, ["rev-parse", "--is-inside-work-tree"], { okCodes: [128] }).catch(() => "");
    if (inside.trim() !== "true") {
      return { isRepo: false as const };
    }

    const out = await run(cwd, ["status", "--porcelain=v1", "-b", "-z", "--untracked-files=all"]);
    const parts = out.split("\0");
    const head = parseBranchHeader(parts[0] ?? "");
    const files: GitFileChange[] = [];

    for (let i = 1; i < parts.length; i++) {
      const entry = parts[i];
      if (!entry) continue;
      const index = entry[0];
      const worktree = entry[1];
      const filePath = entry.slice(3);
      if (index === "R" || index === "C") {
        files.push({ path: filePath, from: parts[++i], index, worktree });
      } else {
        files.push({ path: filePath, index, worktree });
      }
    }

    const remote = (await run(cwd, ["remote", "get-url", "origin"], { okCodes: [2, 128] })).trim() || null;
    const root = (await run(cwd, ["rev-parse", "--show-toplevel"])).trim();

    return { isRepo: true as const, root: path.resolve(root), remote, ...head, files };
  },

  async diff(workspace: string, file: string, staged: boolean) {
    const cwd = await guardWorkspace(workspace);
    const [rel] = await guardFiles(cwd, [file]);

    const tracked = await run(cwd, ["ls-files", "--error-unmatch", "--", rel], { okCodes: [1] });
    if (!tracked.trim() && !staged) {
      // Untracked file: show the whole thing as added.
      const abs = path.join(cwd, rel);
      const stat = await fs.stat(abs);
      if (stat.size > MAX_DIFF_BYTES) return { diff: "", tooLarge: true };
      const lines = (await fs.readFile(abs, "utf8")).split(/\r?\n/);
      const body = lines.map((l) => `+${l}`).join("\n");
      return { diff: `new file: ${rel}\n@@ -0,0 +1,${lines.length} @@\n${body}`, tooLarge: false };
    }

    const args = ["diff", "--no-color", "--no-ext-diff"];
    if (staged) args.push("--cached");
    args.push("--", rel);
    const diff = await run(cwd, args);
    if (diff.length > MAX_DIFF_BYTES) return { diff: "", tooLarge: true };
    return { diff, tooLarge: false };
  },

  async stage(workspace: string, files: unknown) {
    const cwd = await guardWorkspace(workspace);
    const rels = await guardFiles(cwd, files);
    await run(cwd, ["add", "-A", "--", ...rels]);
  },

  async stageAll(workspace: string) {
    const cwd = await guardWorkspace(workspace);
    await run(cwd, ["add", "-A"]);
  },

  async unstage(workspace: string, files: unknown) {
    const cwd = await guardWorkspace(workspace);
    const rels = await guardFiles(cwd, files);
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "HEAD"], { okCodes: [128] })).trim();
    if (hasHead) {
      await run(cwd, ["restore", "--staged", "--", ...rels]);
    } else {
      await run(cwd, ["rm", "--cached", "-r", "-q", "--", ...rels]);
    }
  },

  async commit(workspace: string, message: string, auth?: GitAuth | null) {
    const cwd = await guardWorkspace(workspace);
    if (typeof message !== "string" || !message.trim()) {
      throw new GitCommandError("Commit message is required");
    }
    // Respect the user's own git identity; fall back to their GitHub identity.
    const args: string[] = [];
    const email = (await run(cwd, ["config", "user.email"], { okCodes: [1] })).trim();
    if (!email && auth) {
      args.push("-c", `user.name=${auth.login}`, "-c", `user.email=${auth.email}`);
    }
    args.push("commit", "-m", message.trim());
    return run(cwd, args);
  },

  async push(workspace: string, auth?: GitAuth | null) {
    const cwd = await guardWorkspace(workspace);
    const upstream = await run(cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      okCodes: [128],
    });
    const args = upstream.trim() ? ["push"] : ["push", "-u", "origin", "HEAD"];
    return run(cwd, args, { auth, timeout: 300_000 });
  },

  async pull(workspace: string, auth?: GitAuth | null) {
    const cwd = await guardWorkspace(workspace);
    return run(cwd, ["pull", "--no-rebase", "--no-edit"], { auth, timeout: 300_000 });
  },

  async fetch(workspace: string, auth?: GitAuth | null) {
    const cwd = await guardWorkspace(workspace);
    return run(cwd, ["fetch", "--prune"], { auth, timeout: 300_000 });
  },

  /** Recent commits on the current branch (newest first). */
  async log(workspace: string, limit = 50) {
    const cwd = await guardWorkspace(workspace);
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "HEAD"], { okCodes: [128] })).trim();
    if (!hasHead) return [];

    const n = Math.min(Math.max(Math.floor(limit) || 50, 1), 200);
    const US = "\x1f";
    const RS = "\x1e";
    const out = await run(cwd, [
      "log",
      `-n${n}`,
      "--date=iso-strict",
      `--pretty=format:%H${US}%h${US}%an${US}%ae${US}%ad${US}%s${US}%D${RS}`,
    ]);
    return out
      .split(RS)
      .map((r) => r.replace(/^\s+/, ""))
      .filter(Boolean)
      .map((r) => {
        const [hash, shortHash, author, email, date, subject, refs] = r.split(US);
        return {
          hash,
          shortHash,
          author,
          email,
          date,
          subject,
          refs: refs ? refs.split(", ").map((x) => x.replace(/^HEAD -> /, "")).filter(Boolean) : [],
        };
      });
  },

  /** Full patch of one commit (message header + diff). */
  async show(workspace: string, hash: string) {
    const cwd = await guardWorkspace(workspace);
    if (typeof hash !== "string" || !/^[0-9a-f]{7,40}$/i.test(hash)) {
      throw new GitCommandError("Invalid commit hash");
    }
    const diff = await run(cwd, ["show", "--no-color", "--no-ext-diff", "--format=%B", hash]);
    if (diff.length > MAX_DIFF_BYTES * 4) return { diff: "", tooLarge: true };
    return { diff, tooLarge: false };
  },

  async branches(workspace: string) {
    const cwd = await guardWorkspace(workspace);
    const out = await run(cwd, ["branch", "--all", "--format=%(refname:short)"]);
    const all = out.split("\n").map((b) => b.trim()).filter(Boolean);
    return {
      local: all.filter((b) => !b.startsWith("origin/")),
      remote: all.filter((b) => b.startsWith("origin/") && b !== "origin/HEAD" && b !== "origin"),
    };
  },

  async checkout(workspace: string, branch: string, create: boolean) {
    const cwd = await guardWorkspace(workspace);
    if (typeof branch !== "string" || !/^[\w./-]+$/.test(branch) || branch.startsWith("-")) {
      throw new GitCommandError("Invalid branch name");
    }
    if (create) {
      await run(cwd, ["switch", "-c", branch]);
    } else if (branch.startsWith("origin/")) {
      await run(cwd, ["switch", "--track", branch]);
    } else {
      await run(cwd, ["switch", branch]);
    }
  },

  /** Clone a GitHub repo into WORKSPACE_ROOT/<name>. Returns the new folder. */
  async clone(cloneUrl: string, name: string | undefined, auth?: GitAuth | null) {
    if (typeof cloneUrl !== "string" || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?$/.test(cloneUrl)) {
      throw new GitCommandError("Only https://github.com/<owner>/<repo> URLs can be cloned");
    }
    const folder = (name || cloneUrl.split("/").pop()!.replace(/\.git$/, "")).trim();
    if (!/^[\w.-]+$/.test(folder) || folder === "." || folder === "..") {
      throw new GitCommandError("Invalid folder name");
    }

    const root = await getSandboxRoot();
    const dest = path.join(root, folder);
    const exists = await fs.stat(dest).then(() => true, () => false);
    if (exists) {
      throw new GitCommandError(`A folder named "${folder}" already exists in ${root}`);
    }

    await run(root, ["clone", "--", cloneUrl, dest], { auth, timeout: 600_000 });
    return dest;
  },
};
