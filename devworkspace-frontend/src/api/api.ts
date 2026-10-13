import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

// On 401, refresh the access token once and retry. Concurrent 401s share one refresh call.
let refreshing: Promise<unknown> | null = null;

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (
    error.response?.status !== 401 ||
    !original ||
    original._retried ||
    original.url === "/auth/refresh"
  ) {
    throw error;
  }

  original._retried = true;
  refreshing ??= api.get("/auth/refresh").finally(() => {
    refreshing = null;
  });

  try {
    await refreshing;
  } catch {
    throw error;
  }
  return api(original);
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
