import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, ArrowUp, GitCommitHorizontal, CheckCircle2, FolderOpen, Download, Code2, Sparkles } from "lucide-react";
import { githubApi, apiErrorMessage } from "../../../api/api";
import type { GitFileChange } from "../../../api/api";
import type { PanelCtx } from "./context";
import { gh } from "./theme";
import { Button, IconButton, EmptyState, SectionLabel, Kbd, Callout, Spinner, Badge } from "./ui";
import { COMMIT_TYPES, applyCommitType, splitPath, statusInfo } from "./utils";
import DiffViewer, { FileTypeIcon } from "./DiffViewer";
import SyncCard from "./SyncCard";
import { runGitAction } from "./actions";

const SUBJECT_LIMIT = 72;

interface Selection { path: string; staged: boolean }

export default function ChangesView({ ctx }: { ctx: PanelCtx }) {
  const s = ctx.status;
  const ws = ctx.workspace;

  if (!ws) {
    return (
      <EmptyState
        icon={<FolderOpen size={22} />}
        title="No project open"
        body="Clone a repository from GitHub, or open a project folder in the editor to see its changes here."
        actions={<>
          <Button variant="primary" icon={<Download size={14} />} onClick={() => ctx.go("repos")}>Clone repository</Button>
          <Button icon={<Code2 size={14} />} onClick={() => ctx.openEditor()}>Open folder</Button>
        </>}
      />
    );
  }
  if (ctx.statusError && !s) {
    return <div style={{ padding: 24 }}><Callout tone="error" title="Couldn't read git status">{ctx.statusError}</Callout></div>;
  }
  if (!s) {
    return <div style={{ padding: 24, display: "flex", gap: 8, color: gh.textFaint, fontSize: 12.5 }}><Spinner /> Reading changes…</div>;
  }
  if (!s.isRepo) {
    return (
      <EmptyState
        icon={<GitCommitHorizontal size={22} />}
        title="This folder isn't tracked by git"
        body={<>Run <code style={{ fontFamily: gh.mono }}>git init</code> in the terminal to start tracking changes, or clone a repository instead.</>}
        actions={<Button onClick={() => ctx.go("repos")} icon={<Download size={14} />}>Clone repository</Button>}
      />
    );
  }
  return <ChangesWorkspace ctx={ctx} ws={ws} files={s.files} branch={s.branch} hasRemote={Boolean(s.remote)} />;
}

