import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileCode2, FileText, FileJson, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { gh } from "./theme";
import { parseUnifiedDiff, splitPath } from "./utils";
import type { DiffFile } from "./utils";
import { Badge, EmptyState } from "./ui";

export function FileTypeIcon({ path, size = 14 }: { path: string; size?: number }) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "avif", "bmp"].includes(ext)) return <ImageIcon size={size} color="#c084fc" />;
  if (["json", "jsonc"].includes(ext)) return <FileJson size={size} color="#fbbf24" />;
  if (["md", "txt", "mdx", "rst"].includes(ext)) return <FileText size={size} color={gh.textMuted} />;
  const colors: Record<string, string> = {
    ts: "#3b82f6", tsx: "#3b82f6", js: "#facc15", jsx: "#facc15", mjs: "#facc15",
    html: "#f97316", htm: "#f97316", css: "#a78bfa", scss: "#ec4899",
    py: "#60a5fa", java: "#f59e0b", go: "#22d3ee", rs: "#fb923c", php: "#818cf8",
  };
  if (colors[ext]) return <FileCode2 size={size} color={colors[ext]} />;
  return <FileIcon size={size} color={gh.textFaint} />;
}

export function DiffStat({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 8, fontFamily: gh.mono, fontSize: 11 }}>
      <span style={{ color: gh.green }}>+{additions}</span>
      <span style={{ color: gh.red }}>−{deletions}</span>
    </span>
  );
}

/** Renders unified diff text as numbered, colour-coded files. */
export default function DiffViewer({ text, tooLarge, fallbackPath, emptyHint }: {
  text: string;
  tooLarge?: boolean;
  fallbackPath?: string;
  emptyHint?: string;
}) {
  const files = useMemo(() => parseUnifiedDiff(text, fallbackPath), [text, fallbackPath]);

  if (tooLarge) {
    return <EmptyState compact icon={<FileText size={18} />} title="This diff is too large to show" body="Open the file in the editor to review it." />;
  }
  if (files.length === 0) {
    return <EmptyState compact icon={<FileText size={18} />} title="No text changes" body={emptyHint ?? "This change only affects file mode or a binary file."} />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {files.map((f, i) => <DiffFileView key={`${f.path}-${i}`} file={f} />)}
    </div>
  );
}

function DiffFileView({ file }: { file: DiffFile }) {
  const [open, setOpen] = useState(true);
  const { name, dir } = splitPath(file.path);
  const statusBadge = {
    added: <Badge color={gh.green} soft={gh.greenSoft}>New</Badge>,
    deleted: <Badge color={gh.red} soft={gh.redSoft}>Deleted</Badge>,
    renamed: <Badge color={gh.accent} soft={gh.accentSoft} title={file.oldPath}>Renamed</Badge>,
    modified: null,
  }[file.status];

  return (
    <div style={{ border: `1px solid ${gh.borderSoft}`, borderRadius: 10, overflow: "hidden", background: gh.bgDeep }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ghp-row"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: gh.surface, border: "none", borderBottom: open ? `1px solid ${gh.borderSoft}` : "none",
          cursor: "pointer", textAlign: "left", position: "sticky", top: 0, zIndex: 1,
        }}
      >
        {open ? <ChevronDown size={13} color={gh.textFaint} /> : <ChevronRight size={13} color={gh.textFaint} />}
        <FileTypeIcon path={file.path} />
        <span style={{ fontSize: 12.5, color: gh.text, fontWeight: 500 }}>{name}</span>
        {dir && <span style={{ fontSize: 11.5, color: gh.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dir}</span>}
        {statusBadge}
        <div style={{ flex: 1 }} />
        <DiffStat additions={file.additions} deletions={file.deletions} />
      </button>

      {open && (
        file.binary || file.hunks.length === 0 ? (
          <div style={{ padding: "12px 14px", fontSize: 12, color: gh.textFaint }}>
            {file.binary ? "Binary file changed." : "No text changes."}
          </div>
        ) : (
          <div className="ghp-scroll" style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: gh.mono, fontSize: 12, lineHeight: "20px" }}>
              <tbody>
                {file.hunks.map((h, hi) => (
                  <HunkRows key={hi} header={h.header} lines={h.lines} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function HunkRows({ header, lines }: { header: string; lines: DiffFile["hunks"][number]["lines"] }) {
  const gutter: React.CSSProperties = {
    width: 1, minWidth: 44, padding: "0 8px", textAlign: "right", color: gh.textDim,
    userSelect: "none", verticalAlign: "top", fontSize: 11,
  };
  return (
    <>
      <tr>
        <td colSpan={3} style={{ padding: "4px 12px", color: "#7aa2ff", background: "rgba(79,140,255,0.07)", fontSize: 11 }}>
          {header}
        </td>
      </tr>
      {lines.map((l, i) => {
        const bg = l.kind === "add" ? "rgba(52,199,89,0.12)" : l.kind === "del" ? "rgba(255,90,82,0.12)" : "transparent";
        const gutterBg = l.kind === "add" ? "rgba(52,199,89,0.18)" : l.kind === "del" ? "rgba(255,90,82,0.18)" : "transparent";
        const color = l.kind === "add" ? "#a6f4b5" : l.kind === "del" ? "#ffb4ae" : l.kind === "note" ? gh.textFaint : "#c9c9d1";
        const sign = l.kind === "add" ? "+" : l.kind === "del" ? "−" : " ";
        return (
          <tr key={i} style={{ background: bg }}>
            <td style={{ ...gutter, background: gutterBg }}>{l.oldNo ?? ""}</td>
            <td style={{ ...gutter, background: gutterBg, borderRight: `1px solid ${gh.borderSoft}` }}>{l.newNo ?? ""}</td>
            <td style={{ padding: "0 12px", color, whiteSpace: "pre", fontStyle: l.kind === "note" ? "italic" : undefined }}>
              <span style={{ display: "inline-block", width: 14, color: gh.textDim, userSelect: "none" }}>{sign}</span>
              {l.text || " "}
            </td>
          </tr>
        );
      })}
    </>
  );
}
