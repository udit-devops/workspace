import { useState } from "react";
import {
  Play,
  Radio,
  RefreshCw,
  SplitSquareVertical,
  SplitSquareHorizontal,
  X,
} from "lucide-react";
import type { SplitDirection } from "../types";
import { lab } from "../styles/tokens";

interface ActionBarProps {
  projectName: string;
  workspacePath: string;
  activePaneId: string | null;
  hasSplits: boolean;
  onRun: () => void;
  onToggleLiveServer: () => void;
  liveServerOn: boolean;
  onSplit: (direction: SplitDirection) => void;
  onCloseActivePane: () => void;
  onRefresh: () => void;
}

function ToolButton({
  onClick,
  active,
  color,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  color?: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 10px",
        border: `1px solid ${active ? color ?? lab.amber : lab.borderStrong}`,
        borderRadius: 4,
        background: active ? `${color ?? lab.amber}18` : "transparent",
        color: active ? color ?? lab.amber : lab.textMuted,
        cursor: "pointer",
        fontSize: 11,
        fontFamily: lab.monospace,
        letterSpacing: "0.03em",
        transition: "all 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = color ?? lab.amber;
          e.currentTarget.style.color = color ?? lab.amber;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = lab.borderStrong;
          e.currentTarget.style.color = lab.textMuted;
        }
      }}
    >
      {children}
    </button>
  );
}

const ACTION_BAR_STYLE: React.CSSProperties = {
  height: 34,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 10px",
  background: lab.bgRaised,
  borderBottom: `1px solid ${lab.border}`,
};

const SEP: React.CSSProperties = {
  width: 1,
  height: 18,
  background: lab.border,
  margin: "0 2px",
};

export default function ActionBar({
  projectName,
  workspacePath,
  activePaneId,
  hasSplits,
  onRun,
  onToggleLiveServer,
  liveServerOn,
  onSplit,
  onCloseActivePane,
  onRefresh,
}: ActionBarProps) {
  const [showSplitMenu, setShowSplitMenu] = useState(false);

  const splitAction = (direction: "horizontal" | "vertical") => {
    setShowSplitMenu(false);
    onSplit(direction);
  };

  return (
    <div style={ACTION_BAR_STYLE}>
      <span
        title={workspacePath}
        style={{
          fontSize: 11,
          fontFamily: lab.monospace,
          color: lab.text,
          letterSpacing: "0.04em",
          marginRight: 4,
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {projectName}
      </span>
      <span style={{ fontSize: 10, color: lab.textFaint, fontFamily: lab.monospace }}>
        ▤ {activePaneId ?? "—"}
      </span>

      <div style={{ flex: 1 }} />

      <ToolButton onClick={onRefresh} color={lab.blue} title="Refresh file tree">
        <RefreshCw size={12} />
        Refresh
      </ToolButton>

      <ToolButton onClick={onRun} color={lab.green} title="Run project">
        <Play size={12} />
        Run
      </ToolButton>

      <ToolButton
        onClick={onToggleLiveServer}
        active={liveServerOn}
        color={lab.teal}
        title="Toggle Live Server"
      >
        <Radio size={12} />
        Live
      </ToolButton>

      <div style={SEP} />

      {/* Split dropdown */}
      <div style={{ position: "relative" }}>
        <ToolButton
          onClick={() => setShowSplitMenu((v) => !v)}
          color={lab.blue}
          title="Split editor"
        >
          <SplitSquareVertical size={12} />
          Split
        </ToolButton>
        {showSplitMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              background: lab.bgRaised,
              border: `1px solid ${lab.borderStrong}`,
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              padding: 4,
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <MenuItem
              onClick={() => splitAction("horizontal")}
              icon={<SplitSquareVertical size={12} />}
              label="Split Right"
              keyHint="Ctrl+\\"
            />
            <MenuItem
              onClick={() => splitAction("vertical")}
              icon={<SplitSquareHorizontal size={12} />}
              label="Split Down"
              keyHint="Ctrl+Shift+\\"
            />
          </div>
        )}
      </div>

      {hasSplits && (
        <ToolButton
          onClick={onCloseActivePane}
          color={lab.red}
          title="Close active pane"
        >
          <X size={12} />
        </ToolButton>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  label,
  keyHint,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  keyHint?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "6px 10px",
        border: "none",
        background: "transparent",
        color: lab.text,
        cursor: "pointer",
        fontSize: 12,
        fontFamily: lab.monospace,
        borderRadius: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = lab.bgActive)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {keyHint && <span style={{ color: lab.textFaint, fontSize: 10 }}>{keyHint}</span>}
    </button>
  );
}