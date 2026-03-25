"use client";
import React, { useState } from "react";
import {
  Github,
  BookOpen,
  Code2,
  Settings,
  User,
  X,
  LayoutDashboard,
  Terminal,
} from "lucide-react";

type Tab = {
  id: string;
  title: string;
  icon: React.ReactNode;
};

export default function VirtualOS() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [openTabs, setOpenTabs] = useState<Tab[]>([
    { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard size={14} /> },
  ]);

  const openTool = (id: string, title: string, icon: React.ReactNode) => {
    setOpenTabs((prev) => {
      if (prev.find((t) => t.id === id)) return prev;
      return [...prev, { id, title, icon }];
    });
    setActiveTab(id);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTab === id && filtered.length > 0) {
        setActiveTab(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  const sidebarItems = [
    { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard size={18} />, tabIcon: <LayoutDashboard size={14} /> },
    { id: "vscode",    title: "VS Code",   icon: <Code2 size={18} />,           tabIcon: <Code2 size={14} /> },
    { id: "github",    title: "GitHub",    icon: <Github size={18} />,          tabIcon: <Github size={14} /> },
    { id: "notion",    title: "Notion",    icon: <BookOpen size={18} />,        tabIcon: <BookOpen size={14} /> },
  ];

  const getTabStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    fontSize: 11,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    whiteSpace: "nowrap" as const,
    color: isActive ? "#e0e0e8" : "#555",
    background: isActive ? "#0e0e11" : "transparent",
    borderTop: isActive ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid transparent",
    borderLeft: isActive ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid transparent",
    borderRight: isActive ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid transparent",
    borderBottom: "none",
    cursor: "pointer",
    userSelect: "none" as const,
    transition: "all 0.15s",
  });

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, marginBottom: 8 }}>
              Overview
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#ddd", marginBottom: 4 }}>
              Welcome back
            </div>
            <div style={{ fontSize: 13, color: "#444", marginBottom: 24 }}>
              3 active projects &nbsp;·&nbsp; 12 pending notifications
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Active Projects", value: "3",  delta: "↑ 1 this week", up: true },
                { label: "Commits Today",   value: "14", delta: "↑ 4 vs. avg",   up: true },
                { label: "Open Issues",     value: "7",  delta: "↓ 2 resolved",  up: false },
              ].map((s) => (
                <div key={s.label} style={{ background: "#131316", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#484848", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: "#ccc" }}>{s.value}</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: s.up ? "#7a9e7a" : "#9e7a7a" }}>{s.delta}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#131316", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#888" }}>Recent Activity</span>
                <span style={{ fontSize: 11, color: "#666", cursor: "pointer" }}>View all →</span>
              </div>
              {[
                { dot: "#888", text: "Pushed 3 commits to", highlight: "main",               highlightColor: "#bbb", time: "2m ago" },
                { dot: "#666", text: "PR #42 merged into",  highlight: "dev",                highlightColor: "#999", time: "1h ago" },
                { dot: "#555", text: "Build #118",          highlight: "passed all checks",  highlightColor: "#aaa", time: "3h ago" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: 6, borderBottom: i < 2 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: "#555" }}>
                    {a.text} <span style={{ color: a.highlightColor }}>{a.highlight}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#383838" }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case "vscode":
        return (
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Code2 size={36} color="#2a2a2a" />
              <span style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>monaco_editor.init()</span>
            </div>
          </div>
        );

      case "github":
        return (
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Github size={36} color="#2a2a2a" />
              <span style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>github_webview.connect()</span>
            </div>
          </div>
        );

      case "notion":
        return (
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <BookOpen size={36} color="#2a2a2a" />
              <span style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>notion_integration.ready()</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: "#0e0e11", color: "#a0a0aa", fontFamily: "Inter, sans-serif" }}>

      {/* NAVBAR */}
      <header style={{ height: 44, flexShrink: 0, background: "#131316", borderBottom: "0.5px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#888", boxShadow: "0 0 0 3px rgba(150,150,150,0.15)" }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "#ccc", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Virtual OS <span style={{ color: "#3a3a3a", fontWeight: 400 }}>v1.0</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ fontSize: 11, color: "#777", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", padding: "3px 10px", borderRadius: 6, cursor: "pointer" }}>
            Sign In
          </button>
          <button style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "0.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555" }}>
            <Settings size={14} />
          </button>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #555 0%, #333 100%)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
            <User size={13} color="#ccc" />
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <aside style={{ width: 56, flexShrink: 0, background: "#111114", borderRight: "0.5px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, paddingBottom: 12, gap: 4 }}>
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                title={item.title}
                onClick={() => openTool(item.id, item.title, item.tabIcon)}
                style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: isActive ? "rgba(200,200,200,0.08)" : "transparent", color: isActive ? "#ccc" : "#484848", position: "relative", transition: "all 0.15s" }}
              >
                {isActive && (
                  <div style={{ position: "absolute", left: -8, width: 3, height: 20, background: "#777", borderRadius: "0 3px 3px 0" }} />
                )}
                {item.icon}
              </button>
            );
          })}
          <div style={{ marginTop: "auto" }}>
            <button style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", background: "transparent", color: "#383838" }} title="Terminal">
              <Terminal size={18} />
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* TAB BAR */}
          <div style={{ height: 38, flexShrink: 0, background: "#131316", borderBottom: "0.5px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-end", padding: "0 12px", gap: 2, overflowX: "auto" }}>
            {openTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={getTabStyle(isActive)}
                >
                  {tab.icon}
                  <span>{tab.title}</span>
                  {tab.id !== "dashboard" && (
                    <span
                      onClick={(e) => closeTab(e, tab.id)}
                      style={{ width: 14, height: 14, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", marginLeft: 2, cursor: "pointer" }}
                    >
                      <X size={10} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* CONTENT */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 28, background: "#0e0e11" }}>
            {renderContent()}
          </div>

        </main>
      </div>
    </div>
  );
}