import { Link } from "react-router-dom";
import { Github, BookOpen, Code2, Bot, Figma, ArrowDown, ArrowRight } from "lucide-react";
import logo from "../assets/logo.png";

const navLinks = ["Explore", "Membership", "Extension", "Analyze"];

const tools = [
  { id: "notion", title: "Notion", desc: "Docs, wikis, project planning.", icon: <BookOpen size={18} /> },
  { id: "github", title: "GitHub", desc: "Repos, PRs, issues.", icon: <Github size={18} /> },
  { id: "editor", title: "Editor", desc: "Monaco-powered code editor.", icon: <Code2 size={18} /> },
  { id: "ai", title: "AI Assistant", desc: "Claude with full workspace context.", icon: <Bot size={18} /> },
  { id: "figma", title: "Figma", desc: "Design without switching apps.", icon: <Figma size={18} /> },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "#ffffff" }}>
      {/* NAVIGATION BAR */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "22px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <img src={logo} alt="Devspaces" style={{ width: 26, height: 26, borderRadius: 6 }} />
          <div style={{ display: "flex", gap: 28 }}>
            {navLinks.map((label) => (
              <a
                key={label}
                href="#tools"
                style={{
                  fontSize: 13,
                  color: "#a1a1a8",
                  textDecoration: "none",
                  fontWeight: 450,
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#a1a1a8")}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            style={{
              padding: "8px 18px",
              background: "transparent",
              border: "1px solid #34343a",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: 6,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.borderColor = "#55555c";
              (e.target as HTMLElement).style.background = "#0d0d0d";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.borderColor = "#34343a";
              (e.target as HTMLElement).style.background = "transparent";
            }}
          >
            Submit
          </button>
          <Link
            to="/login"
            style={{
              padding: "8px 22px",
              background: "#ffffff",
              color: "#000000",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Log In
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "64px 32px 40px",
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            maxWidth: 620,
            marginBottom: 24,
          }}
        >
          Build your creative knowledge base.
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: "#8e8e96",
            maxWidth: 540,
            marginBottom: 36,
          }}
        >
          Every website, screenshot, interaction, code experiment, and idea you save becomes
          searchable, reusable knowledge for your creative workflow.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            to="/signup"
            style={{
              padding: "12px 28px",
              background: "#ffffff",
              color: "#000000",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Sign Up
          </Link>
          <a
            href="#tools"
            style={{
              padding: "12px 28px",
              background: "transparent",
              border: "1px solid #34343a",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              borderRadius: 6,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "transparent";
            }}
          >
            Explore
          </a>
        </div>
      </section>

      {/* MOCKUP WINDOW */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 90px" }}>
        <div
          id="tools"
          style={{
            background: "#111111",
            border: "1px solid #25252a",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid #25252a",
              background: "#0c0c0c",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.9 }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#8e8e96", letterSpacing: "0.02em" }}>Devspaces</span>
            <div style={{ width: 60 }} />
          </div>

          {/* Window body - vintage tool cards */}
          <div style={{ padding: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 14 }}>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  style={{
                    background: "#0c0c0c",
                    border: "1px solid #26262b",
                    borderRadius: 10,
                    padding: "18px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid #2e2e34",
                      background: "#141414",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#d9d9dd",
                      marginBottom: 14,
                    }}
                  >
                    {tool.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", marginBottom: 4 }}>{tool.title}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.5, color: "#6e6e76", minHeight: 32 }}>{tool.desc}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 11, color: "#9a9aa2" }}>
                    Open
                    <ArrowRight size={11} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keep scrolling */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "18px 0 26px",
              borderTop: "1px solid #25252a",
              background: "#0c0c0c",
              fontSize: 12,
              color: "#8e8e96",
              letterSpacing: "0.06em",
            }}
          >
            Keep scrolling
            <ArrowDown size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}