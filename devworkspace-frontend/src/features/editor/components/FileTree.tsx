import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  RefreshCw,
  FolderPlus,
  Trash2,
} from "lucide-react";
import type { FileEntry } from "../types";
import { lab } from "../styles/tokens";

interface FileTreeProps {
  root: FileEntry;
  activePath: string | null;
  onOpenFile: (path: string) => void;
  onRefresh: () => void;
  onCreate: (parentPath: string, name: string, kind: "file" | "directory") => void;
  onDelete: (path: string) => void;
  defaultExpanded?: string[];
}

interface CreatingState {
  parentPath: string;
  kind: "file" | "directory";
}

interface MenuState {
  path: string;
  kind: "file" | "directory";
  x: number;
  y: number;
}

function FileIcon({ entry }: { entry: FileEntry }) {
  const name = entry.name.toLowerCase();
  if (name.endsWith(".json")) return <FileJson size={14} color={lab.textMuted} />;
  if (name.endsWith(".md")) return <FileText size={14} color={lab.textMuted} />;
  if (/\.(ts|tsx|js|jsx|mjs|cjs|css|scss|html|vue|svelte)$/.test(name)) {
    return <FileCode size={14} color={lab.textMuted} />;
  }
  return <File size={14} color={lab.textFaint} />;
}

const IconButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button
    title={title}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      height: 20,
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
    {children}
  </button>
);

function ContextMenu({
  menu,
  onClose,
  onCreate,
  onDelete,
}: {
  menu: MenuState;
  onClose: () => void;
  onCreate: (kind: "file" | "directory") => void;
  onDelete: (path: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const closeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", closeKey);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", closeKey);
    };
  }, [onClose]);

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    border: "none",
    background: "transparent",
    color: lab.text,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: lab.monospace,
    borderRadius: 4,
    width: "100%",
    textAlign: "left",
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        minWidth: 170,
        zIndex: 200,
        background: lab.bgRaised,
        border: `1px solid ${lab.borderStrong}`,
        borderRadius: 6,
        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        padding: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {menu.kind === "directory" && (
        <>
          <button
            style={itemStyle}
            onClick={() => {
              onCreate("file");
              onClose();
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = lab.bgActive)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FilePlus size={13} color={lab.textMuted} />
            New File
          </button>
          <button
            style={itemStyle}
            onClick={() => {
              onCreate("directory");
              onClose();
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = lab.bgActive)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FolderPlus size={13} color={lab.textMuted} />
            New Folder
          </button>
          <div style={{ height: 1, background: lab.border, margin: "4px 0" }} />
        </>
      )}
      <button
        style={{ ...itemStyle, color: lab.red }}
        onClick={() => {
          onDelete(menu.path);
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = lab.bgActive)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

interface TreeRowProps {
  entry: FileEntry;
  depth: number;
  activePath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
  onOpenMenu: (path: string, kind: "file" | "directory", x: number, y: number) => void;
  creating: CreatingState | null;
  onCreateInput: (parentPath: string, name: string) => void;
  onCancelCreate: () => void;
}

function CreateInput({
  depth,
  kind,
  onSubmit,
  onCancel,
}: {
  depth: number;
  kind: "file" | "directory";
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        paddingLeft: 30 + depth * 12,
        paddingRight: 8,
      }}
    >
      {kind === "directory" ? (
        <Folder size={14} color={lab.amber} />
      ) : (
        <File size={14} color={lab.textFaint} />
      )}
      <input
        ref={inputRef}
        autoFocus
        value={name}
        placeholder={kind === "directory" ? "folder name" : "file name"}
        onChange={(e) => setName(e.target.value)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onCancel();
        }}
        style={{
          flex: 1,
          background: lab.bgDeep,
          border: `1px solid ${lab.amber}`,
          borderRadius: 3,
          color: lab.text,
          fontSize: 12,
          fontFamily: lab.monospace,
          padding: "1px 6px",
          outline: "none",
        }}
      />
    </div>
  );
}

