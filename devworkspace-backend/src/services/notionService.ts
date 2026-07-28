import crypto from "crypto";
import { notionRepository } from "../repositories/notionRepository.js";

const NOTION_API = "https://api.notion.com/v1";

const stateStore = new Map<string, string>();

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

function richText(text: string) {
  return [{ type: "text" as const, text: { content: text } }];
}

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
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify({
        grant_type: "authorization_code", code,
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
      headers: headers(accessToken),
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

  async saveIntegration(userId: string, tokenData: any) {
    return notionRepository.upsert(userId, tokenData);
  },

  async getIntegration(userId: string) {
    return notionRepository.findByUserId(userId);
  },

  async getPageBlocks(accessToken: string, pageId: string) {
    const [blocksRes, pageRes] = await Promise.all([
      fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=50`, { headers: headers(accessToken) }),
      fetch(`${NOTION_API}/pages/${pageId}`, { headers: headers(accessToken) }),
    ]);

    if (!blocksRes.ok) {
      const e = await blocksRes.json();
      throw new Error(e.message || "Failed to fetch page blocks");
    }

    const blocksData = await blocksRes.json();
    const pageData = await pageRes.json();

    const title =
      pageData.properties?.title?.title?.[0]?.plain_text ||
      pageData.properties?.[Object.keys(pageData.properties || {}).find(k =>
        pageData.properties[k]?.type === "title"
      ) || ""]?.title?.[0]?.plain_text ||
      "Untitled";

    return {
      id: pageId,
      title,
      blocks: (blocksData.results || []).map((b: any) => ({
        id: b.id,
        type: b.type,
        text: extractBlockText(b),
      })),
    };
  },

  async updateBlock(accessToken: string, blockId: string, text: string, type: string) {
    const body: any = {};
    body[type] = { rich_text: richText(text) };

    const res = await fetch(`${NOTION_API}/blocks/${blockId}`, {
      method: "PATCH",
      headers: headers(accessToken),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.message || "Failed to update block");
    }

    return res.json();
  },

  async appendBlocks(accessToken: string, pageId: string, blocks: { type: string; text: string }[]) {
    const children = blocks.map(b => {
      const block: any = { object: "block", type: b.type };
      block[b.type] = { rich_text: richText(b.text) };
      return block;
    });

    const res = await fetch(`${NOTION_API}/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: headers(accessToken),
      body: JSON.stringify({ children }),
    });

    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.message || "Failed to append blocks");
    }

    return res.json();
  },

  async deleteBlock(accessToken: string, blockId: string) {
    const res = await fetch(`${NOTION_API}/blocks/${blockId}`, {
      method: "DELETE",
      headers: headers(accessToken),
    });

    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.message || "Failed to delete block");
    }

    return res.json();
  },

  async createPage(accessToken: string, parentPageId: string, title: string) {
    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        parent: { type: "page_id", page_id: parentPageId },
        properties: {
          title: { title: richText(title) },
        },
      }),
    });

    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.message || "Failed to create page");
    }

    const data = await res.json();
    return { id: data.id, title };
  },

  async disconnect(userId: string) {
    return notionRepository.delete(userId);
  },
};

function extractBlockText(block: any): string {
  const richText = block[block.type]?.rich_text;
  if (richText && Array.isArray(richText)) {
    return richText.map((t: any) => t.plain_text || "").join("");
  }
  return "";
}
