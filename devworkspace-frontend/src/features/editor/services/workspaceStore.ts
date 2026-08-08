/**
 * Workspace persistence — Option C (hybrid).
 *
 * Phase 2 keeps workspace + open-tab state in localStorage. The shape is a
 * simple serializable object so the same data can later be mirrored to the DB
 * (Phase 8+ multi-device) without changing the editor code that reads it.
 */
const WORKSPACE_KEY = "devworkspace.editor.workspace";
const RECENT_KEY = "devworkspace.editor.recentWorkspaces";

export interface PersistedWorkspace {
  workspace: string;
  openedAt: number;
}

export interface PersistedWorkspaceState {
  workspace: string | null;
  recent: string[];
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable — editor keeps working without persistence
  }
}

export const workspaceStore = {
  getWorkspace(): string | null {
    const stored = readJSON<PersistedWorkspace>(WORKSPACE_KEY);
    return stored?.workspace ?? null;
  },

  setWorkspace(workspace: string): void {
    writeJSON(WORKSPACE_KEY, { workspace, openedAt: Date.now() } satisfies PersistedWorkspace);
    const recent = this.getRecent();
    const next = [workspace, ...recent.filter((w) => w !== workspace)].slice(0, 8);
    writeJSON(RECENT_KEY, next);
  },

  getRecent(): string[] {
    return readJSON<string[]>(RECENT_KEY) ?? [];
  },

  clearWorkspace(): void {
    try {
      localStorage.removeItem(WORKSPACE_KEY);
    } catch {
      // ignore
    }
  },

  /**
   * Persisted open-tab state. Kept minimal + versioned so the DB sync layer
   * (or a later migration) can read it without a breaking change.
   */
  getSession(): PersistedWorkspaceState {
    return { workspace: this.getWorkspace(), recent: this.getRecent() };
  },
};
