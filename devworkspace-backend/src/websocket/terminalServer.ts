import { WebSocketServer, WebSocket } from "ws";
import os from "node:os";
import pty from "node-pty";
import http from "node:http";
import jwt from "jsonwebtoken";
import { getSandboxRoot, resolveInWorkspace } from "../utils/pathGuard.js";

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Only logged-in users get a shell. */
function isAuthenticated(req: http.IncomingMessage): boolean {
  const token = readCookie(req.headers.cookie, "accessToken");
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return true;
  } catch {
    return false;
  }
}

/** Start in the requested project folder when it is inside WORKSPACE_ROOT. */
async function resolveCwd(req: http.IncomingMessage): Promise<string> {
  const fallback = process.env.WORKSPACE_ROOT || process.cwd();
  const requested = new URL(req.url ?? "", "http://localhost").searchParams.get("cwd");
  if (!requested) return process.env.WORKSPACE_ROOT ? getSandboxRoot() : fallback;
  try {
    const { workspace } = await resolveInWorkspace(requested, requested);
    return workspace;
  } catch {
    return fallback;
  }
}

export function setupTerminalWebSocket(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/terminal",
    verifyClient: ({ req }: { req: http.IncomingMessage }) => isAuthenticated(req),
  });

  wss.on("connection", async (ws: WebSocket, req: http.IncomingMessage) => {
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

    // Buffer keystrokes that arrive while the cwd is being resolved.
    const pending: string[] = [];
    const early = (m: Buffer | string) => pending.push(m.toString());
    ws.on("message", early);

    const cwd = await resolveCwd(req);
    if (ws.readyState !== WebSocket.OPEN) return;

    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: cwd,
      env: process.env as { [key: string]: string },
    });

    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handle = (message: string) => {
      // Resize arrives as a JSON control message; everything else is keyboard input.
      if (message.startsWith("{")) {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === "resize" && typeof parsed.cols === "number" && typeof parsed.rows === "number") {
            ptyProcess.resize(parsed.cols, parsed.rows);
            return;
          }
        } catch {}
      }
      ptyProcess.write(message);
    };

    ws.off("message", early);
    ws.on("message", (m: Buffer | string) => handle(m.toString()));
    pending.forEach(handle);

    ws.on("close", () => {
      try {
        ptyProcess.kill();
      } catch {}
    });
  });
}
