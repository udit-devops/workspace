import { WebSocketServer, WebSocket } from "ws";
import os from "node:os";
import pty from "node-pty";
import http from "node:http";
import url from "node:url";
import fs from "node:fs";

export function setupTerminalWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws/terminal" });

  wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
    try {
      const parsedUrl = url.parse(req.url || "", true);
      const requestedWorkspace = parsedUrl.query.workspace as string;

      let cwd = process.cwd();
      if (requestedWorkspace && fs.existsSync(requestedWorkspace)) {
        cwd = requestedWorkspace;
      }

      const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

      let ptyProcess: pty.IPty;
      try {
        ptyProcess = pty.spawn(shell, [], {
          name: "xterm-color",
          cols: 80,
          rows: 30,
          cwd: cwd,
          env: process.env as { [key: string]: string },
        });
      } catch (spawnErr: any) {
        console.error("Failed to spawn PTY:", spawnErr);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n\x1b[31m[Failed to spawn shell: ${spawnErr.message}]\x1b[0m\r\n`);
        }
        ws.close();
        return;
      }

      ptyProcess.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n\x1b[33m[Process exited with code ${exitCode}, signal ${signal || 0}]\x1b[0m\r\n`);
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
    } catch (error) {
      console.error("Terminal WebSocket connection error:", error);
      ws.close();
    }
  });
}
