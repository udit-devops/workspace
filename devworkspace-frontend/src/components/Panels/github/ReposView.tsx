import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Github, Lock, Globe, Search, RefreshCw, Code2, FolderCheck, ExternalLink, Link2, BookMarked } from "lucide-react";
import { githubApi, apiErrorMessage } from "../../../api/api";
import type { GitHubRepo } from "../../../api/api";
import { fsAdapter } from "../../../features/editor/services/fsAdapter";
import type { PanelCtx } from "./context";
import { gh } from "./theme";
import { Button, Callout, Card, EmptyState, IconButton, SectionLabel, Badge } from "./ui";
import { inputStyle } from "./styles";
import { languageColor, relativeTime } from "./utils";

type Visibility = "all" | "public" | "private";
type Sort = "updated" | "name";

/** Accepts full URLs (with or without .git) and "owner/repo" shorthand. */
function normalizeCloneUrl(input: string): string | null {
  const v = input.trim().replace(/\/+$/, "");
  const short = v.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return `https://github.com/${short[1]}/${short[2].replace(/\.git$/, "")}.git`;
  const full = v.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i);
  if (full) return `https://github.com/${full[1]}/${full[2]}.git`;
  return null;
}

const folderOf = (cloneUrl: string) => cloneUrl.split("/").pop()!.replace(/\.git$/, "");

