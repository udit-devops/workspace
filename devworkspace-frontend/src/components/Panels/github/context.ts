import type { GitStatus } from "../../../api/api";
import type { ToastTone } from "./useToasts";
import type { parseGitHubRemote } from "./utils";

export type View = "overview" | "changes" | "history" | "repos";

export interface Account {
  configured: boolean;
  connected: boolean;
  login: string | null;
}

/** Shared state every GitHub panel view receives. */
export interface PanelCtx {
  account: Account | null;
  connect: () => void;

  workspace: string | null;
  openProject: (path: string) => void;
  openEditor: (path?: string) => void;

  status: GitStatus | null;
  statusError: string | null;
  refreshStatus: () => Promise<void>;
  remote: ReturnType<typeof parseGitHubRemote>;

  /** Bumped after commits/pulls/branch switches so views refetch derived data. */
  revision: number;
  bumpRevision: () => void;

  go: (view: View) => void;
  toast: (tone: ToastTone, title: string, body?: string) => void;
}
