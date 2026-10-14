import { WebSocketServer, WebSocket } from "ws";
import os from "node:os";
import pty from "node-pty";
import http from "node:http";
import type { Duplex } from "node:stream";
import { getUserFromToken } from "../middleware/requireAuth.js";
import { resolveInWorkspace } from "../utils/pathGuard.js";

const TERMINAL_PATH = "/ws/terminal";

function readCookie(req: http.IncomingMessage, name: string): string | undefined {
  const pair = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

function reject(socket: Duplex, status: number, reason: string) {
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
}

/**
 * Authenticates the upgrade request before any shell is spawned:
 *   - Origin must be the frontend (blocks cross-site WebSocket hijacking)
 *   - accessToken cookie must belong to a real user
 *   - workspace must resolve inside WORKSPACE_ROOT
 */
export function setupTerminalWebSocket(server: http.Server, allowedOrigin: string) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url || "", "http://localhost");
    if (url.pathname !== TERMINAL_PATH) return socket.destroy();
    if (req.headers.origin !== allowedOrigin) return reject(socket, 403, "Forbidden");

    const user = await getUserFromToken(readCookie(req, "accessToken"));
    if (!user) return reject(socket, 401, "Unauthorized");

    let cwd: string;
    try {
      const workspace = url.searchParams.get("workspace") ?? "";
      cwd = (await resolveInWorkspace(workspace, workspace)).workspace;
    } catch {
      return reject(socket, 403, "Forbidden");
    }

    wss.handleUpgrade(req, socket, head, (ws) => startSession(ws, cwd));
  });
}

/**
 * Client -> server messages are always JSON:
 *   { type: "input", data: string } | { type: "resize", cols: number, rows: number }
 */
function startSession(ws: WebSocket, cwd: string) {
  const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

  let ptyProcess: pty.IPty;
  try {
    ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd,
      env: process.env as { [key: string]: string },
    });
  } catch (spawnErr: any) {
    console.error("Failed to spawn PTY:", spawnErr);
    ws.send(`\r\n\x1b[31m[Failed to spawn shell: ${spawnErr.message}]\x1b[0m\r\n`);
    ws.close();
    return;
  }

  ptyProcess.onData((data: string) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`\r\n\x1b[33m[Process exited with code ${exitCode}, signal ${signal || 0}]\x1b[0m\r\n`);
    }
  });

  ws.on("message", (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "input" && typeof msg.data === "string") {
      ptyProcess.write(msg.data);
    } else if (msg.type === "resize" && msg.cols > 0 && msg.rows > 0) {
      ptyProcess.resize(Math.floor(msg.cols), Math.floor(msg.rows));
    }
  });

  ws.on("close", () => {
    try {
      ptyProcess.kill();
    } catch {}
  });
}
