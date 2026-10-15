import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, CloudUpload, GitPullRequest, PencilLine, ExternalLink } from "lucide-react";
import { githubApi } from "../../../api/api";
import type { PanelCtx } from "./context";
import { gh } from "./theme";
import { Button } from "./ui";
import { runGitAction } from "./actions";

/**
 * Explains, in plain words, how the local project relates to GitHub and offers
 * the one action that moves it forward (review, push, pull, publish, PR).
 */
export default function SyncCard({ ctx, compact }: { ctx: PanelCtx; compact?: boolean }) {
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);
  const s = ctx.status;
  if (!s || !s.isRepo || !ctx.workspace) return null;
  const ws = ctx.workspace;

  const push = async () => {
    setBusy("push");
    await runGitAction(ctx, "Push", () => githubApi.push(ws), {
      title: s.upstream ? "Pushed to GitHub" : "Branch published to GitHub",
      body: `${s.branch} is now on ${s.remote ? "origin" : "the remote"}.`,
    });
    setBusy(null);
  };
  const pull = async () => {
    setBusy("pull");
    await runGitAction(ctx, "Pull", () => githubApi.pull(ws), { title: "Pulled latest changes", body: `${s.branch} is up to date with GitHub.` });
    setBusy(null);
  };

  const isDefault = /^(main|master|develop)$/.test(s.branch);
  const items: { icon: React.ReactNode; color: string; title: string; body: string; action?: React.ReactNode }[] = [];

  if (s.files.length > 0) {
    items.push({
      icon: <PencilLine size={16} />, color: gh.amber,
      title: `${s.files.length} uncommitted change${s.files.length === 1 ? "" : "s"}`,
      body: "Review them, write a short message, then commit & push.",
      action: compact ? undefined : <Button size="sm" onClick={() => ctx.go("changes")}>Review changes</Button>,
    });
  }
  if (!s.remote) {
    items.push({
      icon: <CloudUpload size={16} />, color: gh.textMuted,
      title: "Not connected to a GitHub repository",
      body: "Add a remote in the terminal: git remote add origin <url>",
    });
  } else if (!s.upstream && !s.detached) {
    items.push({
      icon: <CloudUpload size={16} />, color: gh.accent,
      title: `Branch “${s.branch}” isn't on GitHub yet`,
      body: "Publish it so others can see your work.",
      action: <Button size="sm" variant="accent" loading={busy === "push"} disabled={busy !== null} icon={<ArrowUp size={13} />} onClick={push}>Publish branch</Button>,
    });
  } else {
    if (s.behind > 0) {
      items.push({
        icon: <ArrowDown size={16} />, color: gh.purple,
        title: `${s.behind} new commit${s.behind === 1 ? "" : "s"} on GitHub`,
        body: "Pull them before you continue so you're working on the latest code.",
        action: <Button size="sm" loading={busy === "pull"} disabled={busy !== null} icon={<ArrowDown size={13} />} onClick={pull}>Pull</Button>,
      });
    }
    if (s.ahead > 0) {
      items.push({
        icon: <ArrowUp size={16} />, color: gh.accent,
        title: `${s.ahead} commit${s.ahead === 1 ? "" : "s"} not on GitHub yet`,
        body: "Push to upload them.",
        action: <Button size="sm" variant="accent" loading={busy === "push"} disabled={busy !== null} icon={<ArrowUp size={13} />} onClick={push}>Push</Button>,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      icon: <CheckCircle2 size={16} />, color: gh.green,
      title: "Everything is up to date",
      body: s.upstream ? `Your work on ${s.branch} matches GitHub.` : "No changes to commit.",
    });
  }

  const prUrl = ctx.remote && s.upstream && !isDefault && s.ahead === 0 ? ctx.remote.compareUrl(s.branch) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} className="ghp-fade" style={{
          display: "flex", alignItems: "center", gap: 12, padding: compact ? "10px 12px" : "12px 14px",
          borderRadius: 12, background: gh.surface, border: `1px solid ${gh.borderSoft}`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: it.color, background: `${it.color}1f`,
          }}>
            {it.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: gh.text }}>{it.title}</div>
            <div style={{ fontSize: 11.5, color: gh.textFaint, marginTop: 2, lineHeight: 1.45 }}>{it.body}</div>
          </div>
          {it.action}
        </div>
      ))}
      {prUrl && (
        <a href={prUrl} target="_blank" rel="noreferrer" className="ghp-card ghp-card-hover" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, textDecoration: "none",
          background: gh.surface, border: `1px solid ${gh.borderSoft}`,
        }}>
          <GitPullRequest size={16} color={gh.green} />
          <span style={{ flex: 1, fontSize: 12.5, color: gh.text }}>Open a pull request for <b>{s.branch}</b></span>
          <ExternalLink size={13} color={gh.textFaint} />
        </a>
      )}
    </div>
  );
}
