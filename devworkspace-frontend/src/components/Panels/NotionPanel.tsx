import { useState, useRef, useCallback } from "react";
import {
  BookOpen, ExternalLink, Plus, FileText, LogOut, RefreshCw,
  Loader, Trash2, Type, Heading1, Heading2, Heading3, Code, Quote,
  List, CheckSquare,
} from "lucide-react";
import { notionApi } from "../../api/api";

interface Block {
  id: string;
  type: string;
  text: string;
}

interface PageContent {
  id: string;
  title: string;
  blocks: Block[];
}

interface NotionPanelProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  pages?: { id: string; title: string }[];
  selectedPage?: PageContent | null;
  onSelectPage: (id: string) => void;
  pageLoading?: boolean;
}

const blockTypes = [
  { value: "paragraph", label: "Text", icon: <Type size={12} /> },
  { value: "heading_1", label: "Heading 1", icon: <Heading1 size={12} /> },
  { value: "heading_2", label: "Heading 2", icon: <Heading2 size={12} /> },
  { value: "heading_3", label: "Heading 3", icon: <Heading3 size={12} /> },
  { value: "code", label: "Code", icon: <Code size={12} /> },
  { value: "quote", label: "Quote", icon: <Quote size={12} /> },
  { value: "bulleted_list_item", label: "Bullet list", icon: <List size={12} /> },
  { value: "numbered_list_item", label: "Numbered list", icon: <List size={12} /> },
  { value: "to_do", label: "To-do", icon: <CheckSquare size={12} /> },
];

function blockStyle(type: string): React.CSSProperties {
  if (type.startsWith("heading_1")) return { fontSize: 20, fontWeight: 700, color: "#f5f5f7", marginBottom: 8, marginTop: 16 };
  if (type.startsWith("heading_2")) return { fontSize: 16, fontWeight: 600, color: "#f5f5f7", marginBottom: 6, marginTop: 12 };
  if (type.startsWith("heading_3")) return { fontSize: 14, fontWeight: 600, color: "#aeaeb2", marginBottom: 4, marginTop: 8 };
  if (type === "code") return { fontSize: 12, fontFamily: "monospace", background: "#2c2c2e", padding: "10px 14px", borderRadius: 8, color: "#aeaeb2", lineHeight: 1.6, whiteSpace: "pre-wrap" as const };
  if (type === "quote") return { fontSize: 13, color: "#8e8e93", borderLeft: "2px solid #5b6af0", paddingLeft: 12, fontStyle: "italic" };
  if (type === "divider") return { height: 0, borderTop: "0.5px solid #3a3a3c", margin: "12px 0" };
  if (type === "to_do") return { fontSize: 13, color: "#aeaeb2" };
  return { fontSize: 13, color: "#aeaeb2", lineHeight: 1.7 };
}

