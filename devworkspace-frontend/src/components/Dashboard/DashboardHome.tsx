import { BookOpen, Github, Code2, Bot, Figma, Download, Clock, Star, ArrowRight } from "lucide-react";
import type { ToolId } from "../layouts/Sidebar";
// import { ToolId } from "../layout/Sidebar";

interface DashboardHomeProps {
  onOpenTool: (id: ToolId) => void;
  connectedTools: ToolId[];
  user?: { name?: string; email?: string } | null;
}

const palette = {
  bg: "#0d0d0d",
  card: "#141414",
  cardHover: "#1a1a1a",
  border: "#26262c",
  borderHi: "#3a3a42",
  text: "#f2f2f4",
  muted: "#8a8a93",
  faint: "#5c5c64",
  accent: "#f2f2f4",
};

const apps = [
  { id: "notion" as ToolId, title: "Notion",        desc: "Docs, wikis, project planning.",     icon: <BookOpen size={20} />, color: "#eceff1" },
  { id: "github" as ToolId, title: "GitHub",        desc: "Repos, PRs, issues.",                 icon: <Github size={20} />,   color: "#cfd0d4" },
  { id: "editor" as ToolId, title: "Editor",        desc: "Monaco-powered code editor.",         icon: <Code2 size={20} />,    color: "#b9c7ff" },
  { id: "ai"     as ToolId, title: "AI Assistant",  desc: "Claude with full workspace context.", icon: <Bot size={20} />,      color: "#c0e6cf" },
  { id: "figma"  as ToolId, title: "Figma",         desc: "Design without switching apps.",       icon: <Figma size={20} />,    color: "#e5d3ff" },
];

const bundles = [
  {
    name: "react-starter",
    desc: "React 18 + Vite + Tailwind + Router. Zero config.",
    tags: ["React 18", "Vite", "Tailwind", "TypeScript"],
    installs: "2.4k", time: "~30s", color: "#b9c7ff",
  },
  {
    name: "nextjs-starter",
    desc: "Next.js 14 App Router + Tailwind + Prisma + NextAuth.",
    tags: ["Next.js 14", "Prisma", "NextAuth", "TypeScript"],
    installs: "1.8k", time: "~45s", color: "#cfd0d4",
  },
];

export default function DashboardHome({ onOpenTool, connectedTools, user }: DashboardHomeProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = user?.name?.split(" ")[0] ?? "there";

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      background: palette.bg,
      padding: "40px 48px",
    }}>

      {/* Greeting */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, color: palette.faint, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, marginBottom: 8 }}>
          Overview
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: palette.text, letterSpacing: "-0.02em", marginBottom: 6 }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 13, color: palette.muted }}>
          Your workspace is ready. Open a tool or start a new project.
        </p>
      </div>

      {/* Tools */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, color: palette.faint, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, marginBottom: 16 }}>
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
                  background: palette.card,
                  border: `1px solid ${palette.border}`,
                  borderRadius: 10,
                  padding: "20px 18px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 2px 10px rgba(0,0,0,0.35)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${palette.borderHi}`;
                  (e.currentTarget as HTMLButtonElement).style.background = palette.cardHover;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${palette.border}`;
                  (e.currentTarget as HTMLButtonElement).style.background = palette.card;
                }}
              >
                {/* Status */}
                <div style={{ position: "absolute", top: 16, right: 16 }}>
                  {connected ? (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3dd68c", boxShadow: "0 0 6px rgba(61,214,140,0.6)" }} />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: palette.borderHi }} />
                  )}
                </div>

                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: "#0f0f0f",
                  border: `1px solid ${palette.border}`,
                  boxShadow: "0 1px 0 rgba(0,0,0,0.6) inset",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: app.color, marginBottom: 14,
                }}>
                  {app.icon}
                </div>

                {/* Text */}
                <div style={{ fontSize: 13, fontWeight: 600, color: palette.text, marginBottom: 4 }}>{app.title}</div>
                <div style={{ fontSize: 11, color: palette.muted, lineHeight: 1.5 }}>{app.desc}</div>

                {/* Arrow on hover */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 11, color: app.color, fontFamily: "monospace" }}>
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
        <div style={{ flex: 1, height: 1, background: palette.border }} />
        <span style={{ fontSize: 10, color: palette.faint, textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: "monospace" }}>Bundles</span>
        <div style={{ flex: 1, height: 1, background: palette.border }} />
      </div>

      {/* Bundles */}
      <div>
        <p style={{ fontSize: 11, color: palette.faint, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, marginBottom: 4 }}>
          Quick start
        </p>
        <p style={{ fontSize: 12, color: palette.faint, marginBottom: 16 }}>
          Pre-configured project bundles. One click to start coding.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 860 }}>
          {bundles.map(b => (
            <div
              key={b.name}
              style={{
                background: palette.card,
                border: `1px solid ${palette.border}`,
                borderRadius: 12,
                padding: "20px",
                boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 2px 10px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: palette.text, fontFamily: "monospace", marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: palette.muted, lineHeight: 1.5 }}>{b.desc}</div>
                </div>
                <button
                  onClick={() => alert(`Installing ${b.name}...\n\n${b.desc}\n\nThis will set up a new project with all dependencies pre-configured.`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 6,
                    background: "#1b1b1b", color: b.color,
                    border: `1px solid ${palette.borderHi}`,
                    fontSize: 11, fontWeight: 500, cursor: "pointer", flexShrink: 0, marginLeft: 12,
                  }}>
                  <Download size={11} />
                  Use
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {b.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    background: "#101010", color: palette.muted,
                    fontFamily: "monospace", border: `1px solid ${palette.border}`,
                    letterSpacing: "0.04em",
                  }}>{tag}</span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 10, color: palette.faint, fontFamily: "monospace" }}>
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