function ChangesWorkspace({ ctx, ws, files, branch, hasRemote }: {
  ctx: PanelCtx; ws: string; files: GitFileChange[]; branch: string; hasRemote: boolean;
}) {
  const staged = useMemo(() => files.filter((f) => f.index !== " " && f.index !== "?"), [files]);
  const unstaged = useMemo(() => files.filter((f) => f.worktree !== " " || f.index === "?"), [files]);

  const [picked, setPicked] = useState<Selection | null>(null);
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState<"commit" | "push" | null>(null);
  const [diff, setDiff] = useState<{ text: string; tooLarge: boolean; key: string } | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Keep the selection valid as files are staged/committed; default to the first file.
  const selected: Selection | null = useMemo(() => {
    const inList = (sel: Selection | null) =>
      sel && (sel.staged ? staged : unstaged).some((f) => f.path === sel.path) ? sel : null;
    return inList(picked)
      ?? (picked && inList({ path: picked.path, staged: !picked.staged }))
      ?? (unstaged[0] ? { path: unstaged[0].path, staged: false } : staged[0] ? { path: staged[0].path, staged: true } : null);
  }, [picked, staged, unstaged]);

  const filesSig = files.map((f) => `${f.index}${f.worktree}${f.path}`).join("|");
  const selKey = selected ? `${selected.staged}:${selected.path}` : "";

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    githubApi.diff(ws, selected.path, selected.staged)
      .then((d) => { if (!cancelled) { setDiff({ text: d.diff, tooLarge: d.tooLarge, key: selKey }); setDiffError(null); } })
      .catch((err) => { if (!cancelled) setDiffError(apiErrorMessage(err, "Couldn't load the diff")); });
    return () => { cancelled = true; };
    // selKey captures `selected`; filesSig/revision refetch after stage/commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, selKey, filesSig, ctx.revision]);

  const stage = (paths: string[]) => runGitAction(ctx, "Stage", () => githubApi.stage(ws, paths));
  const unstage = (paths: string[]) => runGitAction(ctx, "Unstage", () => githubApi.unstage(ws, paths));

  const subject = message.split("\n")[0];
  const canCommit = message.trim().length > 0 && files.length > 0 && committing === null;
  const includeCount = staged.length > 0 ? staged.length : files.length;

  const commit = async (andPush: boolean) => {
    if (!canCommit) return;
    setCommitting(andPush ? "push" : "commit");
    const ok = await runGitAction(ctx, andPush ? "Commit & push" : "Commit", async () => {
      if (staged.length === 0) await githubApi.stageAll(ws);
      await githubApi.commit(ws, message);
      setMessage("");
      if (andPush && hasRemote) await githubApi.push(ws);
    }, andPush && hasRemote
      ? { title: "Committed and pushed", body: `“${subject}” is now on GitHub (${branch}).` }
      : { title: "Committed", body: `“${subject}” saved on ${branch}.${hasRemote ? " Push when you're ready to share it." : ""}` });
    if (ok && andPush && !hasRemote) ctx.toast("info", "Not pushed", "This project has no GitHub remote yet.");
    setCommitting(null);
  };

  if (files.length === 0) {
    return (
      <div className="ghp-scroll" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
          <EmptyState
            icon={<CheckCircle2 size={22} color={gh.green} />}
            title="No changes"
            body="Everything you've written is committed. Edit files in the editor and they'll appear here automatically."
            actions={<Button icon={<Code2 size={14} />} onClick={() => ctx.openEditor()}>Open editor</Button>}
          />
          <SyncCard ctx={ctx} compact />
        </div>
      </div>
    );
  }

  const selectedFile = selected && (selected.staged ? staged : unstaged).find((f) => f.path === selected.path);

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      {/* ---------------- left: composer + files ---------------- */}
      <div style={{ width: 372, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${gh.borderSoft}`, minHeight: 0 }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${gh.borderSoft}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Sparkles size={12} color={gh.textFaint} />
            {COMMIT_TYPES.map((t) => {
              const active = new RegExp(`^${t.type}(\\(|:)`).test(subject);
              return (
                <button
                  key={t.type}
                  type="button"
                  title={t.hint}
                  onClick={() => setMessage((m) => applyCommitType(m, t.type))}
                  className="ghp-btn ghp-btn-secondary"
                  style={{
                    height: 22, padding: "0 8px", borderRadius: 999, fontSize: 11, fontFamily: gh.mono, cursor: "pointer",
                    background: active ? gh.accentSoft : gh.surface, color: active ? gh.accent : gh.textMuted,
                    border: `1px solid ${active ? `${gh.accent}55` : gh.border}`,
                  }}
                >
                  {t.type}
                </button>
              );
            })}
          </div>

          <div style={{ position: "relative" }}>
            <textarea
              className="ghp-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void commit(e.shiftKey);
                }
              }}
              placeholder={"Summary of your change (required)\n\nOptional details on the following lines…"}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 84, padding: "9px 11px 22px",
                borderRadius: 9, background: gh.surface, border: `1px solid ${gh.border}`, color: gh.text,
                fontSize: 12.5, lineHeight: 1.5, fontFamily: gh.font, outline: "none",
              }}
            />
            <span style={{
              position: "absolute", right: 10, bottom: 8, fontSize: 10.5, fontFamily: gh.mono,
              color: subject.length > SUBJECT_LIMIT ? gh.amber : gh.textDim,
            }} title="Keep the first line short so it reads well on GitHub">
              {subject.length}/{SUBJECT_LIMIT}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="accent"
              style={{ flex: 1 }}
              icon={<ArrowUp size={14} />}
              loading={committing === "push"}
              disabled={!canCommit}
              onClick={() => void commit(true)}
              title={hasRemote ? "Commit, then upload to GitHub (Ctrl+Shift+Enter)" : "Commit (no GitHub remote to push to)"}
            >
              Commit & Push
            </Button>
            <Button
              icon={<GitCommitHorizontal size={14} />}
              loading={committing === "commit"}
              disabled={!canCommit}
              onClick={() => void commit(false)}
              title="Commit only (Ctrl+Enter)"
            >
              Commit
            </Button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: gh.textFaint }}>
            <span style={{ flex: 1 }}>
              {staged.length > 0
                ? `${includeCount} staged file${includeCount === 1 ? "" : "s"} will be committed`
                : `All ${includeCount} changed file${includeCount === 1 ? "" : "s"} will be committed`}
            </span>
            <Kbd>Ctrl</Kbd><Kbd>↵</Kbd>
          </div>
        </div>

        <div className="ghp-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 0 16px" }}>
          {staged.length > 0 && (
            <FileGroup
              title="Staged"
              hint="Only these files go into the next commit."
              files={staged}
              staged
              selected={selected}
              onSelect={setPicked}
              actionIcon={<Minus size={13} />}
              actionTitle="Unstage"
              onAction={unstage}
            />
          )}
          {unstaged.length > 0 && (
            <FileGroup
              title={staged.length > 0 ? "Not staged" : "Changed files"}
              hint={staged.length > 0 ? "Stage files to include them in the commit." : "Use + to pick specific files, or just commit them all."}
              files={unstaged}
              staged={false}
              selected={selected}
              onSelect={setPicked}
              actionIcon={<Plus size={13} />}
              actionTitle="Stage"
              onAction={stage}
            />
          )}
        </div>
      </div>

      {/* ---------------- right: diff ---------------- */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: gh.bgDeep }}>
        {selected && selectedFile && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${gh.borderSoft}`, background: gh.bg,
          }}>
            <FileTypeIcon path={selected.path} size={15} />
            <span style={{ fontSize: 13, color: gh.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.path}
            </span>
            <StatusPill file={selectedFile} staged={selected.staged} />
            <Badge>{selected.staged ? "Staged" : "Working copy"}</Badge>
            <div style={{ flex: 1 }} />
            {selected.staged ? (
              <Button size="sm" icon={<Minus size={12} />} onClick={() => void unstage([selected.path])}>Unstage</Button>
            ) : (
              <Button size="sm" icon={<Plus size={12} />} onClick={() => void stage([selected.path])}>Stage file</Button>
            )}
          </div>
        )}
        <div className="ghp-scroll" style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {diffError && <Callout tone="error" title="Couldn't load the diff">{diffError}</Callout>}
          {!diffError && selected && (!diff || diff.key !== selKey) && (
            <div style={{ display: "flex", gap: 8, color: gh.textFaint, fontSize: 12 }}><Spinner size={13} /> Loading diff…</div>
          )}
          {!diffError && diff && diff.key === selKey && selected && (
            <DiffViewer text={diff.text} tooLarge={diff.tooLarge} fallbackPath={selected.path} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ file, staged }: { file: GitFileChange; staged: boolean }) {
  const info = statusInfo(staged ? file.index : file.index === "?" ? "?" : file.worktree);
  return <Badge color={info.color} soft={info.soft}>{info.label}</Badge>;
}

function FileGroup({ title, hint, files, staged, selected, onSelect, actionIcon, actionTitle, onAction }: {
  title: string;
  hint: string;
  files: GitFileChange[];
  staged: boolean;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
  actionIcon: React.ReactNode;
  actionTitle: string;
  onAction: (paths: string[]) => unknown;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ padding: "0 10px 0 14px" }}>
        <SectionLabel
          count={files.length}
          right={
            <Button size="sm" variant="ghost" icon={actionIcon} onClick={() => void onAction(files.map((f) => f.path))}>
              {actionTitle} all
            </Button>
          }
        >
          {title}
        </SectionLabel>
        <div style={{ fontSize: 11, color: gh.textDim, margin: "0 0 6px" }}>{hint}</div>
      </div>
      {files.map((f) => {
        const info = statusInfo(staged ? f.index : f.index === "?" ? "?" : f.worktree);
        const { name, dir } = splitPath(f.path);
        const active = selected?.path === f.path && selected.staged === staged;
        return (
          <div
            key={`${staged}-${f.path}`}
            role="button"
            tabIndex={0}
            data-active={active}
            onClick={() => onSelect({ path: f.path, staged })}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect({ path: f.path, staged }); } }}
            className="ghp-row"
            title={`${f.path} — ${info.label}`}
            style={{ display: "flex", alignItems: "center", gap: 9, height: 32, padding: "0 10px 0 14px", cursor: "pointer", outline: "none" }}
          >
            <FileTypeIcon path={f.path} />
            <span style={{
              fontSize: 12.5, color: info.letter === "D" ? gh.textFaint : gh.text,
              textDecoration: info.letter === "D" ? "line-through" : undefined, whiteSpace: "nowrap",
            }}>
              {name}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: gh.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {dir}
            </span>
            <span className="ghp-row-actions">
              <IconButton title={actionTitle} size={24} onClick={(e) => { e.stopPropagation(); void onAction([f.path]); }}>
                {actionIcon}
              </IconButton>
            </span>
            <span title={info.label} style={{
              width: 18, height: 18, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, fontFamily: gh.mono, color: info.color, background: info.soft, flexShrink: 0,
            }}>
              {info.letter}
            </span>
          </div>
        );
      })}
    </div>
  );
}
