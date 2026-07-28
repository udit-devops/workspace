import crypto from "crypto";
import { notionRepository } from "../repositories/notionRepository.js";

const NOTION_API = "https://api.notion.com/v1";

const stateStore = new Map<string, string>();

export const notionService = {
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
      client_id: process.env.NOTION_CLIENT_ID!,
      response_type: "code",
      owner: "user",
      redirect_uri: process.env.NOTION_REDIRECT_URI!,
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params}`;
  },

  async exchangeCode(code: string) {
    const basic = Buffer.from(
      `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch(`${NOTION_API}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || "Token exchange failed");

    return {
      accessToken: data.access_token,
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name,
      botId: data.bot_id,
    };
  },

  async searchPages(accessToken: string) {
    const res = await fetch(`${NOTION_API}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 50 }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch pages");

    return (data.results || []).map((p: any) => ({
      id: p.id,
      title:
        p.properties?.title?.title?.[0]?.plain_text ||
        p.title?.[0]?.plain_text ||
        "Untitled",
    }));
  },

  async saveIntegration(userId: string, tokenData: {
    accessToken: string;
    workspaceId?: string | null;
    workspaceName?: string | null;
    botId?: string | null;
  }) {
    return notionRepository.upsert(userId, tokenData);
  },

  async getIntegration(userId: string) {
    return notionRepository.findByUserId(userId);
  },

  async disconnect(userId: string) {
    return notionRepository.delete(userId);
  },
};
