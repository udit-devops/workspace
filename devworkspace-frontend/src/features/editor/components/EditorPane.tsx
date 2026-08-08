import { useCallback, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  DEVWORKSPACE_DARK_THEME,
  DEVWORKSPACE_LIGHT_THEME,
} from "../themes";
import type { PaneState } from "../types";
import { lab } from "../styles/tokens";
import EditorTabs from "./EditorTabs";

export interface EditorPaneProps {
  pane: PaneState;
  themeMode: "dark" | "light";
  isActive: boolean;
  onFocus: () => void;
  onUpdate: (updater: (pane: PaneState) => PaneState) => void;
  /** Fired when the user edits the active tab (used for debounced autosave). */
  onContentEdited: (path: string) => void;
  /** Fired on Ctrl/Cmd+S — the host flushes pending writes for this pane. */
  onSaveRequest: () => void;
}

const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: lab.monospace,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  padding: { top: 16, bottom: 16 },
  renderLineHighlight: "all",
  wordWrap: "off",
  tabSize: 2,
  renderWhitespace: "selection",
  fontLigatures: true,
  bracketPairColorization: { enabled: true },
} as const;

export default function EditorPane({
  pane,
  themeMode,
  isActive,
  onFocus,
  onUpdate,
  onContentEdited,
  onSaveRequest,
}: EditorPaneProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const activeTab = pane.tabs.find((tab) => tab.path === pane.activePath) ?? null;

  const handleSelectTab = useCallback(
    (path: string) => {
      onUpdate((prev) => ({ ...prev, activePath: path }));
    },
    [onUpdate]
  );

  const handleCloseTab = useCallback(
    (path: string) => {
      onUpdate((prev) => {
        const index = prev.tabs.findIndex((tab) => tab.path === path);
        const nextTabs = prev.tabs.filter((tab) => tab.path !== path);
        let activePath = prev.activePath;
        if (prev.activePath === path) {
          const fallback = nextTabs[Math.min(Math.max(index, 0), nextTabs.length - 1)];
          activePath = fallback ? fallback.path : null;
        }
        const contents = { ...prev.contents };
        delete contents[path];
        const originals = { ...prev.originals };
        delete originals[path];
        return { ...prev, tabs: nextTabs, activePath, contents, originals };
      });
    },
    [onUpdate]
  );

  const handleSave = useCallback(() => {
    onSaveRequest();
  }, [onSaveRequest]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  useEffect(() => {
    if (isActive && activeTab) editorRef.current?.focus();
  }, [isActive, activeTab]);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      onUpdate((prev) => ({
        ...prev,
        cursor: { line: e.position.lineNumber, column: e.position.column },
      }));
    });
    if (isActive) editor.focus();
  };

  return (
    <div
      onClick={onFocus}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minWidth: 0,
        background: themeMode === "dark" ? lab.editorBg : "#f3efe4",
        outline: isActive ? `1px solid ${lab.borderStrong}` : "1px solid transparent",
        transition: "outline 0.15s ease",
      }}
    >
      <EditorTabs
        tabs={pane.tabs}
        activePath={pane.activePath}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab?.loading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: lab.monospace,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: lab.textFaint,
              }}
            >
              reading {activeTab.name} …
            </div>
          </div>
        ) : activeTab ? (
          <Editor
            path={`${pane.id}:${activeTab.path}`}
            defaultLanguage={activeTab.language}
            defaultValue={pane.contents[activeTab.path] ?? ""}
            theme={
              themeMode === "dark"
                ? DEVWORKSPACE_DARK_THEME
                : DEVWORKSPACE_LIGHT_THEME
            }
            onChange={(value) => {
              const p = activeTab.path;
              const next = value ?? "";
              onUpdate((prev) => {
                const dirty = next !== prev.originals[p];
                if (dirty) onContentEdited(p);
                return {
                  ...prev,
                  contents: { ...prev.contents, [p]: next },
                  tabs: prev.tabs.map((tab) =>
                    tab.path === p ? { ...tab, isDirty: dirty } : tab
                  ),
                };
              });
            }}
            onMount={handleMount}
            options={EDITOR_OPTIONS}
          />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", color: lab.textFaint }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⌘</div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: lab.monospace,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Open a file to begin
              </div>
            </div>
          </div>
        )}

      <StatusBar pane={pane} themeMode={themeMode} />
    </div>
    </div>
  );
}

interface StatusBarProps {
  pane: PaneState;
  themeMode: "dark" | "light";
}

function StatusBar({ pane, themeMode }: StatusBarProps) {
  const activeTab = pane.tabs.find((tab) => tab.path === pane.activePath);
  const dark = themeMode === "dark";

  return (
    <div
      style={{
        height: 24,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 12px",
        fontSize: 11,
        fontFamily: lab.monospace,
        background: dark ? lab.bgRaised : "#ece6d8",
        borderTop: `1px solid ${lab.border}`,
        color: lab.textFaint,
      }}
    >
      {activeTab ? (
        <>
          <span>{activeTab.language}</span>
          <span>
            Ln {pane.cursor.line}, Col {pane.cursor.column}
          </span>
          <span
            style={{
              color: activeTab.isDirty ? lab.amberBright : lab.textFaint,
            }}
          >
            {activeTab.isDirty ? "● modified" : "● saved"}
          </span>
        </>
      ) : (
        <span style={{ marginLeft: "auto" }}>— idle —</span>
      )}
    </div>
  );
}