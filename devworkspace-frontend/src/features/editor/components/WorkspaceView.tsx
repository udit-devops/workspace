import { useState } from "react";
import type { LayoutNode } from "../types";
import { lab } from "../styles/tokens";
import EditorPane, { type EditorPaneProps } from "./EditorPane";

interface WorkspaceViewProps {
  layout: LayoutNode;
  panes: Record<string, EditorPaneProps["pane"]>;
  themeMode: "dark" | "light";
  activePaneId: string;
  onFocusPane: (id: string) => void;
  onUpdatePane: (id: string, updater: (pane: EditorPaneProps["pane"]) => EditorPaneProps["pane"]) => void;
  onUpdateSplitRatio: (target: LayoutNode, ratio: number) => void;
  onContentEdited: (paneId: string, path: string) => void;
  onSaveRequest: (paneId: string) => void;
}

interface SplitDividerProps {
  direction: "horizontal" | "vertical";
  onRatioChange: (ratio: number) => void;
}

function SplitDivider({ direction, onRatioChange }: SplitDividerProps) {
  const [hover, setHover] = useState(false);
  const isHorizontal = direction === "horizontal";

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      let ratio: number;
      if (isHorizontal) ratio = (moveEvent.clientX - rect.left) / rect.width;
      else ratio = (moveEvent.clientY - rect.top) / rect.height;
      onRatioChange(Math.min(0.8, Math.max(0.2, ratio)));
    };
    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flexShrink: 0,
        background: hover ? lab.amber : lab.border,
        transition: "background 0.12s ease",
        cursor: isHorizontal ? "col-resize" : "row-resize",
        ...(isHorizontal ? { width: 2, height: "100%" } : { height: 2, width: "100%" }),
      }}
    />
  );
}

function WorkspaceView({
  layout,
  panes,
  themeMode,
  activePaneId,
  onFocusPane,
  onUpdatePane,
  onUpdateSplitRatio,
  onContentEdited,
  onSaveRequest,
}: WorkspaceViewProps) {
  const renderNode = (node: LayoutNode): React.ReactNode => {
    if (node.kind === "pane") {
      const pane = panes[node.id];
      if (!pane) return null;
      return (
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <EditorPane
            pane={pane}
            themeMode={themeMode}
            isActive={node.id === activePaneId}
            onFocus={() => onFocusPane(node.id)}
            onUpdate={(updater) => onUpdatePane(node.id, updater)}
            onContentEdited={(path) => onContentEdited(node.id, path)}
            onSaveRequest={() => onSaveRequest(node.id)}
          />
        </div>
      );
    }

    const isHorizontal = node.direction === "horizontal";
    const childStyle: React.CSSProperties = {
      display: "flex",
      minWidth: 0,
      minHeight: 0,
      ...(isHorizontal
        ? { flexDirection: "row", flex: node.ratio, flexBasis: 0 }
        : { flexDirection: "column", flex: node.ratio, flexBasis: 0 }),
    };

    return (
      <div
        style={{
          display: "flex",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          ...(isHorizontal ? { flexDirection: "row" } : { flexDirection: "column" }),
        }}
      >
        <div style={childStyle}>{renderNode(node.left)}</div>
        <SplitDivider
          direction={node.direction}
          onRatioChange={(ratio) => onUpdateSplitRatio(node, ratio)}
        />
        <div style={childStyle}>{renderNode(node.right)}</div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0 }}>
      {renderNode(layout)}
    </div>
  );
}

export default WorkspaceView;