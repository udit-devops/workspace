import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Settings, Bell, BookOpen, Github, Code2, Bot, Figma, Terminal, Download } from "lucide-react";
import type { ToolId } from "./Sidebar";

interface TopBarProps {
  user?: { name?: string; email?: string } | null;
  onOpenTool?: (id: ToolId) => void;
}

interface SearchItem {
  id: string;
  label: string;
  description: string;
  type: "tool" | "bundle" | "action";
  icon: React.ReactNode;
  action: () => void;
}

const allTools: { id: ToolId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: <Search size={14} />, desc: "Overview and quick start" },
  { id: "notion", label: "Notion", icon: <BookOpen size={14} />, desc: "Docs, wikis, project planning" },
  { id: "github", label: "GitHub", icon: <Github size={14} />, desc: "Repos, PRs, issues" },
  { id: "editor", label: "Editor", icon: <Code2 size={14} />, desc: "Monaco-powered code editor" },
  { id: "ai", label: "AI Assistant", icon: <Bot size={14} />, desc: "Claude with full workspace context" },
  { id: "figma", label: "Figma", icon: <Figma size={14} />, desc: "Design without switching apps" },
  { id: "terminal", label: "Terminal", icon: <Terminal size={14} />, desc: "Shell access" },
];

const bundles = [
  { name: "react-starter", desc: "React 18 + Vite + Tailwind + Router", tags: ["React 18", "Vite", "Tailwind"] },
  { name: "nextjs-starter", desc: "Next.js 14 App Router + Tailwind + Prisma", tags: ["Next.js 14", "Prisma"] },
];

export default function TopBar({ user, onOpenTool }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const items: SearchItem[] = [
    ...allTools.map(t => ({
      id: `tool-${t.id}`,
      label: t.label,
      description: t.desc,
      type: "tool" as const,
      icon: t.icon,
      action: () => { onOpenTool?.(t.id); setOpen(false); setQuery(""); },
    })),
    ...bundles.map(b => ({
      id: `bundle-${b.name}`,
      label: b.name,
      description: b.desc,
      type: "bundle" as const,
      icon: <Download size={14} />,
      action: () => {
        alert(`Installing ${b.name}...\n\n${b.desc}`);
        setOpen(false); setQuery("");
      },
    })),
    { id: "action-open-preferences", label: "Open Preferences", description: "Keyboard shortcuts, theme, settings", type: "action" as const, icon: <Settings size={14} />, action: () => { setOpen(false); setQuery(""); } },
  ];

  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) { setOpen(false); return; }
        openPalette();
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, openPalette]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  };

  return (
    <header style={{
      height: 44,
      flexShrink: 0,
      background: "#111113",
      borderBottom: "0.5px solid #3a3a3c",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      position: "relative",
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5b6af0", boxShadow: "0 0 8px rgba(91,106,240,0.7)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f5f5f7" }}>
          DevWorkspace
        </span>
        <span style={{ fontSize: 10, color: "#48484a", letterSpacing: "0.08em" }}>v1.0</span>
      </div>

      <div ref={containerRef} style={{ position: "relative" }}>
        <div
          onClick={openPalette}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 10,
            background: "#2c2c2e", border: "0.5px solid #3a3a3c",
            color: "#636366", fontSize: 12, width: 260, cursor: "pointer",
          }}
        >
          <Search size={12} />
          <span style={{ flex: 1 }}>Search tools, bundles, files...</span>
          <span style={{ fontSize: 10, background: "#3a3a3c", padding: "2px 6px", borderRadius: 5, fontFamily: "monospace" }}>⌘K</span>
        </div>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#1c1c1e", border: "0.5px solid #3a3a3c",
            borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            overflow: "hidden", zIndex: 200,
          }}>
            <div style={{ padding: "8px 10px", borderBottom: "0.5px solid #3a3a3c" }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tools, bundles, files..."
                style={{
                  width: "100%", background: "transparent",
                  border: "none", outline: "none",
                  fontSize: 13, color: "#f5f5f7",
                  fontFamily: "Inter, -apple-system, sans-serif",
                }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "16px 14px", fontSize: 12, color: "#48484a", textAlign: "center" }}>
                  No results for "{query}"
                </div>
              ) : filtered.map((item, index) => (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 14px", cursor: "pointer",
                    background: index === selectedIndex ? "#2c2c2e" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "#2c2c2e", border: "0.5px solid #3a3a3c",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#aeaeb2", flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#f5f5f7", fontWeight: 500, marginBottom: 1 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: "#636366", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</div>
                  </div>
                  <div style={{ fontSize: 9, color: "#48484a", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{item.type}</div>
                </div>
              ))}
            </div>
            <div style={{
              padding: "6px 14px", borderTop: "0.5px solid #3a3a3c",
              display: "flex", gap: 14, fontSize: 9, color: "#48484a",
            }}>
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#636366", fontFamily: "monospace" }}>{time}</span>
        {[<Bell size={14} />, <Settings size={14} />].map((icon, i) => (
          <button key={i} style={{
            width: 30, height: 30, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", color: "#636366", cursor: "pointer",
          }}>
            {icon}
          </button>
        ))}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #5b6af0, #3b4fd0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: "white",
          border: "1.5px solid #3a3a3c", cursor: "pointer",
        }}>
          {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
