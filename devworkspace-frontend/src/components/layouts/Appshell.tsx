import { useState, useEffect, useCallback } from "react";
import { Code2, Github, Bot, Figma } from "lucide-react";
import TopBar from "./Topbar";

import BottomAIBar from "./BottomAIBar";
import type { ToolId } from "./Sidebar";
import Sidebar from "./Sidebar";
import PlaceholderPanel from "../Panels/PlaceHolderpanel";
import NotionPanel from "../Panels/NotionPanel";
import DashboardHome from "../Dashboard/DashboardHome";
import { notionApi } from "../../api/api";

interface AppShellProps {
  user?: { name?: string; email?: string } | null;
}

export default function AppShell({ user }: AppShellProps) {
  const [activePanel, setActivePanel] = useState<ToolId>("dashboard");
  const [connectedTools, setConnectedTools] = useState<ToolId[]>([]);
  const [notionPages, setNotionPages] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    notionApi.getStatus().then((data) => {
      if (data.connected) {
        setConnectedTools((prev) => (prev.includes("notion") ? prev : [...prev, "notion"]));
      }
    }).catch(() => {});
  }, []);

  const handleNotionConnect = useCallback(() => {
    const popup = window.open(
      "http://localhost:5000/auth/notion/connect",
      "notion-oauth",
      "width=600,height=700"
    );
    if (!popup) return;
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== "http://localhost:5000") return;
      const data = event.data;
      if (data?.success) {
        setConnectedTools((prev) => (prev.includes("notion") ? prev : [...prev, "notion"]));
        notionApi.getPages().then((res) => setNotionPages(res.pages)).catch(() => {});
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const loadPages = useCallback(async () => {
    try {
      const data = await notionApi.getPages();
      setNotionPages(data.pages);
    } catch {
      setConnectedTools((prev) => prev.filter((t) => t !== "notion"));
    }
  }, []);

  const handleNotionDisconnect = useCallback(async () => {
    try {
      await notionApi.disconnect();
      setConnectedTools((prev) => prev.filter((t) => t !== "notion"));
      setNotionPages([]);
    } catch {}
  }, []);

  const renderPanel = () => {
    switch (activePanel) {
      case "dashboard":
        return <DashboardHome onOpenTool={setActivePanel} connectedTools={connectedTools} user={user} />;
      case "notion":
        return (
          <NotionPanel
            isConnected={connectedTools.includes("notion")}
            onConnect={handleNotionConnect}
            onDisconnect={handleNotionDisconnect}
            pages={notionPages}
            onRefresh={loadPages}
          />
        );
      case "editor":
        return <PlaceholderPanel icon={<Code2 size={24} />} title="Code Editor" subtitle="monaco_editor.init()" color="#5b6af0" />;
      case "github":
        return <PlaceholderPanel icon={<Github size={24} />} title="GitHub" subtitle="github_webview.connect()" color="#8b949e" />;
      case "figma":
        return <PlaceholderPanel icon={<Figma size={24} />} title="Figma" subtitle="figma_webview.connect()" color="#a259ff" />;
      case "ai":
        return <PlaceholderPanel icon={<Bot size={24} />} title="AI Assistant" subtitle="ai_context.ready()" color="#3dd68c" />;
      case "terminal":
        return <PlaceholderPanel icon={<Code2 size={24} />} title="Terminal" subtitle="shell.spawn()" color="#5b6af0" />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      height: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#1c1c1e",
      color: "#f5f5f7",
      fontFamily: "Inter, -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      <TopBar user={user} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar activePanel={activePanel} onSelect={setActivePanel} connectedTools={connectedTools} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {renderPanel()}
          <BottomAIBar />
        </main>
      </div>
    </div>
  );
}
