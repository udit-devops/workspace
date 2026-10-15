import type { CSSProperties, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { gh } from "./theme";
import type { Toast } from "./useToasts";

/* ------------------------------------------------------------ styles */

/** Scoped stylesheet for hover/focus states and animations (class prefix ghp-). */
export function PanelStyles() {
  return (
    <style>{`
      @keyframes ghp-spin { to { transform: rotate(360deg); } }
      @keyframes ghp-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @keyframes ghp-pulse { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
      .ghp-spin { animation: ghp-spin .9s linear infinite; }
      .ghp-fade { animation: ghp-in .18s ease-out; }
      .ghp-skeleton { background: ${gh.surface}; border-radius: 6px; animation: ghp-pulse 1.4s ease-in-out infinite; }

      .ghp-btn { transition: background .12s, border-color .12s, color .12s, opacity .12s, transform .06s; }
      .ghp-btn:not(:disabled):active { transform: translateY(1px); }
      .ghp-btn:focus-visible, .ghp-row:focus-visible, .ghp-input:focus-visible { outline: 2px solid ${gh.accent}; outline-offset: 1px; }
      .ghp-btn-primary:not(:disabled):hover { background: #ffffff; }
      .ghp-btn-accent:not(:disabled):hover { background: #6b9dff; }
      .ghp-btn-secondary:not(:disabled):hover { background: ${gh.surfaceHover}; border-color: #4a4a50; }
      .ghp-btn-ghost:not(:disabled):hover { background: ${gh.surfaceHover}; color: ${gh.text}; }
      .ghp-btn-danger:not(:disabled):hover { background: ${gh.redSoft}; }

      .ghp-row { transition: background .1s; }
      .ghp-row:hover { background: ${gh.surfaceHover}; }
      .ghp-row[data-active="true"] { background: ${gh.surfaceActive}; }
      .ghp-row .ghp-row-actions { opacity: 0; transition: opacity .1s; }
      .ghp-row:hover .ghp-row-actions, .ghp-row[data-active="true"] .ghp-row-actions, .ghp-row:focus-within .ghp-row-actions { opacity: 1; }

      .ghp-card { transition: border-color .12s, background .12s; }
      .ghp-card-hover:hover { border-color: #48484e; background: ${gh.surfaceHover}; }

      .ghp-input { transition: border-color .12s, background .12s; }
      .ghp-input:focus { border-color: ${gh.accent}; background: ${gh.bgDeep}; }
      .ghp-input::placeholder { color: ${gh.textFaint}; }

      .ghp-nav { transition: background .12s, color .12s; }
      .ghp-nav:hover { background: ${gh.surfaceHover}; color: ${gh.text}; }

      .ghp-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
      .ghp-scroll::-webkit-scrollbar-thumb { background: #3a3a3f; border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
      .ghp-scroll::-webkit-scrollbar-track { background: transparent; }
    `}</style>
  );
}

/* ------------------------------------------------------------ buttons */

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";

export function Button({
  children, icon, onClick, disabled, loading, variant = "secondary", size = "md", title, style, type = "button",
}: {
  children?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  title?: string;
  style?: CSSProperties;
  type?: "button" | "submit";
}) {
  const palette: Record<Variant, CSSProperties> = {
    primary: { background: gh.text, color: gh.bg, border: "1px solid transparent", fontWeight: 600 },
    accent: { background: gh.accent, color: "#fff", border: "1px solid transparent", fontWeight: 600 },
    secondary: { background: gh.surface, color: gh.text, border: `1px solid ${gh.border}` },
    ghost: { background: "transparent", color: gh.textMuted, border: "1px solid transparent" },
    danger: { background: "transparent", color: gh.red, border: `1px solid ${gh.redSoft}` },
  };
  const sizes = {
    sm: { height: 26, padding: "0 9px", fontSize: 11.5, gap: 5, borderRadius: 7 },
    md: { height: 32, padding: "0 12px", fontSize: 12.5, gap: 7, borderRadius: 8 },
    lg: { height: 38, padding: "0 16px", fontSize: 13, gap: 8, borderRadius: 10 },
  }[size];
  const off = disabled || loading;
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={off}
      className={`ghp-btn ghp-btn-${variant}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        whiteSpace: "nowrap", cursor: off ? "not-allowed" : "pointer",
        opacity: disabled && !loading ? 0.42 : 1, fontFamily: gh.font,
        ...palette[variant], ...sizes, ...style,
      }}
    >
      {loading ? <Spinner size={size === "sm" ? 12 : 14} /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  children, title, onClick, disabled, active, size = 26,
}: {
  children: ReactNode;
  title: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="ghp-btn ghp-btn-ghost"
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? gh.surfaceActive : "transparent",
        border: "1px solid transparent", color: active ? gh.text : gh.textFaint,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 14, color }: { size?: number; color?: string }) {
  return <Loader2 size={size} className="ghp-spin" color={color} />;
}

/* ------------------------------------------------------------ display */

export function Badge({ children, color = gh.textMuted, soft = gh.surface, title, mono }: {
  children: ReactNode; color?: string; soft?: string; title?: string; mono?: boolean;
}) {
  return (
    <span title={title} style={{
      display: "inline-flex", alignItems: "center", gap: 4, height: 20, padding: "0 7px",
      borderRadius: 999, background: soft, color, fontSize: 10.5, fontWeight: 600,
      fontFamily: mono ? gh.mono : gh.font, whiteSpace: "nowrap", letterSpacing: mono ? 0 : "0.01em",
    }}>
      {children}
    </span>
  );
}

export function Card({ children, style, hover, onClick }: {
  children: ReactNode; style?: CSSProperties; hover?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`ghp-card${hover ? " ghp-card-hover" : ""}`}
      style={{
        background: gh.surface, border: `1px solid ${gh.borderSoft}`, borderRadius: 12,
        cursor: onClick ? "pointer" : undefined, ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, count, right }: { children: ReactNode; count?: number; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 26 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: gh.textFaint, textTransform: "uppercase", letterSpacing: "0.09em" }}>
        {children}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 10.5, color: gh.textMuted, background: gh.surfaceActive, borderRadius: 999, padding: "1px 7px" }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, body, actions, compact }: {
  icon: ReactNode; title: string; body?: ReactNode; actions?: ReactNode; compact?: boolean;
}) {
  return (
    <div className="ghp-fade" style={{ textAlign: "center", padding: compact ? "28px 16px" : "56px 24px", maxWidth: 440, margin: "0 auto" }}>
      <div style={{
        width: compact ? 40 : 52, height: compact ? 40 : 52, borderRadius: 14, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: gh.surface, border: `1px solid ${gh.borderSoft}`, color: gh.textMuted,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: compact ? 13 : 15, fontWeight: 600, color: gh.text, marginBottom: 6 }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: gh.textFaint, lineHeight: 1.65 }}>{body}</div>}
      {actions && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

export function Callout({ tone = "info", title, children, action }: {
  tone?: "info" | "warn" | "error" | "success"; title?: ReactNode; children?: ReactNode; action?: ReactNode;
}) {
  const t = {
    info: { c: gh.accent, s: gh.accentSoft, i: <Info size={14} /> },
    warn: { c: gh.amber, s: gh.amberSoft, i: <AlertTriangle size={14} /> },
    error: { c: gh.red, s: gh.redSoft, i: <AlertTriangle size={14} /> },
    success: { c: gh.green, s: gh.greenSoft, i: <CheckCircle2 size={14} /> },
  }[tone];
  return (
    <div className="ghp-fade" style={{
      display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: gh.radius,
      background: t.s, border: `1px solid ${t.c}33`,
    }}>
      <span style={{ color: t.c, marginTop: 1, flexShrink: 0 }}>{t.i}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.55, color: gh.textMuted }}>
        {title && <div style={{ color: gh.text, fontWeight: 600, marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd style={{
      fontFamily: gh.mono, fontSize: 10, padding: "1px 5px", borderRadius: 4,
      border: `1px solid ${gh.border}`, background: gh.bgDeep, color: gh.textMuted,
    }}>
      {children}
    </kbd>
  );
}



/* ------------------------------------------------------------ toasts */

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: "absolute", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 50, width: 340 }}>
      {toasts.map((t) => {
        const c = t.tone === "success" ? gh.green : t.tone === "error" ? gh.red : gh.accent;
        return (
          <div key={t.id} role="status" className="ghp-fade" style={{
            display: "flex", gap: 10, padding: "11px 12px", borderRadius: 12,
            background: "#26262a", border: `1px solid ${gh.border}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          }}>
            <span style={{ color: c, marginTop: 1 }}>
              {t.tone === "success" ? <CheckCircle2 size={15} /> : t.tone === "error" ? <AlertTriangle size={15} /> : <Info size={15} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: gh.text }}>{t.title}</div>
              {t.body && (
                <div style={{
                  fontSize: 11.5, color: gh.textMuted, marginTop: 3, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 120, overflow: "auto",
                }}>
                  {t.body}
                </div>
              )}
            </div>
            <IconButton title="Dismiss" size={22} onClick={() => onDismiss(t.id)}><X size={12} /></IconButton>
          </div>
        );
      })}
    </div>
  );
}