export default function ReposView({ ctx }: { ctx: PanelCtx }) {
  const connected = Boolean(ctx.account?.connected);
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [root, setRoot] = useState("");
  const [existing, setExisting] = useState<Map<string, string>>(new Map());
  const [cloning, setCloning] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  // Folders already in WORKSPACE_ROOT, so repos on disk show "Open" instead of "Clone".
  const scanRoot = useCallback(async () => {
    try {
      const r = await fsAdapter.getRoot();
      setRoot(r);
      const dirs = await fsAdapter.listDir(r);
      setExisting(new Map(dirs.map((d) => [d.name.toLowerCase(), d.path])));
    } catch {
      // Not fatal: every repo just shows "Clone".
    }
  }, []);

  const loadRepos = useCallback(async () => {
    setLoadError(null);
    try {
      setRepos(await githubApi.getRepos());
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Couldn't load your repositories"));
    }
  }, []);

  useEffect(() => {
    void scanRoot();
  }, [scanRoot]);

  useEffect(() => {
    if (connected) void loadRepos();
  }, [connected, loadRepos]);

  const clone = async (cloneUrl: string, key: string) => {
    setCloning(key);
    try {
      const path = await githubApi.clone(cloneUrl);
      setExisting((m) => new Map(m).set(folderOf(cloneUrl).toLowerCase(), path));
      ctx.openProject(path);
      ctx.toast("success", `Cloned ${folderOf(cloneUrl)}`, "It's now your current project. Open it in the editor to start working.");
      if (key === "url") setUrl("");
    } catch (err) {
      const msg = apiErrorMessage(err, "Clone failed");
      if (/already exists/i.test(msg)) {
        void scanRoot();
        ctx.toast("info", "Already cloned", `${folderOf(cloneUrl)} is already in your projects folder — use Open instead.`);
      } else {
        ctx.toast("error", "Clone failed", msg);
      }
    } finally {
      setCloning(null);
    }
  };

  const shown = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    return repos
      .filter((r) => (visibility === "all" ? true : visibility === "private" ? r.private : !r.private))
      .filter((r) => !q || r.fullName.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [repos, query, visibility, sort]);

  const normalizedUrl = normalizeCloneUrl(url);
  const urlFolderExists = normalizedUrl ? existing.get(folderOf(normalizedUrl).toLowerCase()) : undefined;

  return (
    <div className="ghp-scroll" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 28px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: gh.text, letterSpacing: "-0.02em" }}>Repositories</h1>
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: gh.textFaint }}>
            Clone a project into <code style={{ fontFamily: gh.mono, color: gh.textMuted }}>{root || "your projects folder"}</code> and start working on it.
          </p>
        </div>

        {/* Clone by URL */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Link2 size={14} color={gh.textMuted} />
            <span style={{ fontSize: 13, fontWeight: 600, color: gh.text }}>Clone from a URL</span>
            <span style={{ fontSize: 11.5, color: gh.textFaint }}>— any public repo, or one you have access to</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (normalizedUrl && !urlFolderExists) void clone(normalizedUrl, "url");
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              className="ghp-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo  or  owner/repo"
              spellCheck={false}
              style={{ ...inputStyle, height: 36, fontFamily: gh.mono, fontSize: 12 }}
            />
            {urlFolderExists ? (
              <Button size="lg" icon={<Code2 size={14} />} onClick={() => ctx.openEditor(urlFolderExists)}>Open</Button>
            ) : (
              <Button type="submit" size="lg" variant="primary" icon={<Download size={14} />} loading={cloning === "url"} disabled={!normalizedUrl || cloning !== null}>
                Clone
              </Button>
            )}
          </form>
          {url.trim() && !normalizedUrl && (
            <div style={{ fontSize: 11.5, color: gh.amber, marginTop: 8 }}>Enter a GitHub URL like https://github.com/owner/repo</div>
          )}
          {urlFolderExists && (
            <div style={{ fontSize: 11.5, color: gh.textFaint, marginTop: 8 }}>This project is already in your projects folder.</div>
          )}
        </Card>

        {/* Your repositories */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel count={repos && connected ? shown.length : undefined}>Your GitHub repositories</SectionLabel>

          {!connected ? (
            ctx.account?.configured ? (
              <Card style={{ padding: 8 }}>
                <EmptyState
                  icon={<Github size={22} />}
                  title="Sign in to see your repositories"
                  body="Browse everything you own or collaborate on — including private repositories — and clone with one click."
                  actions={<Button variant="primary" icon={<Github size={14} />} onClick={ctx.connect}>Sign in with GitHub</Button>}
                />
              </Card>
            ) : (
              <Callout tone="info" title="GitHub sign-in isn't set up yet">
                You can still clone any repository by URL above. To list your own repositories here, add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the backend .env and restart it.
              </Callout>
            )
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "1 1 260px" }}>
                  <Search size={13} color={gh.textFaint} style={{ position: "absolute", left: 11, top: 11 }} />
                  <input
                    className="ghp-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a repository…"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                <Segmented
                  value={visibility}
                  onChange={setVisibility}
                  options={[{ value: "all", label: "All" }, { value: "public", label: "Public" }, { value: "private", label: "Private" }]}
                />
                <Segmented
                  value={sort}
                  onChange={setSort}
                  options={[{ value: "updated", label: "Recent" }, { value: "name", label: "A–Z" }]}
                />
                <IconButton title="Reload repositories" size={34} onClick={() => { setRepos(null); void loadRepos(); void scanRoot(); }}>
                  <RefreshCw size={14} />
                </IconButton>
              </div>

              {loadError && <Callout tone="error" title="Couldn't load repositories" action={<Button size="sm" onClick={() => void loadRepos()}>Retry</Button>}>{loadError}</Callout>}

              {!repos && !loadError && (
                <div style={gridStyle}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} style={{ padding: 16, height: 132, boxSizing: "border-box" }}>
                      <div className="ghp-skeleton" style={{ height: 14, width: "60%", marginBottom: 10 }} />
                      <div className="ghp-skeleton" style={{ height: 10, width: "90%", marginBottom: 6 }} />
                      <div className="ghp-skeleton" style={{ height: 10, width: "70%" }} />
                    </Card>
                  ))}
                </div>
              )}

              {repos && shown.length === 0 && (
                <Card style={{ padding: 8 }}>
                  <EmptyState compact icon={<BookMarked size={18} />} title={repos.length ? "No repositories match" : "No repositories yet"} body={repos.length ? "Try a different search or filter." : "Repositories you create or join on GitHub will appear here."} />
                </Card>
              )}

              {repos && shown.length > 0 && (
                <div style={gridStyle}>
                  {shown.map((r) => (
                    <RepoCard
                      key={r.id}
                      repo={r}
                      localPath={existing.get(r.name.toLowerCase())}
                      isCurrent={Boolean(ctx.workspace && existing.get(r.name.toLowerCase())?.toLowerCase() === ctx.workspace.replace(/\\/g, "/").toLowerCase())}
                      cloning={cloning === r.fullName}
                      disabled={cloning !== null}
                      onClone={() => void clone(r.cloneUrl, r.fullName)}
                      onOpen={(p) => ctx.openEditor(p)}
                      onUse={(p) => { ctx.openProject(p); ctx.go("overview"); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12,
};

function RepoCard({ repo, localPath, isCurrent, cloning, disabled, onClone, onOpen, onUse }: {
  repo: GitHubRepo;
  localPath?: string;
  isCurrent: boolean;
  cloning: boolean;
  disabled: boolean;
  onClone: () => void;
  onOpen: (path: string) => void;
  onUse: (path: string) => void;
}) {
  return (
    <Card hover style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 132, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: gh.textFaint }}>{repo.fullName.split("/")[0]}</div>
          <div style={{ fontSize: 14, fontWeight: 650, color: gh.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={repo.fullName}>
            {repo.name}
          </div>
        </div>
        {repo.private
          ? <Badge color={gh.amber} soft={gh.amberSoft}><Lock size={10} /> Private</Badge>
          : <Badge><Globe size={10} /> Public</Badge>}
        <IconButton title="Open on GitHub" size={24} onClick={() => window.open(repo.htmlUrl, "_blank", "noopener,noreferrer")}>
          <ExternalLink size={12} />
        </IconButton>
      </div>

      <div style={{
        fontSize: 12, color: repo.description ? gh.textMuted : gh.textDim, lineHeight: 1.5, flex: 1,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {repo.description || "No description"}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: gh.textFaint }}>
        {repo.language && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: languageColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span>Updated {relativeTime(repo.updatedAt)}</span>
        <div style={{ flex: 1 }} />
        {localPath ? (
          <div style={{ display: "flex", gap: 6 }}>
            {isCurrent
              ? <Badge color={gh.green} soft={gh.greenSoft}><FolderCheck size={11} /> Current</Badge>
              : <Button size="sm" variant="ghost" onClick={() => onUse(localPath)}>Use</Button>}
            <Button size="sm" icon={<Code2 size={12} />} onClick={() => onOpen(localPath)}>Open</Button>
          </div>
        ) : (
          <Button size="sm" variant="primary" icon={<Download size={12} />} loading={cloning} disabled={disabled && !cloning} onClick={onClone}>
            {cloning ? "Cloning…" : "Clone"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" style={{ display: "inline-flex", padding: 3, borderRadius: 9, background: gh.surface, border: `1px solid ${gh.border}`, height: 34, boxSizing: "border-box" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="ghp-btn"
            style={{
              border: "none", borderRadius: 6, padding: "0 11px", fontSize: 12, cursor: "pointer",
              background: active ? gh.surfaceActive : "transparent", color: active ? gh.text : gh.textFaint,
              fontWeight: active ? 600 : 500,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
