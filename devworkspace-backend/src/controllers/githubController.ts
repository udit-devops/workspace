import type { Request, Response } from "express";
import { githubService } from "../services/githubService.js";
import { gitService } from "../services/gitService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PathGuardError } from "../utils/pathGuard.js";

type AuthedRequest = Request & { user?: any };

function readWorkspace(req: Request): string {
  const value = (req.method === "GET" ? req.query.workspace : req.body?.workspace) as unknown;
  if (typeof value !== "string" || !value) throw new PathGuardError("workspace is required");
  return value;
}

/** Connected GitHub account, or null so git can fall back to the machine's credentials. */
async function optionalAuth(req: AuthedRequest) {
  return githubService.getAccount(req.user.id).catch(() => null);
}

// ---------- Sign-in ----------

export const connect = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!githubService.isConfigured()) {
    return res.status(500).send("GitHub is not configured on the server (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET).");
  }
  const state = githubService.createState(req.user.id);
  res.redirect(githubService.getOAuthUrl(state));
});

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, error, state } = req.query;

  if (error) return res.send(closePopupScript({ success: false, error: "User denied access" }));
  if (!code || !state) return res.send(closePopupScript({ success: false, error: "Missing code or state" }));

  const userId = githubService.consumeState(state as string);
  if (!userId) return res.send(closePopupScript({ success: false, error: "Invalid or expired state" }));

  try {
    const { login } = await githubService.connect(userId, code as string);
    res.send(closePopupScript({ success: true, login }));
  } catch (err: any) {
    res.send(closePopupScript({ success: false, error: err.message }));
  }
});

export const status = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const account = await githubService.getAccount(req.user.id).catch(() => null);
  res.json({
    configured: githubService.isConfigured(),
    connected: Boolean(account),
    login: account?.login ?? null,
  });
});

export const disconnect = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await githubService.disconnect(req.user.id);
  res.json({ message: "Disconnected" });
});

// ---------- GitHub API ----------

export const repos = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const account = await githubService.requireAccount(req.user.id);
  res.json({ repos: await githubService.listRepos(account.token) });
});

export const cloneRepo = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { cloneUrl, name } = req.body ?? {};
  const path = await gitService.clone(cloneUrl, name, await optionalAuth(req));
  res.json({ path: path.replace(/\\/g, "/") });
});

// ---------- Local git ----------

export const gitStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json(await gitService.status(readWorkspace(req)));
});

export const gitDiff = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = req.query.path;
  if (typeof file !== "string") throw new PathGuardError("path is required");
  res.json(await gitService.diff(readWorkspace(req), file, req.query.staged === "true"));
});

export const gitStage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const workspace = readWorkspace(req);
  if (req.body?.all) await gitService.stageAll(workspace);
  else await gitService.stage(workspace, req.body?.paths);
  res.json({ success: true });
});

export const gitUnstage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await gitService.unstage(readWorkspace(req), req.body?.paths);
  res.json({ success: true });
});

export const gitCommit = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const output = await gitService.commit(readWorkspace(req), req.body?.message, await optionalAuth(req));
  res.json({ output });
});

export const gitPush = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const output = await gitService.push(readWorkspace(req), await optionalAuth(req));
  res.json({ output });
});

export const gitPull = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const output = await gitService.pull(readWorkspace(req), await optionalAuth(req));
  res.json({ output });
});

export const gitFetch = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const output = await gitService.fetch(readWorkspace(req), await optionalAuth(req));
  res.json({ output });
});

export const gitBranches = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json(await gitService.branches(readWorkspace(req)));
});

export const gitLog = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ commits: await gitService.log(readWorkspace(req), Number(req.query.limit) || 50) });
});

export const gitShow = asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json(await gitService.show(readWorkspace(req), String(req.query.hash ?? "")));
});

export const gitCheckout = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await gitService.checkout(readWorkspace(req), req.body?.branch, Boolean(req.body?.create));
  res.json({ success: true });
});

function closePopupScript(data: Record<string, unknown>) {
  const payload = JSON.stringify({ provider: "github", ...data }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html><html><body><script>
    window.opener && window.opener.postMessage(${payload}, "${process.env.CLIENT_URL || "http://localhost:5173"}");
    window.close();
  </script></body></html>`;
}
