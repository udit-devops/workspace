/**
 * GitHub sign-in (OAuth web flow) and REST API access.
 *
 * Works with either a GitHub App (recommended: per-repo access, expiring
 * tokens with refresh) or a classic OAuth App — both use the same
 * /login/oauth endpoints. Configure via GITHUB_CLIENT_ID,
 * GITHUB_CLIENT_SECRET and GITHUB_REDIRECT_URI.
 */
import crypto from "crypto";
import { githubRepository } from "../repositories/githubRepository.js";
import { decryptToken, encryptToken } from "../utils/tokenCrypto.js";

const GITHUB_API = "https://api.github.com";

const stateStore = new Map<string, string>();

export class GitHubNotConnectedError extends Error {
  statusCode = 400;
  constructor() {
    super("GitHub not connected");
  }
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevWorkspace",
  };
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      ...params,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "Token exchange failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

async function gh<T = any>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: { ...headers(token), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `GitHub API error (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const githubService = {
  isConfigured() {
    return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  },

  createState(userId: string) {
    const state = crypto.randomUUID();
    stateStore.set(state, userId);
    setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);
    return state;
  },

  consumeState(state: string) {
    const userId = stateStore.get(state);
    stateStore.delete(state);
    return userId;
  },

  getOAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: process.env.GITHUB_REDIRECT_URI!,
      // Ignored by GitHub Apps (they use the app's permissions); used by OAuth Apps.
      scope: "repo read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  },

  async connect(userId: string, code: string) {
    const tokens = await requestToken({ code, redirect_uri: process.env.GITHUB_REDIRECT_URI! });
    const profile = await gh(tokens.accessToken, "/user");
    // Prefer GitHub's no-reply address so commits never leak a private email.
    const email = `${profile.id}+${profile.login}@users.noreply.github.com`;

    await githubRepository.upsert(userId, {
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt,
      workspaceId: String(profile.id),
      workspaceName: profile.login,
      botId: email,
    });
    return { login: profile.login as string };
  },

  /** Returns the connected account, or null. Refreshes expiring tokens. */
  async getAccount(userId: string) {
    const row = await githubRepository.findByUserId(userId);
    if (!row) return null;

    let token = decryptToken(row.accessToken);
    const expiring = row.expiresAt && row.expiresAt.getTime() < Date.now() + 60_000;
    if (expiring && row.refreshToken) {
      const fresh = await requestToken({
        grant_type: "refresh_token",
        refresh_token: decryptToken(row.refreshToken),
      });
      await githubRepository.upsert(userId, {
        accessToken: encryptToken(fresh.accessToken),
        refreshToken: fresh.refreshToken ? encryptToken(fresh.refreshToken) : row.refreshToken,
        expiresAt: fresh.expiresAt,
      });
      token = fresh.accessToken;
    }

    return {
      token,
      login: row.workspaceName ?? "",
      email: row.botId ?? "",
    };
  },

  async requireAccount(userId: string) {
    const account = await this.getAccount(userId);
    if (!account) throw new GitHubNotConnectedError();
    return account;
  },

  async listRepos(token: string) {
    const repos = await gh<any[]>(
      token,
      "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
    );
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      description: r.description,
      defaultBranch: r.default_branch,
      language: r.language,
      updatedAt: r.updated_at,
      cloneUrl: r.clone_url,
      htmlUrl: r.html_url,
    }));
  },

  async disconnect(userId: string) {
    return githubRepository.delete(userId);
  },
};
