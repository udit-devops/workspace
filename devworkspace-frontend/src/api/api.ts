import axios from "axios";

export const API_BASE_URL = "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Surface the server's own message (e.g. "File too large") on err.message so
// callers that display err.message show something actionable instead of
// axios' generic "Request failed with status code 413" / "Network Error".
api.interceptors.response.use(undefined, (err) => {
  if (axios.isAxiosError(err)) {
    const serverMessage = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof serverMessage === "string" && serverMessage) {
      err.message = serverMessage;
    } else if (!err.response) {
      err.message = "Cannot reach the DevWorkspace server. Make sure the backend is running.";
    }
  }
  return Promise.reject(err);
});

export const notionApi = {
  async getStatus() {
    const res = await api.get("/auth/notion/status");
    return res.data;
  },
  async getPages() {
    const res = await api.get("/auth/notion/pages");
    return res.data;
  },
  async getPageContent(pageId: string) {
    const res = await api.get(`/auth/notion/pages/${pageId}`);
    return res.data;
  },
  async updateBlock(blockId: string, text: string, type: string) {
    const res = await api.patch(`/auth/notion/blocks/${blockId}`, { text, type });
    return res.data;
  },
  async addBlocks(pageId: string, blocks: { type: string; text: string }[]) {
    const res = await api.post(`/auth/notion/pages/${pageId}/blocks`, { blocks });
    return res.data;
  },
  async deleteBlock(blockId: string) {
    const res = await api.delete(`/auth/notion/blocks/${blockId}`);
    return res.data;
  },
  async createPage(parentPageId: string, title: string) {
    const res = await api.post("/auth/notion/pages", { parentPageId, title });
    return res.data;
  },
  async disconnect() {
    const res = await api.post("/auth/notion/disconnect");
    return res.data;
  },
};

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  updatedAt: string;
  cloneUrl: string;
  htmlUrl: string;
}

export interface GitFileChange {
  path: string;
  from?: string;
  index: string;
  worktree: string;
}

export type GitStatus =
  | { isRepo: false }
  | {
      isRepo: true;
      root: string;
      remote: string | null;
      branch: string;
      upstream: string | null;
      ahead: number;
      behind: number;
      detached: boolean;
      files: GitFileChange[];
    };

export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  refs: string[];
}

export const githubApi = {
  connectUrl: "http://localhost:5000/github/connect",
  async getStatus(): Promise<{ configured: boolean; connected: boolean; login: string | null }> {
    return (await api.get("/github/status")).data;
  },
  async disconnect() {
    return (await api.post("/github/disconnect")).data;
  },
  async getRepos(): Promise<GitHubRepo[]> {
    return (await api.get("/github/repos")).data.repos;
  },
  async clone(cloneUrl: string, name?: string): Promise<string> {
    return (await api.post("/github/clone", { cloneUrl, name })).data.path;
  },
  async status(workspace: string): Promise<GitStatus> {
    return (await api.get("/github/git/status", { params: { workspace } })).data;
  },
  async diff(workspace: string, path: string, staged: boolean): Promise<{ diff: string; tooLarge: boolean }> {
    return (await api.get("/github/git/diff", { params: { workspace, path, staged } })).data;
  },
  async branches(workspace: string): Promise<{ local: string[]; remote: string[] }> {
    return (await api.get("/github/git/branches", { params: { workspace } })).data;
  },
  async stage(workspace: string, paths: string[]) {
    return (await api.post("/github/git/stage", { workspace, paths })).data;
  },
  async stageAll(workspace: string) {
    return (await api.post("/github/git/stage", { workspace, all: true })).data;
  },
  async unstage(workspace: string, paths: string[]) {
    return (await api.post("/github/git/unstage", { workspace, paths })).data;
  },
  async commit(workspace: string, message: string): Promise<string> {
    return (await api.post("/github/git/commit", { workspace, message })).data.output;
  },
  async push(workspace: string): Promise<string> {
    return (await api.post("/github/git/push", { workspace })).data.output;
  },
  async pull(workspace: string): Promise<string> {
    return (await api.post("/github/git/pull", { workspace })).data.output;
  },
  async fetch(workspace: string): Promise<string> {
    return (await api.post("/github/git/fetch", { workspace })).data.output;
  },
  async log(workspace: string, limit = 50): Promise<GitCommitInfo[]> {
    return (await api.get("/github/git/log", { params: { workspace, limit } })).data.commits;
  },
  async show(workspace: string, hash: string): Promise<{ diff: string; tooLarge: boolean }> {
    return (await api.get("/github/git/show", { params: { workspace, hash } })).data;
  },
  async checkout(workspace: string, branch: string, create = false) {
    return (await api.post("/github/git/checkout", { workspace, branch, create })).data;
  },
};

/** Pull the server's error message out of an axios error. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export const previewApi = {
  /** Creates (or reuses) a sandboxed static preview session for a workspace. */
  async createSession(workspace: string): Promise<{ token: string; baseUrl: string; expiresAt: string }> {
    return (await api.post("/preview/sessions", { workspace })).data;
  },
};
