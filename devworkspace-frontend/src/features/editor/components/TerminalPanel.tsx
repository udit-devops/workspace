import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function TerminalPanel() {
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

      // Delay initial fit slightly so DOM flexbox layout has rendered
      const timer = setTimeout(() => {
        try {
          fitAddon.fit();
        } catch {}
      }, 50);

      termInstance.current = term;

      const ws = new WebSocket("ws://localhost:5000/ws/terminal");
      wsRef.current = ws;

      ws.onopen = () => {
        term.writeln("\x1b[32m[Devspace Terminal Connected]\x1b[0m\r\n");
        setTimeout(() => fitAddon.fit(), 50);
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

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Use ResizeObserver to automatically adjust terminal grid when drawer size changes
      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "resize",
                cols: term.cols,
                rows: term.rows,
              })
            );
          }
        } catch (e) {
          console.error("ResizeObserver error:", e);
        }
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
        try {
          ws.close();
          term.dispose();
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      };
    } catch (error) {
      console.error("Failed to initialize terminal:", error);
    }
  }, []);

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
