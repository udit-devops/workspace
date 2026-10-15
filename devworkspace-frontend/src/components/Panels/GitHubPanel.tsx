import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Github, LayoutDashboard, GitCommitHorizontal, History, BookMarked, GitBranch, ChevronDown,
  FolderGit2, Check, Plus, Search, LogOut, ExternalLink, Code2, RefreshCw,
} from "lucide-react";
import { githubApi, apiErrorMessage } from "../../api/api";
import type { GitStatus } from "../../api/api";
import { workspaceStore } from "../../features/editor/services/workspaceStore";
import { gh } from "./github/theme";
import { PanelStyles, IconButton, Spinner, ToastStack, Badge } from "./github/ui";
import { useToasts } from "./github/useToasts";
import { inputStyle } from "./github/styles";
import type { Account, PanelCtx, View } from "./github/context";
import { parseGitHubRemote } from "./github/utils";
import { runGitAction } from "./github/actions";
import OverviewView from "./github/OverviewView";
import ChangesView from "./github/ChangesView";
import HistoryView from "./github/HistoryView";
import ReposView from "./github/ReposView";

interface GitHubPanelProps {
  onOpenEditor: () => void;
  onConnectionChange: (connected: boolean) => void;
}

const STATUS_POLL_MS = 5000;

export default function GitHubPanel({ onOpenEditor, onConnectionChange }: GitHubPanelProps) {
  const [view, setView] = useState<View>("overview");
  const [account, setAccount] = useState<Account | null>(null);
  const [workspace, setWorkspace] = useState<string | null>(() => workspaceStore.getWorkspace());
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const { toasts, push: toast, dismiss } = useToasts();
  const statusInFlight = useRef(false);

  /* ---------------- account ---------------- */

  const loadAccount = useCallback(() => {
    return githubApi.getStatus()
      .then((data) => {
        setAccount(data);
        onConnectionChange(data.connected);
      })
      .catch(() => setAccount({ configured: false, connected: false, login: null }));
  }, [onConnectionChange]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== "http://localhost:5000" || event.data?.provider !== "github") return;
      if (event.data.success) {
        void loadAccount();
        toast("success", "Connected to GitHub", event.data.login ? `Signed in as @${event.data.login}.` : undefined);
      } else if (event.data.error) {
        toast("error", "GitHub sign-in failed", String(event.data.error));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadAccount, toast]);

  const connect = useCallback(() => {
    window.open(githubApi.connectUrl, "github-oauth", "width=620,height=760");
  }, []);

  const disconnect = useCallback(async () => {
    if (!window.confirm("Disconnect your GitHub account from DevWorkspace?")) return;
    try {
      await githubApi.disconnect();
      toast("info", "GitHub disconnected");
    } catch (err) {
      toast("error", "Could not disconnect", apiErrorMessage(err));
    }
    void loadAccount();
  }, [loadAccount, toast]);

  /* ---------------- project + status ---------------- */

  const refreshStatus = useCallback(async () => {
    if (!workspace || statusInFlight.current) return;
    statusInFlight.current = true;
    try {
      setStatus(await githubApi.status(workspace));
      setStatusError(null);
    } catch (err) {
      setStatusError(apiErrorMessage(err, "Could not read this project's git status"));
    } finally {
      statusInFlight.current = false;
    }
  }, [workspace]);

  // Load on project change, then keep fresh while the panel is visible.
  useEffect(() => {
    if (!workspace) return;
    void refreshStatus();
    const tick = () => {
      if (document.visibilityState === "visible") void refreshStatus();
    };
    const id = setInterval(tick, STATUS_POLL_MS);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [workspace, refreshStatus]);

  const openProject = useCallback((path: string) => {
    workspaceStore.setWorkspace(path);
    setStatus(null);
    setStatusError(null);
    setWorkspace(path);
  }, []);

  const openEditor = useCallback((path?: string) => {
    if (path) workspaceStore.setWorkspace(path);
    onOpenEditor();
  }, [onOpenEditor]);

  const remote = useMemo(() => (status?.isRepo ? parseGitHubRemote(status.remote) : null), [status]);
  const bumpRevision = useCallback(() => setRevision((r) => r + 1), []);

  const ctx: PanelCtx = {
    account, connect,
    workspace, openProject, openEditor,
    status, statusError, refreshStatus, remote,
    revision, bumpRevision,
    go: setView, toast,
  };

  const changeCount = status?.isRepo ? status.files.length : 0;

  /* ---------------- render ---------------- */

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: gh.bg, overflow: "hidden", position: "relative", fontFamily: gh.font }}>
      <PanelStyles />

      <Header ctx={ctx} />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Side rail */}
        <nav style={{
          width: 212, flexShrink: 0, borderRight: `1px solid ${gh.borderSoft}`, padding: "12px 10px",
          display: "flex", flexDirection: "column", gap: 2, background: gh.bgDeep,
        }}>
          <NavItem icon={<LayoutDashboard size={15} />} label="Overview" active={view === "overview"} onClick={() => setView("overview")} />
          <NavItem
            icon={<GitCommitHorizontal size={15} />} label="Changes" active={view === "changes"} onClick={() => setView("changes")}
            badge={changeCount > 0 ? changeCount : undefined}
          />
          <NavItem icon={<History size={15} />} label="History" active={view === "history"} onClick={() => setView("history")} />
          <NavItem icon={<BookMarked size={15} />} label="Repositories" active={view === "repos"} onClick={() => setView("repos")} />

          <div style={{ flex: 1 }} />

          {remote && (
            <a href={remote.webUrl} target="_blank" rel="noreferrer" className="ghp-nav" style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8,
              color: gh.textMuted, fontSize: 12, textDecoration: "none",
            }}>
              <ExternalLink size={14} /> View on GitHub
            </a>
          )}
          <AccountCard account={account} onConnect={connect} onDisconnect={disconnect} />
        </nav>

        {/* Content */}
        <main className="ghp-scroll" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {view === "overview" && <OverviewView ctx={ctx} />}
          {view === "changes" && <ChangesView ctx={ctx} />}
          {view === "history" && <HistoryView ctx={ctx} />}
          {view === "repos" && <ReposView ctx={ctx} />}
        </main>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

