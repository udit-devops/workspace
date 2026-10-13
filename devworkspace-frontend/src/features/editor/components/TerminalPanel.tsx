import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { api } from "../../../api/api";
import { WS_URL } from "../../../config";
import "xterm/css/xterm.css";

export default function TerminalPanel({ workspace }: { workspace: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    try {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"Geist Mono", monospace',
        theme: {
          background: "#000000",
          foreground: "#ffffff",
          cursor: "#ffffff",
          selectionBackground: "rgba(255,255,255,0.3)",
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);

      const timer = setTimeout(() => {
        try {
          fitAddon.fit();
        } catch {
          // Container not measurable yet; the ResizeObserver fits it once laid out.
        }
      }, 50);

      termInstance.current = term;

      let ws: WebSocket | null = null;
      let disposed = false;

      const sendResize = () => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      };

      const connect = () => {
        if (disposed) return;
        ws = new WebSocket(`${WS_URL}/ws/terminal?workspace=${encodeURIComponent(workspace)}`);
        wsRef.current = ws;

        ws.onopen = () => {
          term.writeln(`\x1b[32m[Devspace Terminal Connected → ${workspace}]\x1b[0m\r\n`);
          fitAddon.fit();
          sendResize();
        };

        ws.onmessage = (event) => {
          term.write(event.data);
        };

        ws.onerror = (err) => {
          console.error("Terminal WebSocket error:", err);
          term.writeln("\r\n\x1b[31m[Error: Terminal connection failed]\x1b[0m\r\n");
        };

        ws.onclose = () => {
          term.writeln("\r\n\x1b[33m[Terminal Disconnected]\x1b[0m\r\n");
        };
      };

      // The WebSocket can't use the axios refresh interceptor, so make sure the
      // access cookie is fresh before the upgrade request is authenticated.
      api.get("/auth/refresh").catch(() => {}).finally(connect);

      term.onData((data) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          sendResize();
        } catch (e) {
          console.error("ResizeObserver error:", e);
        }
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => {
        disposed = true;
        clearTimeout(timer);
        resizeObserver.disconnect();
        try {
          ws?.close();
          term.dispose();
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      };
    } catch (error) {
      console.error("Failed to initialize terminal:", error);
    }
  }, [workspace]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
        padding: "8px",
        overflow: "hidden",
      }}
    >
      <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