function BlockEditor({ block, onSave, onDelete, onAddBelow }: {
  block: Block;
  onSave: (id: string, text: string, type: string) => void;
  onDelete: (id: string) => void;
  onAddBelow: (afterId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(block.text);
  const [currentType, setCurrentType] = useState(block.type);
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const save = useCallback(() => {
    if (text !== block.text || currentType !== block.type) {
      onSave(block.id, text, currentType);
    }
    setEditing(false);
  }, [text, currentType, block.id, block.text, block.type, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setText(block.text);
      setCurrentType(block.type);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div style={{ marginBottom: 4 }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          autoFocus
          rows={currentType === "code" ? 4 : 1}
          style={{
            width: "100%",
            background: "#2c2c2e",
            border: "0.5px solid #5b6af0",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: currentType.startsWith("heading") ? (currentType === "heading_1" ? 20 : currentType === "heading_2" ? 16 : 14) : 13,
            fontWeight: currentType.startsWith("heading") ? (currentType === "heading_1" ? 700 : 600) : 400,
            fontFamily: currentType === "code" ? "monospace" : "Inter, -apple-system, sans-serif",
            color: "#f5f5f7",
            outline: "none",
            resize: "none",
            lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {blockTypes.map(bt => (
            <button
              key={bt.value}
              onClick={() => setCurrentType(bt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 6,
                background: currentType === bt.value ? "#5b6af0" : "#3a3a3c",
                border: "none", color: "#f5f5f7",
                fontSize: 10, cursor: "pointer",
              }}
            >
              {bt.icon} {bt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: currentType === "divider" ? 0 : 2, position: "relative" }}
    >
      {hover && (
        <div style={{ display: "flex", gap: 2, flexShrink: 0, marginTop: 4 }}>
          <button
            onClick={() => onAddBelow(block.id)}
            title="Insert block below"
            style={{
              width: 20, height: 20, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#3a3a3c", border: "none", color: "#aeaeb2",
              cursor: "pointer", fontSize: 10,
            }}
          >
            <Plus size={10} />
          </button>
          <button
            onClick={() => onDelete(block.id)}
            title="Delete block"
            style={{
              width: 20, height: 20, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", color: "#ff453a",
              cursor: "pointer", fontSize: 10,
            }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
      {!hover && <div style={{ width: 44 }} />}
      <button
        onClick={() => { setEditing(true); setText(block.text); setCurrentType(block.type); setTimeout(() => inputRef.current?.focus(), 0); }}
        style={{
          flex: 1, textAlign: "left", cursor: "text",
          background: "transparent", border: "none",
          padding: "2px 4px", borderRadius: 4,
          transition: "background 0.1s",
          ...blockStyle(currentType),
        }}
      >
        {block.text || <span style={{ color: "#3a3a3c" }}>Empty</span>}
      </button>
    </div>
  );
}

export default function NotionPanel({
  isConnected, onConnect, onDisconnect, onRefresh, pages = [],
  selectedPage, onSelectPage, pageLoading = false,
}: NotionPanelProps) {
  const [addingBlock, setAddingBlock] = useState(false);

  const handleSaveBlock = useCallback(async (blockId: string, text: string, type: string) => {
    try {
      await notionApi.updateBlock(blockId, text, type);
      onSelectPage(selectedPage!.id);
    } catch {}
  }, [selectedPage, onSelectPage]);

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    try {
      await notionApi.deleteBlock(blockId);
      onSelectPage(selectedPage!.id);
    } catch {}
  }, [selectedPage, onSelectPage]);

  const handleAddBelow = useCallback(async (_afterId: string) => {
    if (!selectedPage) return;
    setAddingBlock(true);
    try {
      await notionApi.addBlocks(selectedPage.id, [{ type: "paragraph", text: "" }]);
      onSelectPage(selectedPage.id);
    } catch {}
    setAddingBlock(false);
  }, [selectedPage, onSelectPage]);

  const handleNewPage = useCallback(async () => {
    const title = prompt("New page title:");
    if (!title || !selectedPage) return;
    try {
      await notionApi.createPage(selectedPage.id, title);
      onRefresh();
    } catch {}
  }, [selectedPage, onRefresh]);

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
          <button onClick={onConnect} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12,
            background: "#f5f5f7", color: "#1c1c1e",
            border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
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
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={onRefresh} title="Refresh" style={{
              width: 24, height: 24, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", color: "#636366", cursor: "pointer",
            }}>
              <RefreshCw size={13} />
            </button>
            <button onClick={handleNewPage} title="New page" style={{
              width: 24, height: 24, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", color: "#636366", cursor: "pointer",
            }}>
              <Plus size={13} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {pages.length === 0 ? (
            <p style={{ fontSize: 11, color: "#48484a", padding: "8px 16px" }}>No pages found.</p>
          ) : pages.map(page => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 16px",
                background: selectedPage?.id === page.id ? "#2c2c2e" : "transparent",
                border: "none", color: "#8e8e93", fontSize: 12, cursor: "pointer", textAlign: "left",
                transition: "background 0.1s",
              }}
            >
              <FileText size={13} style={{ color: "#48484a", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.title}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "8px 12px", borderTop: "0.5px solid #3a3a3c" }}>
          <button onClick={onDisconnect} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8,
            background: "transparent", border: "none",
            color: "#ff453a", fontSize: 11, cursor: "pointer",
          }}>
            <LogOut size={12} />
            Disconnect
          </button>
        </div>
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          flex: 1, overflowY: "auto", padding: selectedPage ? "24px 32px" : 0,
        }}>
          {pageLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 48, color: "#636366", fontSize: 12, justifyContent: "center" }}>
              <Loader size={14} />
              Loading page...
            </div>
          ) : selectedPage ? (
            <div style={{ maxWidth: 700, width: "100%", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.02em", flex: 1 }}>
                  {selectedPage.title}
                </h1>
              </div>
              {selectedPage.blocks.length === 0 ? (
                <p style={{ fontSize: 13, color: "#636366", marginBottom: 12 }}>This page is empty.</p>
              ) : (
                selectedPage.blocks.map(block => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onSave={handleSaveBlock}
                    onDelete={handleDeleteBlock}
                    onAddBelow={handleAddBelow}
                  />
                ))
              )}
              <button
                onClick={() => handleAddBelow(selectedPage.blocks[selectedPage.blocks.length - 1]?.id || "_end")}
                disabled={addingBlock}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  background: "transparent", border: "0.5px dashed #3a3a3c",
                  color: "#636366", fontSize: 11, cursor: "pointer", marginTop: 8,
                }}
              >
                <Plus size={11} />
                Add block
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <BookOpen size={20} style={{ color: "#3a3a3c", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 12, color: "#48484a" }}>Select a page from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
