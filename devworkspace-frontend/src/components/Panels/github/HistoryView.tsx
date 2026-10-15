import { useEffect, useMemo, useState } from "react";
import { GitCommitHorizontal, Copy, Check, ExternalLink, Search, History as HistoryIcon, FolderOpen } from "lucide-react";
import { githubApi, apiErrorMessage } from "../../../api/api";
import type { GitCommitInfo } from "../../../api/api";
import type { PanelCtx } from "./context";
import { gh } from "./theme";
import { Badge, Button, Callout, EmptyState, IconButton, Spinner } from "./ui";
import { inputStyle } from "./styles";
import { parseUnifiedDiff, relativeTime } from "./utils";
import DiffViewer, { DiffStat } from "./DiffViewer";

export default function HistoryView({ ctx }: { ctx: PanelCtx }) {
  const ws = ctx.workspace;
  const isRepo = Boolean(ctx.status?.isRepo);
  const [commits, setCommits] = useState<GitCommitInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!ws || !isRepo) return;
    let cancelled = false;
    githubApi.log(ws, 100)
      .then((c) => { if (!cancelled) { setCommits(c); setError(null); } })
      .catch((err) => { if (!cancelled) setError(apiErrorMessage(err, "Couldn't load history")); });
    return () => { cancelled = true; };
  }, [ws, isRepo, ctx.revision]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!commits || !q) return commits ?? [];
    return commits.filter((c) => c.subject.toLowerCase().includes(q) || c.author.toLowerCase().includes(q) || c.shortHash.startsWith(q));
  }, [commits, query]);

  if (!ws) {
    return <EmptyState icon={<FolderOpen size={22} />} title="No project open" body="Open or clone a project to see its commit history." actions={<Button onClick={() => ctx.go("repos")}>Clone repository</Button>} />;
  }
  if (ctx.status && !isRepo) {
    return <EmptyState icon={<HistoryIcon size={22} />} title="No history yet" body="This folder isn't a git repository, so there are no commits to show." />;
  }

  const selected = filtered.find((c) => c.hash === picked) ?? filtered[0] ?? null;

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      {/* list */}
      <div style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${gh.borderSoft}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${gh.borderSoft}`, position: "relative" }}>
          <Search size={13} color={gh.textFaint} style={{ position: "absolute", left: 23, top: 23 }} />
          <input
            className="ghp-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by message, author or hash"
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <div className="ghp-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {error && <div style={{ padding: 12 }}><Callout tone="error">{error}</Callout></div>}
          {!error && !commits && (
            <div style={{ padding: 16, display: "flex", gap: 8, color: gh.textFaint, fontSize: 12 }}><Spinner size={13} /> Loading history…</div>
          )}
          {commits && filtered.length === 0 && (
            <EmptyState compact icon={<GitCommitHorizontal size={18} />} title={commits.length ? "No matching commits" : "No commits yet"} body={commits.length ? "Try a different search." : "Make your first commit from the Changes tab."} />
          )}
          {filtered.map((c, i) => (
            <CommitRow key={c.hash} commit={c} active={selected?.hash === c.hash} first={i === 0} onClick={() => setPicked(c.hash)} />
          ))}
        </div>
      </div>

      {/* detail */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: gh.bgDeep }}>
        {selected ? <CommitDetail key={selected.hash} ctx={ctx} ws={ws} commit={selected} /> : (
          commits && <EmptyState icon={<GitCommitHorizontal size={22} />} title="Select a commit" body="Pick a commit on the left to see exactly what changed." />
        )}
      </div>
    </div>
  );
}

function CommitRow({ commit, active, first, onClick }: { commit: GitCommitInfo; active: boolean; first: boolean; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-active={active}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      className="ghp-row"
      style={{ display: "flex", gap: 12, padding: "11px 14px", cursor: "pointer", outline: "none", borderBottom: `1px solid ${gh.borderSoft}` }}
    >
      {/* timeline dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
        <span style={{
          width: 9, height: 9, borderRadius: "50%",
          border: `2px solid ${first ? gh.accent : gh.textFaint}`, background: first ? gh.accent : "transparent",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: gh.text, fontWeight: active ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {commit.subject || "(no message)"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11, color: gh.textFaint, flexWrap: "wrap" }}>
          <span>{commit.author}</span>
          <span>·</span>
          <span title={new Date(commit.date).toLocaleString()}>{relativeTime(commit.date)}</span>
          {commit.refs.slice(0, 3).map((r) => (
            <Badge key={r} color={r.startsWith("origin/") ? gh.purple : gh.green} soft={r.startsWith("origin/") ? gh.purpleSoft : gh.greenSoft}>
              {r.replace(/^tag: /, "🏷 ")}
            </Badge>
          ))}
        </div>
      </div>
      <span style={{ fontFamily: gh.mono, fontSize: 11, color: gh.textFaint, paddingTop: 1 }}>{commit.shortHash}</span>
    </div>
  );
}

function CommitDetail({ ctx, ws, commit }: { ctx: PanelCtx; ws: string; commit: GitCommitInfo }) {
  const [data, setData] = useState<{ diff: string; tooLarge: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    githubApi.show(ws, commit.hash)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(apiErrorMessage(err, "Couldn't load this commit")); });
    return () => { cancelled = true; };
  }, [ws, commit.hash]);

  // `git show --format=%B` prints the full message before the first "diff --git".
  const body = useMemo(() => {
    if (!data) return "";
    const idx = data.diff.indexOf("\ndiff --git ");
    const msg = (idx === -1 ? data.diff : data.diff.slice(0, idx)).trim();
    return msg.split("\n").slice(1).join("\n").trim();
  }, [data]);
  const files = useMemo(() => (data ? parseUnifiedDiff(data.diff) : []), [data]);
  const totals = files.reduce((a, f) => ({ add: a.add + f.additions, del: a.del + f.deletions }), { add: 0, del: 0 });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(commit.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      ctx.toast("error", "Couldn't copy", "Clipboard access was blocked.");
    }
  };

  return (
    <>
      <div style={{ padding: "18px 20px 16px", borderBottom: `1px solid ${gh.borderSoft}`, background: gh.bg }}>
        <div style={{ fontSize: 16, fontWeight: 650, color: gh.text, lineHeight: 1.4 }}>{commit.subject || "(no message)"}</div>
        {body && <div style={{ fontSize: 12.5, color: gh.textMuted, whiteSpace: "pre-wrap", marginTop: 8, lineHeight: 1.6 }}>{body}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", background: gh.accentSoft, color: gh.accent,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
          }}>
            {commit.author.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: gh.text, fontWeight: 600 }}>{commit.author}</span>
            <span style={{ color: gh.textFaint }}> committed {relativeTime(commit.date)} · {new Date(commit.date).toLocaleString()}</span>
          </div>
          <div style={{ flex: 1 }} />
          {data && <span style={{ fontSize: 11.5, color: gh.textFaint }}>{files.length} file{files.length === 1 ? "" : "s"} · <DiffStat additions={totals.add} deletions={totals.del} /></span>}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 4px 2px 8px", borderRadius: 7, background: gh.surface, border: `1px solid ${gh.borderSoft}` }}>
            <span style={{ fontFamily: gh.mono, fontSize: 11.5, color: gh.textMuted }}>{commit.shortHash}</span>
            <IconButton title={copied ? "Copied!" : "Copy full hash"} size={22} onClick={copy}>
              {copied ? <Check size={12} color={gh.green} /> : <Copy size={12} />}
            </IconButton>
          </span>
          {ctx.remote && (
            <Button
              size="sm"
              icon={<ExternalLink size={12} />}
              onClick={() => window.open(ctx.remote!.commitUrl(commit.hash), "_blank", "noopener,noreferrer")}
            >
              View on GitHub
            </Button>
          )}
        </div>
      </div>
      <div className="ghp-scroll" style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {error && <Callout tone="error">{error}</Callout>}
        {!error && !data && <div style={{ display: "flex", gap: 8, color: gh.textFaint, fontSize: 12 }}><Spinner size={13} /> Loading changes…</div>}
        {data && <DiffViewer text={data.diff} tooLarge={data.tooLarge} emptyHint="This commit has no file changes (for example, a merge)." />}
      </div>
    </>
  );
}
