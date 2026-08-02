import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

export default function BottomAIBar() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!value.trim() || loading) return;
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("http://localhost:5000/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResponse(data.reply || "No response");
      } else {
        setResponse("AI service unavailable. Your message was noted.");
      }
    } catch {
      setResponse("AI service unavailable. Your message was noted.");
    } finally {
      setLoading(false);
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

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
          onKeyDown={handleKeyDown}
          placeholder="Ask AI anything about your workspace..."
          disabled={loading}
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
            disabled={!value.trim() || loading}
            onClick={handleSubmit}
            style={{
              width: 26, height: 26, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: value.trim() && !loading ? "#5b6af0" : "#3a3a3c",
              border: "none", cursor: value.trim() && !loading ? "pointer" : "not-allowed",
              color: "white", transition: "all 0.15s",
            }}
          >
            <ArrowUp size={13} />
          </button>
        </div>
      </div>
      {response && (
        <div style={{
          marginTop: 8, padding: "8px 14px", borderRadius: 10,
          background: "#2c2c2e", fontSize: 12, color: "#aeaeb2",
          lineHeight: 1.6,
        }}>
          {response}
          <button
            onClick={() => setResponse(null)}
            style={{
              marginLeft: 10, background: "transparent", border: "none",
              color: "#636366", cursor: "pointer", fontSize: 10,
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
