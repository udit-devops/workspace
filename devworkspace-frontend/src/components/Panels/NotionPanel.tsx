import { BookOpen, ExternalLink, Plus, FileText } from "lucide-react";

interface NotionPanelProps {
  isConnected: boolean;
  onConnect: () => void;
  pages?: { id: string; title: string }[];
}

export default function NotionPanel({ isConnected, onConnect, pages = [] }: NotionPanelProps) {
  if (!isConnected) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#1c1c1e",
      }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: "rgba(245,245,247,0.06)",
            border: "0.5px solid #3a3a3c",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <BookOpen size={24} color="#f5f5f7" />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f5f5f7", marginBottom: 8 }}>Connect Notion</h2>
          <p style={{ fontSize: 12, color: "#636366", lineHeight: 1.7, marginBottom: 24 }}>
            Access your Notion workspace directly inside DevWorkspace.
            Pages, databases, and docs — all in one panel.
          </p>
          <button
            onClick={onConnect}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12,
              background: "#f5f5f7", color: "#1c1c1e",
              border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ExternalLink size={13} />
            Connect Notion
          </button>
          <p style={{ fontSize: 10, color: "#48484a", marginTop: 12 }}>
            You'll be redirected to Notion to approve access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", background: "#1c1c1e", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: "0.5px solid #3a3a3c",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "0.5px solid #3a3a3c",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#aeaeb2", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pages</span>
          <button style={{
            width: 24, height: 24, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", color: "#636366", cursor: "pointer",
          }}>
            <Plus size={13} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {pages.length === 0 ? (
            <p style={{ fontSize: 11, color: "#48484a", padding: "8px 16px" }}>No pages found.</p>
          ) : pages.map(page => (
            <button key={page.id} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 16px", background: "transparent", border: "none",
              color: "#8e8e93", fontSize: 12, cursor: "pointer", textAlign: "left",
            }}>
              <FileText size={13} style={{ color: "#48484a", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <BookOpen size={20} style={{ color: "#3a3a3c", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 12, color: "#48484a" }}>Select a page from the sidebar</p>
          <p style={{ fontSize: 11, color: "#3a3a3c", marginTop: 4 }}>Full Notion editor loads here in Electron</p>
        </div>
      </div>
    </div>
  );
}