/* ================================================================ header */

function Header({ ctx }: { ctx: PanelCtx }) {
  const s = ctx.status;
  const projectName = ctx.workspace?.split(/[\\/]/).filter(Boolean).pop();
  const [spinning, setSpinning] = useState(false);

  const refresh = async () => {
    setSpinning(true);
    await ctx.refreshStatus();
    ctx.bumpRevision();
    setSpinning(false);
  };

  return (
    <header style={{
      height: 52, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
      borderBottom: `1px solid ${gh.borderSoft}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: gh.surface, border: `1px solid ${gh.borderSoft}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Github size={15} color={gh.text} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 650, color: gh.text, marginRight: 6 }}>GitHub</span>

      <Divider />
      <ProjectMenu ctx={ctx} name={projectName} />
      {s?.isRepo && (
        <>
          <span style={{ color: gh.textDim }}>/</span>
          <BranchMenu ctx={ctx} />
          {(s.ahead > 0 || s.behind > 0) && (
            <span title={`${s.ahead} to push · ${s.behind} to pull`} style={{ display: "flex", gap: 6, fontSize: 11, fontFamily: gh.mono, color: gh.textMuted }}>
              {s.ahead > 0 && <span>↑{s.ahead}</span>}
              {s.behind > 0 && <span>↓{s.behind}</span>}
            </span>
          )}
        </>
      )}

      <div style={{ flex: 1 }} />

      {ctx.workspace && (
        <>
          <IconButton title="Refresh status" onClick={refresh}>
            {spinning ? <Spinner size={14} /> : <RefreshCw size={14} />}
          </IconButton>
          <IconButton title="Open project in the editor" onClick={() => ctx.openEditor()}>
            <Code2 size={15} />
          </IconButton>
        </>
      )}
    </header>
  );
}

const Divider = () => <span style={{ width: 1, height: 20, background: gh.border, margin: "0 2px" }} />;

/* ================================================================ menus */

function Popover({ trigger, children, width = 280 }: {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div className="ghp-fade" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, width, zIndex: 40,
          background: "#26262a", border: `1px solid ${gh.border}`, borderRadius: 12,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)", overflow: "hidden",
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuTrigger({ icon, label, open, onClick, title }: { icon: ReactNode; label: string; open: boolean; onClick: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} className="ghp-btn ghp-btn-ghost" style={{
      display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 9px", borderRadius: 8,
      background: open ? gh.surfaceActive : "transparent", border: "1px solid transparent",
      color: gh.text, fontSize: 12.5, fontWeight: 500, cursor: "pointer", maxWidth: 240,
    }}>
      {icon}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <ChevronDown size={13} color={gh.textFaint} />
    </button>
  );
}

