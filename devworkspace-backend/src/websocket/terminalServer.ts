import { WebSocketServer, WebSocket } from "ws";
import os from "node:os";
import pty from "node-pty";
import http from "node:http";

export function setupTerminalWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws/terminal" });

  wss.on("connection", (ws: WebSocket) => {
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    const cwd = process.env.WORKSPACE_ROOT || process.cwd();

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

    ws.on("message", (message: Buffer | string) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === "resize" && typeof parsed.cols === "number" && typeof parsed.rows === "number") {
          ptyProcess.resize(parsed.cols, parsed.rows);
          return;
        }
      } catch {
        ptyProcess.write(message.toString());
      }
    });

    ws.on("close", () => {
      try {
        ptyProcess.kill();
      } catch {}
    });
  });
}
