// src/api/api.ts
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
  async disconnect() {
    const res = await api.post("/auth/notion/disconnect");
    return res.data;
  },
};