function MenuItem({ children, onClick, active, icon, hint }: {
  children: ReactNode; onClick: () => void; active?: boolean; icon?: ReactNode; hint?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="ghp-row" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 12px",
      background: "transparent", border: "none", color: gh.text, fontSize: 12.5, cursor: "pointer", textAlign: "left",
    }}>
      <span style={{ width: 14, display: "flex", color: gh.accent }}>{active ? <Check size={14} /> : icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: gh.textFaint }}>{hint}</span>}
    </button>
  );
}

const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: "8px 12px 4px", fontSize: 10.5, fontWeight: 700, color: gh.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
    {children}
  </div>
);

function ProjectMenu({ ctx, name }: { ctx: PanelCtx; name?: string }) {
  const recent = workspaceStore.getRecent();
  return (
    <Popover
      width={320}
      trigger={(open, toggle) => (
        <MenuTrigger open={open} onClick={toggle} icon={<FolderGit2 size={14} color={gh.textMuted} />} label={name ?? "No project open"} title={ctx.workspace ?? undefined} />
      )}
    >
      {(close) => (
        <div style={{ padding: "4px 0" }}>
          <MenuLabel>Recent projects</MenuLabel>
          {recent.length === 0 && <div style={{ padding: "6px 12px", fontSize: 12, color: gh.textFaint }}>No recent projects yet.</div>}
          {recent.map((p) => (
            <MenuItem key={p} active={p === ctx.workspace} onClick={() => { ctx.openProject(p); close(); }} hint={undefined}>
              <span title={p}>{p.split(/[\\/]/).filter(Boolean).pop()}</span>
              <span style={{ display: "block", fontSize: 10.5, color: gh.textFaint, overflow: "hidden", textOverflow: "ellipsis" }}>{p}</span>
            </MenuItem>
          ))}
          <div style={{ height: 1, background: gh.border, margin: "4px 0" }} />
          <MenuItem icon={<Plus size={14} />} onClick={() => { ctx.go("repos"); close(); }}>Clone a repository…</MenuItem>
          <MenuItem icon={<Code2 size={14} />} onClick={() => { close(); ctx.openEditor(); }}>Open a folder in the editor…</MenuItem>
        </div>
      )}
    </Popover>
  );
}

