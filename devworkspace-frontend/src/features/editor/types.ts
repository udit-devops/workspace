export type FileEntryKind = "file" | "directory";

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  kind: FileEntryKind;
  language?: string;
  content?: string;
  children?: FileEntry[];
}

export interface OpenTab {
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
  loading?: boolean;
}

export type ThemeMode = "dark" | "light";
export type SplitDirection = "horizontal" | "vertical";

export interface PaneState {
  id: string;
  tabs: OpenTab[];
  activePath: string | null;
  contents: Record<string, string>;
  originals: Record<string, string>;
  cursor: { line: number; column: number };
}

export type LayoutNode =
  | { kind: "pane"; id: string }
  | { kind: "split"; direction: SplitDirection; ratio: number; left: LayoutNode; right: LayoutNode };

export type WorkspaceAction = "run" | "live_server";