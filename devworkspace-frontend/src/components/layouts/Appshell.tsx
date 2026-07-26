import { useState } from "react";
import { Code2, Github, Bot, Figma } from "lucide-react";
import TopBar from "./Topbar";
// import Sidebar, { ToolId } from "./Sidebar";
import BottomAIBar from "./BottomAIBar";
import type { ToolId } from "./Sidebar";
import Sidebar from "./Sidebar";
import PlaceholderPanel from "../Panels/PlaceHolderpanel";
import NotionPanel from "../Panels/NotionPanel";
import DashboardHome from "../Dashboard/DashboardHome";
// import DashboardHome from "../dashboard/DashboardHome";
// import NotionPanel from "../panels/NotionPanel";
// import PlaceholderPanel from "../panels/PlaceholderPanel";

interface AppShellProps {
  user?: { name?: string; email?: string } | null;
}

export default function AppShell({ user }: AppShellProps) {
  const [activePanel, setActivePanel] = useState<ToolId>("dashboard");
  const [connectedTools, setConnectedTools] = useState<ToolId[]>([]);

  const handleNotionConnect = () => {
    window.open("http://localhost:5000/auth/notion/connect", "_blank");
    setTimeout(() => {
      setConnectedTools(prev => [...prev, "notion"]);
    }, 3000);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "dashboard":
        return <DashboardHome onOpenTool={setActivePanel} connectedTools={connectedTools} user={user} />;
      case "notion":
        return <NotionPanel isConnected={connectedTools.includes("notion")} onConnect={handleNotionConnect} pages={[]} />;
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