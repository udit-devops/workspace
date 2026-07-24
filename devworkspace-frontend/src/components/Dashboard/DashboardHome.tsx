import { BookOpen, Github, Code2, Bot, Figma, Download, Clock, Star, ArrowRight } from "lucide-react";
import type { ToolId } from "../layouts/Sidebar";
// import { ToolId } from "../layout/Sidebar";

interface DashboardHomeProps {
  onOpenTool: (id: ToolId) => void;
  connectedTools: ToolId[];
  user?: { name?: string; email?: string } | null;
}

const apps = [
  { id: "notion" as ToolId,  title: "Notion",       desc: "Docs, wikis, project planning.",          icon: <BookOpen size={22} />, color: "#f5f5f7" },
  { id: "github" as ToolId,  title: "GitHub",        desc: "Repos, PRs, issues.",                     icon: <Github size={22} />,   color: "#aeaeb2" },
  { id: "editor" as ToolId,  title: "Editor",        desc: "Monaco-powered code editor.",             icon: <Code2 size={22} />,    color: "#5b6af0" },
  { id: "ai"     as ToolId,  title: "AI Assistant",  desc: "Claude with full workspace context.",     icon: <Bot size={22} />,      color: "#32d74b" },
  { id: "figma"  as ToolId,  title: "Figma",         desc: "Design without switching apps.",          icon: <Figma size={22} />,    color: "#a259ff" },
];

const bundles = [
  {
    name: "react-starter",
    desc: "React 18 + Vite + Tailwind + Router. Zero config.",
    tags: ["React 18", "Vite", "Tailwind", "TypeScript"],
    installs: "2.4k", time: "~30s", color: "#5b6af0",
  },
  {
    name: "nextjs-starter",
    desc: "Next.js 14 App Router + Tailwind + Prisma + NextAuth.",
    tags: ["Next.js 14", "Prisma", "NextAuth", "TypeScript"],
    installs: "1.8k", time: "~45s", color: "#aeaeb2",
  },
];

export default function DashboardHome({ onOpenTool, connectedTools, user }: DashboardHomeProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = user?.name?.split(" ")[0] ?? "there";

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      background: "#1c1c1e",
      padding: "40px 48px",
    }}>

      {/* Greeting */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, color: "#636366", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, marginBottom: 8 }}>
          Overview
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#f5f5f7", letterSpacing: "-0.02em", marginBottom: 6 }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 13, color: "#636366" }}>
          Your workspace is ready. Open a tool or start a new project.
        </p>
      </div>

      {/* Tools */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, color: "#636366", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, marginBottom: 16 }}>
          Tools
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {apps.map(app => {
            const connected = connectedTools.includes(app.id);
            return (
              <button
                key={app.id}
                onClick={() => onOpenTool(app.id)}
                style={{
                  position: "relative",
                  textAlign: "left",
                  background: "#2c2c2e",
                  border: "0.5px solid #3a3a3c",
                  borderRadius: 16,
                  padding: "20px 18px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `0.5px solid ${app.color}50`;
                  (e.currentTarget as HTMLButtonElement).style.background = "#323234";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = "0.5px solid #3a3a3c";
                  (e.currentTarget as HTMLButtonElement).style.background = "#2c2c2e";
                }}
              >
                {/* Status */}
                <div style={{ position: "absolute", top: 14, right: 14 }}>
                  {connected ? (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32d74b", boxShadow: "0 0 6px rgba(50,215,75,0.6)" }} />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3a3a3c" }} />
                  )}
                </div>

                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `${app.color}14`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: app.color, marginBottom: 14,
                }}>
                  {app.icon}
                </div>

                {/* Text */}
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 4 }}>{app.title}</div>
                <div style={{ fontSize: 11, color: "#636366", lineHeight: 1.5 }}>{app.desc}</div>

                {/* Arrow on hover — shown via CSS workaround with always-there but transparent */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 11, color: app.color, opacity: 0.7 }}>
                  <span>Open</span>
                  <ArrowRight size={11} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 0.5, background: "#3a3a3c" }} />
        <span style={{ fontSize: 10, color: "#48484a", textTransform: "uppercase", letterSpacing: "0.16em" }}>Bundles</span>
        <div style={{ flex: 1, height: 0.5, background: "#3a3a3c" }} />
      </div>

      {/* Bundles */}
      <div>
        <p style={{ fontSize: 11, color: "#636366", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, marginBottom: 4 }}>
          Quick start
        </p>
        <p style={{ fontSize: 12, color: "#48484a", marginBottom: 16 }}>
          Pre-configured project bundles. One click to start coding.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 860 }}>
          {bundles.map(b => (
            <div
              key={b.name}
              style={{
                background: "#2c2c2e",
                border: "0.5px solid #3a3a3c",
                borderRadius: 16,
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f7", fontFamily: "monospace", marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "#636366", lineHeight: 1.5 }}>{b.desc}</div>
                </div>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  background: `${b.color}18`, color: b.color,
                  border: `0.5px solid ${b.color}30`,
                  fontSize: 11, fontWeight: 500, cursor: "pointer", flexShrink: 0, marginLeft: 12,
                }}>
                  <Download size={11} />
                  Use
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {b.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 20,
                    background: "#3a3a3c", color: "#8e8e93",
                    fontFamily: "monospace", border: "0.5px solid #48484a",
                  }}>{tag}</span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#48484a" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Download size={10} />{b.installs} installs</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} />Ready in {b.time}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}><Star size={10} />Official</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}