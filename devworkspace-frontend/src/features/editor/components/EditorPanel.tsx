import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun, X, FolderOpen } from "lucide-react";
import "../monacoSetup";
import type {
  FileEntry,
  LayoutNode,
  PaneState,
  SplitDirection,
  ThemeMode,
  WorkspaceAction,
} from "../types";
import {
  closePane,
  collectPaneIds,
  createPaneNode,
  nextPaneId,
  splitPane,
  updateSplitRatio,
} from "../utils/layout";
import { fsAdapter } from "../services/fsAdapter";
import { workspaceStore } from "../services/workspaceStore";
import { lab } from "../styles/tokens";
import FileTree from "./FileTree";
import ActionBar from "./ActionBar";
import WorkspaceView from "./WorkspaceView";

type TreeState = "idle" | "loading" | "ready" | "error";

export default function EditorPanel() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [layout, setLayout] = useState<LayoutNode>(() =>
    createPaneNode(nextPaneId())
  );
  const [panes, setPanes] = useState<Record<string, PaneState>>({});
  const [activePaneId, setActivePaneId] = useState<string | null>(null);
  const [liveServerOn, setLiveServerOn] = useState(false);
  const [output, setOutput] = useState<{ type: WorkspaceAction; message: string } | null>(null);

  // Backend / workspace state
  const [workspace, setWorkspace] = useState<string | null>(() =>
    workspaceStore.getWorkspace()
  );
  const [root, setRoot] = useState<FileEntry | null>(null);
  const [treeState, setTreeState] = useState<TreeState>("idle");
  const [treeError, setTreeError] = useState<string | null>(null);

  const autosaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlight = useRef<Set<string>>(new Set());

  const flash = useCallback((message: string) => {
    setOutput((prev) => {
      if (prev && prev.type === "run" && prev.message === message) return prev;
      return { type: "run", message };
    });
  }, []);

  const ensurePane = useCallback((id: string) => {
    setPanes((prev) =>
      prev[id]
        ? prev
        : {
            ...prev,
            [id]: {
              id,
              tabs: [],
              activePath: null,
              contents: {},
              originals: {},
              cursor: { line: 1, column: 1 },
            },
          }
    );
  }, []);

  const resetWorkspaceState = useCallback(() => {
    const ids = collectPaneIds(layout);
    ids.forEach(ensurePane);
    const first = ids[0];
    setPanes({
      [first]: {
        id: first,
        tabs: [],
        activePath: null,
        contents: {},
        originals: {},
        cursor: { line: 1, column: 1 },
      },
    });
    setRoot(null);
    setTreeState("idle");
    setTreeError(null);
    setActivePaneId(first ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const loadTree = useCallback(
    async (ws: string) => {
      setTreeState("loading");
      setTreeError(null);
      try {
        const { tree } = await fsAdapter.getTree(ws);
        setRoot(tree);
        setTreeState("ready");
      } catch (err) {
        setTreeState("error");
        setTreeError(
          err instanceof Error
            ? err.message
            : "Failed to load workspace. The server may be offline or auth is required."
        );
        setRoot(null);
      }
    },
    []
  );

  const openWorkspace = useCallback(
    async (path: string) => {
      const trimmed = path.trim();
      if (!trimmed) return;
      workspaceStore.setWorkspace(trimmed);
      setWorkspace(trimmed);
      resetWorkspaceState();
      await loadTree(trimmed);
    },
    [resetWorkspaceState, loadTree]
  );

  // Initialize the first pane.
  useEffect(() => {
    const ids = collectPaneIds(layout);
    if (ids.length > 0) ensurePane(ids[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load persisted workspace on mount.
  useEffect(() => {
    if (workspace) loadTree(workspace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep activePaneId pointing at a valid pane.
  useEffect(() => {
    const ids = collectPaneIds(layout);
    if (!activePaneId || !ids.includes(activePaneId)) {
      setActivePaneId(ids[0] ?? null);
    }
    ids.forEach(ensurePane);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const loadFileContent = useCallback(
    async (paneId: string, filePath: string) => {
      if (!workspace) return;
      try {
        const file = await fsAdapter.readFile(workspace, filePath);
        if (file.encoding === "binary") {
          setPanes((prev) => {
            const pane = prev[paneId];
            if (!pane) return prev;
            const tabs = pane.tabs.filter((tab) => tab.path !== filePath);
            return {
              ...prev,
              [paneId]: {
                ...pane,
                tabs,
                activePath:
                  pane.activePath === filePath
                    ? tabs[0]?.path ?? null
                    : pane.activePath,
              },
            };
          });
          flash(`Binary file skipped in editor: ${file.name}`);
          return;
        }
        setPanes((prev) => {
          const pane = prev[paneId];
          if (!pane || !pane.tabs.some((tab) => tab.path === filePath)) return prev;
          return {
            ...prev,
            [paneId]: {
              ...pane,
              contents: { ...pane.contents, [filePath]: file.content },
              originals: { ...pane.originals, [filePath]: file.content },
              tabs: pane.tabs.map((tab) =>
                tab.path === filePath ? { ...tab, loading: false } : tab
              ),
            },
          };
        });
      } catch (err) {
        flash(
          `Failed to read ${filePath.split("/").pop()}: ${err instanceof Error ? err.message : "error"}`
        );
        setPanes((prev) => {
          const pane = prev[paneId];
          if (!pane) return prev;
          return {
            ...prev,
            [paneId]: {
              ...pane,
              tabs: pane.tabs
                .filter((tab) => tab.path !== filePath)
                .concat(),
              activePath:
                pane.activePath === filePath
                  ? pane.tabs.find((t) => t.path !== filePath)?.path ?? null
                  : pane.activePath,
            },
          };
        });
      }
    },
    [workspace, flash]
  );

  const handleOpenFile = useCallback(
    (path: string) => {
      if (!root) return;
      const target = activePaneId ?? collectPaneIds(layout)[0] ?? null;
      if (!target) return;

      const entry = findEntry(root, path);
      if (!entry || entry.kind !== "file") return;

      setActivePaneId(target);
      ensurePane(target);
      setPanes((prev) => {
        const pane = prev[target];
        if (!pane) return prev;
        if (pane.tabs.some((tab) => tab.path === path)) {
          return { ...prev, [target]: { ...pane, activePath: path } };
        }
        return {
          ...prev,
          [target]: {
            ...pane,
            activePath: path,
            tabs: [
              ...pane.tabs,
              {
                path,
                name: entry.name,
                language: entry.language ?? languageFromName(entry.name),
                isDirty: false,
                loading: true,
              },
            ],
          },
        };
      });
      loadFileContent(target, path);
    },
    [root, activePaneId, layout, ensurePane, loadFileContent]
  );

  const handleUpdatePane = useCallback(
    (id: string, updater: (pane: PaneState) => PaneState) => {
      setPanes((prev) => (prev[id] ? { ...prev, [id]: updater(prev[id]) } : prev));
      setActivePaneId((cur) => cur ?? id);
    },
    []
  );

  const persistFile = useCallback(
    async (paneId: string, filePath: string) => {
      if (!workspace) return;
      const key = `${paneId}::${filePath}`;
      if (inFlight.current.has(key)) return;
      const content = panes[paneId]?.contents[filePath];
      if (content === undefined) return;

      inFlight.current.add(key);
      try {
        await fsAdapter.writeFile(workspace, filePath, content);
        setPanes((prev) => {
          const pane = prev[paneId];
          if (!pane) return prev;
          return {
            ...prev,
            [paneId]: {
              ...pane,
              originals: { ...pane.originals, [filePath]: content },
              tabs: pane.tabs.map((tab) =>
                tab.path === filePath ? { ...tab, isDirty: false } : tab
              ),
            },
          };
        });
      } catch (err) {
        flash(
          `Save failed (${filePath.split("/").pop()}): ${err instanceof Error ? err.message : "error"}`
        );
      } finally {
        inFlight.current.delete(key);
      }
    },
    [workspace, panes, flash]
  );

  const scheduleAutosave = useCallback(
    (paneId: string, path: string) => {
      if (!workspace) return;
      const key = `${paneId}::${path}`;
      const existing = autosaveTimers.current.get(key);
      if (existing) clearTimeout(existing);
      autosaveTimers.current.set(
        key,
        setTimeout(() => {
          autosaveTimers.current.delete(key);
          persistFile(paneId, path);
        }, 700)
      );
    },
    [workspace, persistFile]
  );

  const handleSaveRequest = useCallback(
    (paneId: string) => {
      const pane = panes[paneId];
      if (!pane) return;
      const dirty = pane.tabs.filter((tab) => tab.isDirty).map((tab) => tab.path);
      for (const path of dirty) {
        const key = `${paneId}::${path}`;
        const timer = autosaveTimers.current.get(key);
        if (timer) {
          clearTimeout(timer);
          autosaveTimers.current.delete(key);
        }
        persistFile(paneId, path);
      }
    },
    [panes, persistFile]
  );

  const closeTabsForPath = useCallback((filePath: string) => {
    setPanes((prev) => {
      const next: Record<string, PaneState> = {};
      for (const [id, pane] of Object.entries(prev)) {
        const tabs = pane.tabs.filter((t) => !isUnder(filePath, t.path));
        const contents: Record<string, string> = {};
        const originals: Record<string, string> = {};
        for (const tab of tabs) {
          if (pane.contents[tab.path] !== undefined) contents[tab.path] = pane.contents[tab.path];
          if (pane.originals[tab.path] !== undefined) originals[tab.path] = pane.originals[tab.path];
        }
        let activePath = pane.activePath;
        if (activePath && !tabs.some((t) => t.path === activePath)) {
          activePath = tabs[0]?.path ?? null;
        }
        next[id] = { ...pane, tabs, contents, originals, activePath };
      }
      return next;
    });
  }, []);

  const handleCreate = useCallback(
    async (parentPath: string, name: string, kind: "file" | "directory") => {
      if (!workspace) return;
      try {
        const entry = await fsAdapter.createItem(workspace, parentPath, name, kind);
        const { tree } = await fsAdapter.getTree(workspace);
        setRoot(tree);
        if (kind === "file" && entry && entry.path) {
          openFileDirect(entry.path);
        }
      } catch (err) {
        flash(
          `Create "name" failed: ${err instanceof Error ? err.message : "error"}`
        );
      }
    },
    [workspace, flash]
  );

  // Opens a freshly-created file without a network read (content is empty).
  const openFileDirect = useCallback(
    (path: string) => {
      const target = activePaneId ?? collectPaneIds(layout)[0] ?? null;
      if (!target) return;
      setActivePaneId(target);
      ensurePane(target);
      setPanes((prev) => {
        const pane = prev[target];
        if (!pane) return prev;
        if (pane.tabs.some((tab) => tab.path === path)) {
          return { ...prev, [target]: { ...pane, activePath: path } };
        }
        const name = path.split("/").pop() ?? path;
        return {
          ...prev,
          [target]: {
            ...pane,
            activePath: path,
            contents: { ...pane.contents, [path]: "" },
            originals: { ...pane.originals, [path]: "" },
            tabs: [
              ...pane.tabs,
              {
                path,
                name,
                language: languageFromName(name),
                isDirty: false,
                loading: false,
              },
            ],
          },
        };
      });
    },
    [activePaneId, layout, ensurePane]
  );

  const handleDelete = useCallback(
    async (path: string) => {
      if (!workspace) return;
      const name = path.split("/").pop();
      if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
      try {
        await fsAdapter.deleteItem(workspace, path);
        closeTabsForPath(path);
        const { tree } = await fsAdapter.getTree(workspace);
        setRoot(tree);
      } catch (err) {
        flash(
          `Delete failed: ${err instanceof Error ? err.message : "error"}`
        );
      }
    },
    [workspace, closeTabsForPath, flash]
  );

  const handleRefresh = useCallback(() => {
    if (workspace) loadTree(workspace);
  }, [workspace, loadTree]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleRun = () => {
    setOutput((prev) =>
      prev?.type === "run" && prev.message.startsWith("[devworkspace] run")
        ? null
        : {
            type: "run",
            message:
              "[devworkspace] run target not configured yet.\n→ Phase 9 adds real terminal execution.\nCurrent pane: " +
              (activePaneId ?? "none"),
          }
    );
  };

  const handleToggleLiveServer = () => {
    setLiveServerOn((prev) => {
      const next = !prev;
      setOutput({
        type: "live_server",
        message: next
          ? `[live-server] • started watching ${workspace ?? "—"}\n[devworkspace] real hot-reload wiring lands in a later phase.`
          : "[live-server] ▪ stopped",
      });
      return next;
    });
  };

  const handleSplit = (direction: SplitDirection) => {
    const target = activePaneId ?? collectPaneIds(layout)[0];
    if (!target) return;
    const newPaneId = nextPaneId();
    ensurePane(newPaneId);
    setLayout((prev) => splitPane(prev, target, direction, newPaneId));
    setActivePaneId(newPaneId);
  };

  const handleCloseActivePane = () => {
    const target = activePaneId;
    if (!target) return;
    setLayout((prev) => closePane(prev, target) ?? createPaneNode(nextPaneId()));
    setPanes((prev) => {
      const next = { ...prev };
      delete next[target];
      return next;
    });
    setActivePaneId(null);
  };

  // If no workspace chosen, show the folder picker.
  if (!workspace) {
    return <WorkspacePicker onOpen={openWorkspace} />;
  }

  const ids = collectPaneIds(layout);
  const hasSplits = ids.length > 1;
  const projectName = workspace.split(/[\\/]/).pop() || workspace;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        minHeight: 0,
        background: lab.bgDeep,
        color: lab.text,
      }}
    >
      {treeState === "ready" && root && (
        <FileTree
          root={root}
          activePath={activePaneId ? panes[activePaneId]?.activePath ?? null : null}
          onOpenFile={handleOpenFile}
          onRefresh={handleRefresh}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      )}

      {treeState === "loading" && <SidePanelPlaceholder text="Loading workspace…" />}
      {treeState === "idle" && <SidePanelPlaceholder text="—" />}
      {treeState === "error" && (
        <SidePanelPlaceholder
          text="Workspace error"
          error={treeError}
          action={{
            label: "Retry",
            onAction: () => loadTree(workspace),
          }}
        />
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <ActionBar
          projectName={projectName}
          workspacePath={workspace}
          activePaneId={activePaneId}
          hasSplits={hasSplits}
          onRun={handleRun}
          onToggleLiveServer={handleToggleLiveServer}
          liveServerOn={liveServerOn}
          onSplit={handleSplit}
          onCloseActivePane={handleCloseActivePane}
          onRefresh={handleRefresh}
        />

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <WorkspaceView
            layout={layout}
            panes={panes}
            themeMode={themeMode}
            activePaneId={activePaneId ?? ""}
            onFocusPane={(id) => setActivePaneId(id)}
            onUpdatePane={handleUpdatePane}
            onUpdateSplitRatio={(target, ratio) =>
              setLayout((prev) => updateSplitRatio(prev, target, ratio))
            }
            onContentEdited={scheduleAutosave}
            onSaveRequest={handleSaveRequest}
          />
        </div>

        {output && (
          <OutputDrawer output={output} onClose={() => setOutput(null)} />
        )}

        <div
          style={{
            height: 24,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 12px",
            background: lab.bgRaised,
            borderTop: `1px solid ${lab.border}`,
            fontSize: 11,
            color: lab.textFaint,
            fontFamily: lab.monospace,
          }}
        >
          <button
            onClick={handleToggleTheme}
            title={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: "transparent",
              color: lab.textMuted,
              cursor: "pointer",
              fontSize: 11,
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            {themeMode === "dark" ? <Moon size={12} /> : <Sun size={12} />}
            <span style={{ textTransform: "uppercase" }}>{themeMode}</span>
          </button>
          <span style={{ color: lab.textFaint }}>·</span>
          <span>panes {ids.length}</span>
          {liveServerOn && (
            <span style={{ color: lab.tealBright, display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: lab.tealBright,
                  animation: "dw-blink 1.2s infinite",
                }}
              />
              LIVE
            </span>
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={() => setWorkspace(null)}
            title="Change workspace"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: "transparent",
              color: lab.textMuted,
              cursor: "pointer",
              fontSize: 11,
              padding: 0,
              fontFamily: "inherit",
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <FolderOpen size={12} />
            <span>{workspace}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkspacePicker({ onOpen }: { onOpen: (path: string) => void }) {
  const [value, setValue] = useState("");
  const [browseOpen, setBrowseOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const recent = workspaceStore.getRecent();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer?.items;
    let isDir = false;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
          isDir = true;
          break;
        }
      }
    }
    if (isDir) {
      // Browsers hide the real filesystem path for security, so a dropped
      // folder can't be resolved to a server path here. Route through the
      // folder browser; the Electron build resolves drops directly.
      setBrowseOpen(true);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: lab.bgDeep,
        color: lab.text,
        position: "relative",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div
          style={{
            position: "absolute",
            inset: 12,
            border: `2px dashed ${lab.amber}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${lab.amber}0d`,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              color: lab.amber,
              fontFamily: lab.monospace,
              fontSize: 14,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Drop folder to open
          </span>
        </div>
      )}

      <div style={{ width: 460, maxWidth: "90%" }}>
        <div
          style={{
            fontSize: 13,
            fontFamily: lab.monospace,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: lab.amber,
            marginBottom: 6,
          }}
        >
          Open Folder
        </div>
        <div
          style={{
            fontSize: 11,
            color: lab.textMuted,
            fontFamily: lab.monospace,
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          Browse to a project folder, drop one in, or paste an absolute path. All
          folders live under the server sandbox (WORKSPACE_ROOT).
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={value}
            placeholder="D:\Workspace\devworkspace-frontend"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) onOpen(value);
            }}
            style={{
              flex: 1,
              background: lab.bgRaised,
              border: `1px solid ${lab.borderStrong}`,
              borderRadius: 6,
              color: lab.text,
              fontSize: 13,
              fontFamily: lab.monospace,
              padding: "9px 12px",
              outline: "none",
            }}
          />
          <button
            onClick={() => value.trim() && onOpen(value)}
            disabled={!value.trim()}
            style={{
              border: `1px solid ${lab.amber}`,
              background: value.trim() ? `${lab.amber}22` : "transparent",
              color: value.trim() ? lab.amber : lab.textFaint,
              borderRadius: 6,
              padding: "0 16px",
              cursor: value.trim() ? "pointer" : "not-allowed",
              fontSize: 12,
              fontFamily: lab.monospace,
              letterSpacing: "0.04em",
            }}
          >
            Open
          </button>
        </div>

        <button
          onClick={() => setBrowseOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            width: "100%",
            justifyContent: "center",
            border: `1px dashed ${lab.borderStrong}`,
            background: "transparent",
            color: lab.textMuted,
            borderRadius: 6,
            padding: "10px",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: lab.monospace,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = lab.teal;
            e.currentTarget.style.color = lab.teal;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = lab.borderStrong;
            e.currentTarget.style.color = lab.textMuted;
          }}
        >
          <FolderOpen size={13} />
          Browse folders…
        </button>

        {recent.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: lab.textFaint,
                fontFamily: lab.monospace,
                marginBottom: 8,
              }}
            >
              Recent
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {recent.map((w) => (
                <button
                  key={w}
                  onClick={() => onOpen(w)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    background: "transparent",
                    color: lab.textMuted,
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: lab.monospace,
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = lab.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <FolderOpen size={13} color={lab.amber} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {browseOpen && (
        <DirectoryBrowser onClose={() => setBrowseOpen(false)} onOpen={onOpen} />
      )}
    </div>
  );
}

function pathUp(p: string): string {
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) return p;
  parts.pop();
  return parts.join("/");
}

function DirectoryBrowser({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (path: string) => void;
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [dirs, setDirs] = useState<{ name: string; path: string }[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");

  const goTo = useCallback(async (path: string) => {
    setCurrent(path);
    setState("loading");
    setError("");
    try {
      const list = await fsAdapter.listDir(path);
      setDirs(list);
      setState("ready");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to list folders");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
                const r = await fsAdapter.getRoot();
        if (cancelled) return;
        setRootPath(r);
        await goTo(r);
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setError(
          err instanceof Error
            ? err.message
            : "Can't reach the file server. Make sure the backend is running. It serves /files behind login — if you're not signed in, the app can't open folder paths."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goTo]);

  const openThis = () => {
    if (current) {
      onOpen(current);
      onClose();
    }
  };

  const upDisabled = !current || current === rootPath;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: "94%",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          background: lab.bgRaised,
          border: `1px solid ${lab.borderStrong}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderBottom: `1px solid ${lab.border}`,
          }}
        >
          <FolderOpen size={14} color={lab.amber} />
          <span
            style={{
              fontFamily: lab.monospace,
              fontSize: 12,
              color: lab.text,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {current ?? "Select a folder"}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: lab.textFaint,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "6px 8px 0" }}>
          <button
            onClick={() => current && goTo(pathUp(current))}
            disabled={upDisabled}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "6px 8px",
              border: "none",
              background: "transparent",
              color: upDisabled ? lab.textFaint : lab.textMuted,
              cursor: upDisabled ? "not-allowed" : "pointer",
              fontSize: 12,
              fontFamily: lab.monospace,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              if (!upDisabled) e.currentTarget.style.background = lab.bgActive;
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>↑</span> Up
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 8px" }}>
          {state === "loading" && (
            <div style={{ padding: 10, color: lab.textFaint, fontFamily: lab.monospace, fontSize: 11 }}>
              loading…
            </div>
          )}
          {state === "ready" &&
            dirs.length === 0 && (
              <div style={{ padding: 10, color: lab.textFaint, fontFamily: lab.monospace, fontSize: 11 }}>
                (no subfolders)
              </div>
            )}
          {state === "ready" &&
            dirs.map((d) => (
              <button
                key={d.path}
                onClick={() => {
                  setCurrent(d.path);
                  goTo(d.path);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 8px",
                  border: "none",
                  background: "transparent",
                  color: lab.textMuted,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: lab.monospace,
                  borderRadius: 4,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = lab.bgActive;
                  e.currentTarget.style.color = lab.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = lab.textMuted;
                }}
              >
                <FolderOpen size={13} color={lab.amber} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.name}
                </span>
              </button>
            ))}
          {state === "error" && (
            <div
              style={{
                color: lab.red,
                fontFamily: lab.monospace,
                fontSize: 11,
                padding: 8,
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "10px 8px",
            borderTop: `1px solid ${lab.border}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={openThis}
            disabled={!current || state === "loading"}
            style={{
              border: `1px solid ${lab.amber}`,
              background: current ? `${lab.amber}22` : "transparent",
              color: current ? lab.amber : lab.textFaint,
              borderRadius: 6,
              padding: "7px 14px",
              cursor: current ? "pointer" : "not-allowed",
              fontSize: 12,
              fontFamily: lab.monospace,
              letterSpacing: "0.03em",
            }}
          >
            Open this folder
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanelPlaceholder({
  text,
  error,
  action,
}: {
  text: string;
  error?: string | null;
  action?: { label: string; onAction: () => void };
}) {
  return (
    <div
      style={{
        width: 232,
        flexShrink: 0,
        background: lab.bg,
        borderRight: `1px solid ${lab.border}`,
        display: "flex",
        flexDirection: "column",
        padding: 14,
        gap: 10,
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: lab.textFaint, fontFamily: lab.monospace }}>
        EXPLORER
      </span>
      <div style={{ fontSize: 12, color: lab.textMuted, fontFamily: lab.monospace, lineHeight: 1.6 }}>
        {text}
      </div>
      {error && (
        <div style={{ fontSize: 11, color: lab.red, fontFamily: lab.monospace, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}
      {action && (
        <button
          onClick={action.onAction}
          style={{
            alignSelf: "flex-start",
            border: `1px solid ${lab.amber}`,
            background: `${lab.amber}18`,
            color: lab.amber,
            borderRadius: 4,
            padding: "5px 12px",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: lab.monospace,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function OutputDrawer({
  output,
  onClose,
}: {
  output: { type: WorkspaceAction; message: string };
  onClose: () => void;
}) {
  const color = output.type === "run" ? lab.green : lab.teal;
  return (
    <div
      style={{
        height: 96,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: lab.bgDeep,
        borderTop: `1px solid ${lab.borderStrong}`,
      }}
    >
      <div
        style={{
          height: 24,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          background: lab.bgRaised,
          borderBottom: `1px solid ${lab.border}`,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: lab.textMuted,
            fontFamily: lab.monospace,
          }}
        >
          output
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          title="Close output"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            border: "none",
            background: "transparent",
            color: lab.textFaint,
            cursor: "pointer",
            borderRadius: 3,
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
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 10px",
          fontFamily: lab.monospace,
          fontSize: 11,
          lineHeight: 1.6,
          color: lab.textMuted,
          whiteSpace: "pre-wrap",
        }}
      >
        {output.message}
      </div>
    </div>
  );
}

function findEntry(root: FileEntry, path: string): FileEntry | null {
  if (root.path === path) return root;
  if (root.kind === "directory" && root.children) {
    for (const child of root.children) {
      const found = findEntry(child, path);
      if (found) return found;
    }
  }
  return null;
}

function isUnder(basePath: string, candidate: string): boolean {
  return candidate === basePath || candidate.startsWith(basePath + "/");
}

function languageFromName(name: string): string {
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    md: "markdown",
    svg: "xml",
    xml: "xml",
    py: "python",
    sql: "sql",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
  };
  return map[extension] ?? "plaintext";
}