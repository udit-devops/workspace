import { useState } from "react";
import { ExternalLink, Globe, RotateCw, X } from "lucide-react";
import { lab } from "../styles/tokens";

interface PreviewPanelProps {
  /** Session base URL, ends with "/". */
  baseUrl: string;
  /** Entry file relative to the workspace root, e.g. "index.html". */
  entry: string;
  /** Bumped by the editor (e.g. after a save with Live on) to reload the page. */
  version: number;
  live: boolean;
  onClose: () => void;
}

/**
 * Renders a workspace's static site from the backend preview server.
 *
 * The server already sends a CSP sandbox; the iframe sandbox repeats it as
 * defense in depth. Neither grants allow-same-origin, so previewed code runs
 * in an opaque origin with no access to the app or its cookies.
 */
export default function PreviewPanel({ baseUrl, entry, version, live, onClose }: PreviewPanelProps) {
  const [nonce, setNonce] = useState(0);
  const src = baseUrl + entry.split("/").map(encodeURIComponent).join("/");

  return (
    <div
      style={{
        flex: "0 0 45%",
        minWidth: 320,
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${lab.borderStrong}`,
        background: lab.bg,
      }}
    >
      <div
        style={{
          height: 30,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 8px",
          background: lab.bgRaised,
          borderBottom: `1px solid ${lab.border}`,
          fontFamily: lab.monospace,
          fontSize: 11,
        }}
      >
        <Globe size={12} color={live ? lab.tealBright : lab.textMuted} />
        <span
          title={src}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "3px 8px",
            borderRadius: 4,
            background: lab.bgDeep,
            border: `1px solid ${lab.border}`,
            color: lab.textMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          /{entry}
        </span>
        {live && (
          <span style={{ color: lab.tealBright, fontSize: 10, letterSpacing: "0.08em" }}>LIVE</span>
        )}
        <HeaderButton title="Reload preview" onClick={() => setNonce((n) => n + 1)}>
          <RotateCw size={12} />
        </HeaderButton>
        <HeaderButton title="Open in browser" onClick={() => window.open(src, "_blank", "noopener,noreferrer")}>
          <ExternalLink size={12} />
        </HeaderButton>
        <HeaderButton title="Close preview" onClick={onClose}>
          <X size={12} />
        </HeaderButton>
      </div>
      <iframe
        key={`${src}#${version}.${nonce}`}
        src={src}
        title={`Preview of ${entry}`}
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
        referrerPolicy="no-referrer"
        style={{ flex: 1, width: "100%", border: "none", background: "#ffffff" }}
      />
    </div>
  );
}

function HeaderButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: 4,
        background: "transparent",
        color: lab.textMuted,
        cursor: "pointer",
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
      {children}
    </button>
  );
}