function BranchMenu({ ctx }: { ctx: PanelCtx }) {
  const s = ctx.status;
  const [branches, setBranches] = useState<{ local: string[]; remote: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const ws = ctx.workspace;

  const load = useCallback(() => {
    if (!ws) return;
    githubApi.branches(ws).then(setBranches).catch(() => setBranches({ local: [], remote: [] }));
  }, [ws]);

  if (!s?.isRepo || !ws) return null;

  const q = query.trim().toLowerCase();
  const local = (branches?.local ?? []).filter((b) => b.toLowerCase().includes(q));
  const remoteOnly = (branches?.remote ?? [])
    .filter((r) => !branches?.local.includes(r.replace(/^origin\//, "")))
    .filter((b) => b.toLowerCase().includes(q));
  const validNew = /^[\w./-]+$/.test(query.trim()) && !query.trim().startsWith("-") && !branches?.local.includes(query.trim());

  const switchTo = async (branch: string, create: boolean, close: () => void) => {
    close();
    setBusy(true);
    await runGitAction(ctx, create ? "Create branch" : "Switch branch", () => githubApi.checkout(ws, branch, create), {
      title: create ? `Created branch ${branch}` : `Switched to ${branch.replace(/^origin\//, "")}`,
    });
    setQuery("");
    setBusy(false);
  };

  return (
    <Popover
      width={300}
      trigger={(open, toggle) => (
        <MenuTrigger
          open={open}
          onClick={() => { if (!open) load(); toggle(); }}
          icon={busy ? <Spinner size={13} /> : <GitBranch size={14} color={gh.textMuted} />}
          label={s.detached ? "detached HEAD" : s.branch}
          title="Switch or create a branch"
        />
      )}
    >
      {(close) => (
        <div>
          <div style={{ padding: 10, borderBottom: `1px solid ${gh.border}`, position: "relative" }}>
            <Search size={13} color={gh.textFaint} style={{ position: "absolute", left: 20, top: 21 }} />
            <input
              autoFocus
              className="ghp-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && validNew && local.length === 0 && remoteOnly.length === 0) void switchTo(query.trim(), true, close);
              }}
              placeholder="Find or create a branch…"
              style={{ ...inputStyle, paddingLeft: 30, height: 32 }}
            />
          </div>
          <div className="ghp-scroll" style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
            {!branches && <div style={{ padding: 12, display: "flex", gap: 8, color: gh.textFaint, fontSize: 12 }}><Spinner size={13} /> Loading branches…</div>}
            {local.length > 0 && <MenuLabel>Branches</MenuLabel>}
            {local.map((b) => (
              <MenuItem key={b} active={b === s.branch} onClick={() => b !== s.branch ? void switchTo(b, false, close) : close()}>{b}</MenuItem>
            ))}
            {remoteOnly.length > 0 && <MenuLabel>Only on GitHub</MenuLabel>}
            {remoteOnly.map((b) => (
              <MenuItem key={b} icon={<Github size={13} color={gh.textFaint} />} onClick={() => void switchTo(b, false, close)}>
                {b.replace(/^origin\//, "")}
              </MenuItem>
            ))}
            {branches && local.length === 0 && remoteOnly.length === 0 && !query && (
              <div style={{ padding: "6px 12px", fontSize: 12, color: gh.textFaint }}>No branches found.</div>
            )}
          </div>
          {query.trim() && (
            <div style={{ borderTop: `1px solid ${gh.border}`, padding: "4px 0" }}>
              {validNew ? (
                <MenuItem icon={<Plus size={14} />} onClick={() => void switchTo(query.trim(), true, close)}>
                  Create branch <b>{query.trim()}</b> from {s.branch}
                </MenuItem>
              ) : (
                <div style={{ padding: "7px 12px", fontSize: 11.5, color: gh.textFaint }}>
                  Branch names can use letters, numbers, “-”, “_”, “.” and “/”.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

/* ================================================================ rail */

function NavItem({ icon, label, active, onClick, badge }: {
  icon: ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button type="button" onClick={onClick} className="ghp-nav" style={{
      display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 10px", borderRadius: 8,
      background: active ? gh.surfaceActive : "transparent", border: "none",
      color: active ? gh.text : gh.textMuted, fontSize: 12.5, fontWeight: active ? 600 : 500, cursor: "pointer", textAlign: "left",
    }}>
      <span style={{ color: active ? gh.accent : "inherit", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && <Badge color={gh.amber} soft={gh.amberSoft}>{badge}</Badge>}
    </button>
  );
}

function AccountCard({ account, onConnect, onDisconnect }: {
  account: Account | null; onConnect: () => void; onDisconnect: () => void;
}) {
  const box: React.CSSProperties = {
    marginTop: 6, padding: 10, borderRadius: 10, background: gh.surface, border: `1px solid ${gh.borderSoft}`,
  };
  if (!account) {
    return <div style={{ ...box, display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: gh.textFaint }}><Spinner size={13} /> Checking account…</div>;
  }
  if (account.connected && account.login) {
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 9 }}>
        <img
          src={`https://github.com/${encodeURIComponent(account.login)}.png?size=64`}
          alt=""
          width={28}
          height={28}
          style={{ borderRadius: "50%", background: gh.surfaceActive, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: gh.text, overflow: "hidden", textOverflow: "ellipsis" }}>@{account.login}</div>
          <div style={{ fontSize: 10.5, color: gh.green, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: gh.green }} /> Connected
          </div>
        </div>
        <IconButton title="Disconnect GitHub" size={24} onClick={onDisconnect}><LogOut size={13} /></IconButton>
      </div>
    );
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 12, fontWeight: 600, color: gh.text, marginBottom: 3 }}>Not signed in</div>
      <div style={{ fontSize: 11, color: gh.textFaint, lineHeight: 1.45, marginBottom: account.configured ? 9 : 0 }}>
        {account.configured
          ? "Sign in to browse your repositories."
          : "GitHub sign-in isn't set up on the server. Push and pull use this computer's git login."}
      </div>
      {account.configured && (
        <button type="button" onClick={onConnect} className="ghp-btn ghp-btn-primary" style={{
          width: "100%", height: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          borderRadius: 8, border: "none", background: gh.text, color: gh.bg, fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          <Github size={13} /> Sign in with GitHub
        </button>
      )}
    </div>
  );
}
