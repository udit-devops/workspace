import { Search, Settings, Bell } from "lucide-react";

interface TopBarProps {
  user?: { name?: string; email?: string } | null;
}

export default function TopBar({ user }: TopBarProps) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5b6af0", boxShadow: "0 0 8px rgba(91,106,240,0.7)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f5f5f7" }}>
          DevWorkspace
        </span>
        <span style={{ fontSize: 10, color: "#48484a", letterSpacing: "0.08em" }}>v1.0</span>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 14px", borderRadius: 10,
        background: "#2c2c2e", border: "0.5px solid #3a3a3c",
        color: "#636366", fontSize: 12, width: 260, cursor: "pointer",
      }}>
        <Search size={12} />
        <span style={{ flex: 1 }}>Search tools, bundles, files...</span>
        <span style={{ fontSize: 10, background: "#3a3a3c", padding: "2px 6px", borderRadius: 5, fontFamily: "monospace" }}>⌘K</span>
      </div>

      {/* Right */}
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