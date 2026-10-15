import { useEffect, useState } from "react";
import { Check, Github, Download, Play, UploadCloud, ArrowRight, GitCommitHorizontal, FolderGit2, AlertTriangle } from "lucide-react";
import { githubApi } from "../../../api/api";
import type { GitCommitInfo } from "../../../api/api";
import type { PanelCtx } from "./context";
import { gh } from "./theme";
import { Button, Card, SectionLabel, Badge, EmptyState, Callout } from "./ui";
import { relativeTime } from "./utils";
import SyncCard from "./SyncCard";

export default function OverviewView({ ctx }: { ctx: PanelCtx }) {
  const s = ctx.status;
  const isRepo = Boolean(s?.isRepo);
  const projectName = ctx.workspace?.split(/[\\/]/).filter(Boolean).pop();

  const steps: Step[] = [
    {
      icon: <Github size={16} />,
      title: "Connect your GitHub account",
      body: ctx.account?.connected
        ? `Signed in as @${ctx.account.login}.`
        : ctx.account?.configured
          ? "Lets you browse and clone your repositories, including private ones."
          : "Optional — sign-in isn't configured on the server, so this computer's git login is used.",
      done: Boolean(ctx.account?.connected),
      optional: !ctx.account?.configured,
      action: ctx.account?.configured && !ctx.account.connected
        ? <Button size="sm" variant="primary" icon={<Github size={13} />} onClick={ctx.connect}>Sign in</Button>
        : undefined,
    },
    {
      icon: <Download size={16} />,
      title: "Get a project",
      body: isRepo ? `Working on ${projectName}.` : "Clone a repository from GitHub, or open a folder that already uses git.",
      done: isRepo,
      action: !isRepo ? <Button size="sm" onClick={() => ctx.go("repos")}>Clone repository</Button> : undefined,
    },
    {
      icon: <Play size={16} />,
      title: "Edit & run it",
      body: "Open it in the editor. Press Run to preview HTML or start the project's dev script in the terminal.",
      done: false,
      neutral: true,
      action: ctx.workspace ? <Button size="sm" onClick={() => ctx.openEditor()}>Open editor</Button> : undefined,
    },
    {
      icon: <UploadCloud size={16} />,
      title: "Commit & push your changes",
      body: isRepo && s?.isRepo
        ? s.files.length > 0
          ? `${s.files.length} file${s.files.length === 1 ? "" : "s"} changed — ready to commit.`
          : s.ahead > 0 ? `${s.ahead} commit${s.ahead === 1 ? "" : "s"} waiting to be pushed.` : "All your work is saved on GitHub."
        : "Save a snapshot of your work and upload it to GitHub.",
      done: Boolean(s?.isRepo && s.files.length === 0 && s.ahead === 0 && s.upstream),
      action: isRepo && s?.isRepo && s.files.length > 0
        ? <Button size="sm" variant="accent" onClick={() => ctx.go("changes")}>Review changes</Button>
        : undefined,
    },
  ];
  const completed = steps.filter((x) => x.done).length;

  return (
    <div className="ghp-scroll" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 28px 48px", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Hero */}
        <div className="ghp-fade">
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: gh.text, letterSpacing: "-0.02em" }}>
            {ctx.account?.connected ? `Welcome back, ${ctx.account.login}` : "Your code, connected to GitHub"}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: gh.textFaint, lineHeight: 1.6 }}>
            Clone a project, run it, and push your changes — without leaving DevWorkspace.
          </p>
        </div>

        {ctx.statusError && <Callout tone="error" title="Couldn't read this project">{ctx.statusError}</Callout>}

        {/* Project status */}
        {ctx.workspace && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>Current project</SectionLabel>
            <Card style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isRepo ? 14 : 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: gh.accentSoft, color: gh.accent,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <FolderGit2 size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 650, color: gh.text }}>{projectName}</span>
                    {s?.isRepo && <Badge mono>{s.branch}</Badge>}
                    {ctx.remote && <Badge color={gh.textMuted} title={s?.isRepo ? s.remote ?? "" : ""}>{ctx.remote.owner}/{ctx.remote.repo}</Badge>}
                  </div>
                  <div style={{ fontSize: 11.5, color: gh.textFaint, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ctx.workspace}
                  </div>
                </div>
                <Button size="sm" onClick={() => ctx.openEditor()}>Open in editor</Button>
              </div>
              {!s && !ctx.statusError && <div className="ghp-skeleton" style={{ height: 56 }} />}
              {s && !s.isRepo && (
                <div style={{ marginTop: 14 }}>
                  <Callout tone="warn" title="This folder isn't a git repository">
                    Run <code style={{ fontFamily: gh.mono }}>git init</code> in the terminal to start tracking it, or clone a repository instead.
                  </Callout>
                </div>
              )}
              {s?.isRepo && <SyncCard ctx={ctx} />}
            </Card>
          </section>
        )}

        {/* Getting started */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel right={<span style={{ fontSize: 11.5, color: gh.textFaint }}>{completed} of {steps.length} done</span>}>
            Getting started
          </SectionLabel>
          <Card style={{ padding: 6 }}>
            <div style={{ height: 3, margin: "6px 10px 8px", borderRadius: 3, background: gh.surfaceActive, overflow: "hidden" }}>
              <div style={{ width: `${(completed / steps.length) * 100}%`, height: "100%", background: gh.green, transition: "width .3s" }} />
            </div>
            {steps.map((step, i) => <StepRow key={i} index={i + 1} step={step} last={i === steps.length - 1} />)}
          </Card>
        </section>

        {/* Recent commits */}
        {s?.isRepo && <RecentCommits ctx={ctx} />}
      </div>
    </div>
  );
}

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
  done: boolean;
  optional?: boolean;
  neutral?: boolean;
  action?: React.ReactNode;
}

