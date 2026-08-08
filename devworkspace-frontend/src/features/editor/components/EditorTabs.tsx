import { X } from "lucide-react";
import type { OpenTab } from "../types";
import { lab } from "../styles/tokens";

interface EditorTabsProps {
  tabs: OpenTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export default function EditorTabs({
  tabs,
  activePath,
  onSelect,
  onClose,
}: EditorTabsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 34,
        background: lab.bg,
        borderBottom: `1px solid ${lab.border}`,
        overflowX: "auto",
        scrollbarWidth: "thin",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        return (
          <div
            key={tab.path}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(tab.path)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(tab.path);
            }}
            title={tab.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              height: "100%",
              padding: "0 8px 0 12px",
              cursor: "pointer",
              userSelect: "none",
              background: isActive ? lab.bgRaised : "transparent",
              borderRight: `1px solid ${lab.border}`,
              boxShadow: isActive ? `inset 0 2px 0 ${lab.amber}` : "none",
              fontSize: 12,
              color: isActive ? lab.text : lab.textMuted,
              fontFamily: lab.monospace,
              whiteSpace: "nowrap",
              transition: "background 0.1s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = lab.bgHover;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
                background: tab.isDirty ? lab.amber : lab.textFaint,
                opacity: tab.isDirty ? 1 : 0.4,
              }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {tab.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              title="Close"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: 3,
                border: "none",
                background: "transparent",
                color: lab.textFaint,
                cursor: "pointer",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = lab.bgActive;
                e.currentTarget.style.color = lab.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = lab.textFaint;
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      {tabs.length === 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontSize: 11,
            fontFamily: lab.monospace,
            color: lab.textFaint,
            letterSpacing: "0.08em",
          }}
        >
          no_program_loaded
        </div>
      )}
    </div>
  );
}