function TreeRow({
  entry,
  depth,
  activePath,
  expanded,
  onToggle,
  onOpenFile,
  onOpenMenu,
  creating,
  onCreateInput,
  onCancelCreate,
}: TreeRowProps) {
  const isDirectory = entry.kind === "directory";
  const isExpanded = expanded.has(entry.path);
  const isActive = entry.path === activePath;
  const isCreatingHere = creating?.parentPath === entry.path;

  const handleClick = () => {
    if (isDirectory) {
      if (isCreatingHere) return;
      onToggle(entry.path);
    } else {
      onOpenFile(entry.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenMenu(entry.path, entry.kind, e.clientX, e.clientY);
  };

  const submitCreate = (name: string) => {
    onCreateInput(entry.path, name);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        title={entry.path}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 24,
          paddingLeft: 8 + depth * 12,
          paddingRight: 8,
          cursor: "pointer",
          userSelect: "none",
          background: isActive ? lab.bgActive : "transparent",
          color: isActive ? lab.text : lab.textMuted,
          fontSize: 12,
          fontFamily: lab.monospace,
          whiteSpace: "nowrap",
          borderLeft: isActive ? `2px solid ${lab.amber}` : "2px solid transparent",
          transition: "background 0.1s ease",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = lab.bgHover;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {isDirectory ? (
          <>
            <ChevronRight
              size={12}
              color={lab.textFaint}
              style={{
                flexShrink: 0,
                transform: isExpanded ? "rotate(90deg)" : "none",
                transition: "transform 0.12s ease",
              }}
            />
            {isExpanded ? (
              <FolderOpen size={14} color={lab.amber} />
            ) : (
              <Folder size={14} color={lab.amber} />
            )}
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <FileIcon entry={entry} />
          </>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
          {entry.name}
        </span>
      </div>

      {isCreatingHere && (
        <CreateInput
          depth={depth}
          kind={creating!.kind}
          onSubmit={submitCreate}
          onCancel={onCancelCreate}
        />
      )}

      {isDirectory &&
        isExpanded &&
        entry.children?.map((child) => (
          <TreeRow
            key={child.path}
            entry={child}
            depth={depth + 1}
            activePath={activePath}
            expanded={expanded}
            onToggle={onToggle}
            onOpenFile={onOpenFile}
            onOpenMenu={onOpenMenu}
            creating={creating}
            onCreateInput={onCreateInput}
            onCancelCreate={onCancelCreate}
          />
        ))}
    </>
  );
}

export default function FileTree({
  root,
  activePath,
  onOpenFile,
  onRefresh,
  onCreate,
  onDelete,
  defaultExpanded = [],
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([root.path, ...defaultExpanded])
  );
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(root.path);
      return next;
    });
  }, [root.path]);

  useEffect(() => {
    if (creating) {
      setExpanded((prev) => new Set(prev).add(creating.parentPath));
    }
  }, [creating]);

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCreateInput = (parentPath: string, name: string) => {
    if (!creating) return;
    onCreate(parentPath, name, creating.kind);
    setCreating(null);
  };

  return (
    <div
      style={{
        width: 232,
        flexShrink: 0,
        background: lab.bg,
        borderRight: `1px solid ${lab.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 34,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 8px 0 12px",
          borderBottom: `1px solid ${lab.border}`,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: lab.textFaint,
          fontFamily: lab.monospace,
          background: lab.bgRaised,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: lab.teal,
            opacity: 0.8,
          }}
        />
        <span>EXPLORER</span>
        <div style={{ flex: 1 }} />
        <IconButton title="New file" onClick={() => setCreating({ parentPath: root.path, kind: "file" })}>
          <FilePlus size={13} />
        </IconButton>
        <IconButton title="New folder" onClick={() => setCreating({ parentPath: root.path, kind: "directory" })}>
          <FolderPlus size={13} />
        </IconButton>
        <IconButton title="Refresh" onClick={onRefresh}>
          <RefreshCw size={13} />
        </IconButton>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        <TreeRow
          entry={root}
          depth={0}
          activePath={activePath}
          expanded={expanded}
          onToggle={handleToggle}
          onOpenFile={onOpenFile}
          onOpenMenu={(path, kind, x, y) => {
            setMenu(path === root.path ? null : { path, kind, x, y });
          }}
creating={creating}
            onCreateInput={handleCreateInput}
            onCancelCreate={() => setCreating(null)}
          />
      </div>

      {creating && creating.parentPath === root.path && (
        <CreateInput
          depth={0}
          kind={creating.kind}
          onSubmit={(name) => handleCreateInput(root.path, name)}
          onCancel={() => setCreating(null)}
        />
      )}

      {menu && (
        <ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onCreate={(kind) => setCreating({ parentPath: menu.path, kind })}
          onDelete={(path) => {
            setMenu(null);
            onDelete(path);
          }}
        />
      )}
    </div>
  );
}