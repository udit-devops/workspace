import {
  LayoutDashboard, Code2, Github, BookOpen,
  Bot, Figma, Terminal, Layers,
} from "lucide-react";
export type ToolId = "dashboard" | "editor" | "github" | "notion" | "ai" | "figma" | "terminal";

interface SidebarProps {
  activePanel: ToolId;
  onSelect: (id: ToolId) => void;
  connectedTools?: ToolId[];
}

const tools = [
  { id: "dashboard" as ToolId, label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "editor"    as ToolId, label: "Editor",    icon: <Code2 size={18} /> },
  { id: "github"    as ToolId, label: "GitHub",    icon: <Github size={18} /> },
  { id: "notion"    as ToolId, label: "Notion",    icon: <BookOpen size={18} /> },
  { id: "figma"     as ToolId, label: "Figma",     icon: <Figma size={18} /> },
  { id: "ai"        as ToolId, label: "AI",        icon: <Bot size={18} /> },
];

export default function Sidebar({ activePanel, onSelect, connectedTools = [] }: SidebarProps) {
  return (
    <aside style={{
      width: 56, flexShrink: 0,
      background: "#111113",
      borderRight: "0.5px solid #3a3a3c",
      display: "flex", flexDirection: "column",
      alignItems: "center", padding: "12px 0",
      gap: 4,
    }}>
      {tools.map((tool) => {
        const isActive = activePanel === tool.id;
        const isConnected = connectedTools.includes(tool.id);

        return (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => onSelect(tool.id)}
            style={{
              position: "relative",
              width: 40, height: 40,
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isActive ? "rgba(91,106,240,0.15)" : "transparent",
              border: "none",
              color: isActive ? "#5b6af0" : "#636366",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = "#2c2c2e";
                (e.currentTarget as HTMLButtonElement).style.color = "#aeaeb2";
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#636366";
              }
            }}
          >
            {/* Active indicator */}
            {isActive && (
              <div style={{
                position: "absolute", left: 0,
                width: 3, height: 20,
                background: "#5b6af0",
                borderRadius: "0 3px 3px 0",
                boxShadow: "0 0 8px rgba(91,106,240,0.6)",
              }} />
            )}
            {tool.icon}
            {/* Connected dot */}
            {isConnected && !isActive && (
              <div style={{
                position: "absolute", bottom: 6, right: 6,
                width: 5, height: 5, borderRadius: "50%",
                background: "#32d74b",
              }} />
            )}
          </button>
        );
      })}

      {/* Bottom tools */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", width: "100%" }}>
        <div style={{ width: 32, height: 0.5, background: "#3a3a3c", margin: "4px 0" }} />
        {[
          { id: "terminal" as ToolId, icon: <Terminal size={18} />, label: "Terminal" },
        ].map(t => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => onSelect(t.id)}
            style={{
              position: "relative",
              width: 40, height: 40, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: activePanel === t.id ? "rgba(91,106,240,0.15)" : "transparent",
              border: "none",
              color: activePanel === t.id ? "#5b6af0" : "#636366",
              cursor: "pointer",
            }}
          >
            {activePanel === t.id && (
              <div style={{ position: "absolute", left: 0, width: 3, height: 20, background: "#5b6af0", borderRadius: "0 3px 3px 0" }} />
            )}
            {t.icon}
          </button>
        ))}
        <button title="Extensions" style={{
          width: 40, height: 40, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", color: "#48484a", cursor: "pointer",
        }}>
          <Layers size={18} />
        </button>
      </div>
    </aside>
  );
}