import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
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
