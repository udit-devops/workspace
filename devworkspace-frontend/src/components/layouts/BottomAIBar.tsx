import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

export default function BottomAIBar() {
  const [value, setValue] = useState("");

  return (
    <div style={{
      flexShrink: 0,
      background: "#111113",
      borderTop: "0.5px solid #3a3a3c",
      padding: "10px 16px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px",
        borderRadius: 14,
        background: "#2c2c2e",
        border: "0.5px solid #3a3a3c",
      }}>
        <Sparkles size={14} style={{ color: "#5b6af0", flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ask AI anything about your workspace..."
          style={{
            flex: 1, background: "transparent",
            border: "none", outline: "none",
            fontSize: 13, color: "#f5f5f7",
            fontFamily: "Inter, -apple-system, sans-serif",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "#48484a", fontFamily: "monospace" }}>⌘↵</span>
          <button
            disabled={!value.trim()}
            style={{
              width: 26, height: 26, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: value.trim() ? "#5b6af0" : "#3a3a3c",
              border: "none", cursor: value.trim() ? "pointer" : "not-allowed",
              color: "white", transition: "all 0.15s",
            }}
          >
            <ArrowUp size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}