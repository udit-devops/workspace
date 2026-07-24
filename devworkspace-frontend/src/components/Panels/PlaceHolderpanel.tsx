import React from "react";

interface PlaceholderPanelProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

export default function PlaceholderPanel({ icon, title, subtitle, color }: PlaceholderPanelProps) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#1c1c1e",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: `${color}14`,
          border: `0.5px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px", color,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#636366", fontFamily: "monospace" }}>{subtitle}</div>
      </div>
    </div>
  );
}