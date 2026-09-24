import pty, { IPty } from "node-pty";
import path from "node:path";
import fs from "node:fs";

interface Session {
  pty: IPty;
  cols: number;
  rows: number;
}

const sessions = new Map<string, Session>();

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "D:\\Personal Data\\Dhruv\\Collab Git\\workspace";

const nodePath = "C:\\Program Files\\nodejs";
const gitBin = "C:\\Program Files\\Git\\bin";
const gitCmd = "C:\\Program Files\\Git\\cmd";
const systemRoot = process.env.SystemRoot || "C:\\Windows\\System32";

function shellEnv(): Record<string, string | undefined> {
  const currentPath = process.env.PATH || "";
  const extraDirs = [nodePath, gitBin, gitCmd, systemRoot, currentPath];
  const unique = [...new Set(extraDirs.filter(Boolean))];
  return {
    ...process.env,
    PATH: unique.join(";"),
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.USERPROFILE,
    WORKSPACE_ROOT: WORKSPACE_ROOT,
  };
}

function resolveShell(): { file: string; args: string[] } {
  // Prefer PowerShell (full Windows support, npm/node work out of the box)
  const psPath = path.join(systemRoot, "WindowsPowerShell\\v1.0\\powershell.exe");
    if (fs.existsSync(psPath)) {
    return { file: psPath, args: ["-NoLogo", "-Command", "Set-Location '" + WORKSPACE_ROOT + "'"] };
  }
  // Fallback to Git Bash
  const bashPath = path.join(gitBin, "bash.exe");
    if (fs.existsSync(bashPath)) {
    return { file: bashPath, args: ["-l", "-i"] };
  }
  // Last resort: cmd.exe
  return { file: process.env.COMSPEC || "cmd.exe", args: ["/K", "cd /d " + WORKSPACE_ROOT] };
}

export function spawnTerminal(id: string, cols: number, rows: number): { pid: number; process: string } {
  const { file, args } = resolveShell();
  const ptyProcess = pty.spawn(file, args, {
    name: "xterm-256color",
    cols,
    rows,
    cwd: WORKSPACE_ROOT,
    env: shellEnv(),
    useConpty: false,
  });

  const session: Session = { pty: ptyProcess, cols, rows };
  sessions.set(id, session);

  ptyProcess.onData((data) => {
    broadcastOutput(id, data);
  });

  ptyProcess.onExit(({ exitCode }) => {
    sessions.delete(id);
    broadcastExit(id, exitCode);
  });

  return { pid: ptyProcess.pid, process: ptyProcess.process };
}

export function writeTerminal(id: string, data: string): void {
  sessions.get(id)?.pty.write(data);
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const session = sessions.get(id);
  if (!session) return;
  session.pty.resize(cols, rows);
  session.cols = cols;
  session.rows = rows;
}

export function killTerminal(id: string): void {
  const session = sessions.get(id);
  if (!session) return;
  try { session.pty.kill(); } catch {}
  sessions.delete(id);
}

export function listSessions(): string[] {
  return Array.from(sessions.keys());
}

// Handlers set by main.ts
let broadcastOutput: (id: string, data: string) => void = () => {};
let broadcastExit: (id: string, exitCode: number) => void = () => {};

export function setBroadcastHandlers(
  onOutput: (id: string, data: string) => void,
  onExit: (id: string, exitCode: number) => void,
) {
  broadcastOutput = onOutput;
  broadcastExit = onExit;
}
