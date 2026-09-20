import crypto from "crypto";
import { notionRepository } from "../repositories/notionRepository.js";
const NOTION_API = "https://api.notion.com/v1";
const stateStore = new Map();
function headers(token) {
    return {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    };
}
function richText(text) {
    return [{ type: "text", text: { content: text } }];
}
export const notionService = {
    createState(userId) {
        const state = crypto.randomUUID();
        stateStore.set(state, userId);
        setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);
        return state;
    },
    consumeState(state) {
        const userId = stateStore.get(state);
        stateStore.delete(state);
        return userId;
    },
    getOAuthUrl(state) {
        const params = new URLSearchParams({
            client_id: process.env.NOTION_CLIENT_ID,
            response_type: "code",
            owner: "user",
            redirect_uri: process.env.NOTION_REDIRECT_URI,
            state,
        });
        return `https://api.notion.com/v1/oauth/authorize?${params}`;
    },
    async exchangeCode(code) {
        const basic = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64");
        const res = await fetch(`${NOTION_API}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
            body: JSON.stringify({
                grant_type: "authorization_code", code,
                redirect_uri: process.env.NOTION_REDIRECT_URI,
            }),
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.error_description || "Token exchange failed");
        return {
            accessToken: data.access_token,
            workspaceId: data.workspace_id,
            workspaceName: data.workspace_name,
            botId: data.bot_id,
        };
    },
    async searchPages(accessToken) {
        const res = await fetch(`${NOTION_API}/search`, {
            method: "POST",
            headers: headers(accessToken),
            body: JSON.stringify({ page_size: 50 }),
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.message || "Failed to fetch pages");
        return (data.results || []).map((p) => ({
            id: p.id,
            title: p.properties?.title?.title?.[0]?.plain_text ||
                p.title?.[0]?.plain_text ||
                "Untitled",
        }));
    },
    async saveIntegration(userId, tokenData) {
        return notionRepository.upsert(userId, tokenData);
    },
    async getIntegration(userId) {
        return notionRepository.findByUserId(userId);
    },
    async getPageBlocks(accessToken, pageId) {
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
        const title = pageData.properties?.title?.title?.[0]?.plain_text ||
            pageData.properties?.[Object.keys(pageData.properties || {}).find(k => pageData.properties[k]?.type === "title") || ""]?.title?.[0]?.plain_text ||
            "Untitled";
        return {
            id: pageId,
            title,
            blocks: (blocksData.results || []).map((b) => ({
                id: b.id,
                type: b.type,
                text: extractBlockText(b),
            })),
        };
    },
    async updateBlock(accessToken, blockId, text, type) {
        const body = {};
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
    async appendBlocks(accessToken, pageId, blocks) {
        const children = blocks.map(b => {
            const block = { object: "block", type: b.type };
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
    async deleteBlock(accessToken, blockId) {
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
    async createPage(accessToken, parentPageId, title) {
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
    async disconnect(userId) {
        return notionRepository.delete(userId);
    },
};
function extractBlockText(block) {
    const richText = block[block.type]?.rich_text;
    if (richText && Array.isArray(richText)) {
        return richText.map((t) => t.plain_text || "").join("");
    }
    return "";
}