function StepRow({ step, index, last }: { step: Step; index: number; last: boolean }) {
  const color = step.done ? gh.green : step.neutral ? gh.accent : gh.textMuted;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 12px",
      borderBottom: last ? "none" : `1px solid ${gh.borderSoft}`,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: step.done ? gh.greenSoft : gh.surfaceActive, color, fontSize: 12, fontWeight: 700,
      }}>
        {step.done ? <Check size={15} /> : index}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: step.done ? gh.textMuted : gh.text }}>{step.title}</span>
          {step.optional && <Badge>Optional</Badge>}
        </div>
        <div style={{ fontSize: 12, color: gh.textFaint, marginTop: 2, lineHeight: 1.5 }}>{step.body}</div>
      </div>
      {step.action}
    </div>
  );
}

function RecentCommits({ ctx }: { ctx: PanelCtx }) {
  const [commits, setCommits] = useState<GitCommitInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ws = ctx.workspace;

  useEffect(() => {
    if (!ws) return;
    let cancelled = false;
    githubApi.log(ws, 5)
      .then((c) => { if (!cancelled) { setCommits(c); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [ws, ctx.revision]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel right={
        <Button size="sm" variant="ghost" onClick={() => ctx.go("history")}>View all <ArrowRight size={12} /></Button>
      }>
        Recent commits
      </SectionLabel>
      <Card style={{ overflow: "hidden" }}>
        {failed && <div style={{ padding: 14, display: "flex", gap: 8, fontSize: 12, color: gh.textFaint }}><AlertTriangle size={14} /> Couldn't load commits.</div>}
        {!failed && !commits && [0, 1, 2].map((i) => (
          <div key={i} style={{ padding: "12px 14px", borderTop: i ? `1px solid ${gh.borderSoft}` : "none" }}>
            <div className="ghp-skeleton" style={{ height: 12, width: "55%", marginBottom: 6 }} />
            <div className="ghp-skeleton" style={{ height: 10, width: "30%" }} />
          </div>
        ))}
        {commits?.length === 0 && (
          <EmptyState compact icon={<GitCommitHorizontal size={18} />} title="No commits yet" body="Your first commit will show up here." />
        )}
        {commits?.map((c, i) => (
          <div key={c.hash} className="ghp-row" onClick={() => ctx.go("history")} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", cursor: "pointer",
            borderTop: i ? `1px solid ${gh.borderSoft}` : "none",
          }}>
            <GitCommitHorizontal size={15} color={gh.textFaint} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: gh.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>
              <div style={{ fontSize: 11, color: gh.textFaint, marginTop: 2 }}>{c.author} · {relativeTime(c.date)}</div>
            </div>
            <Badge mono>{c.shortHash}</Badge>
          </div>
        ))}
      </Card>
    </section>
  );
}
