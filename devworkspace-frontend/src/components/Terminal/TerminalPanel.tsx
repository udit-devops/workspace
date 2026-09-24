import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface DesktopTerminal {
  spawn: (args: { id: string; cols: number; rows: number }) => Promise<{ pid: number; process: string }>;
  write: (args: { id: string; data: string }) => void;
  resize: (args: { id: string; cols: number; rows: number }) => void;
  kill: (args: { id: string }) => void;
  onData: (cb: (p: { id: string; data: string }) => void) => () => void;
  onExit: (cb: (p: { id: string; exitCode: number }) => void) => () => void;
}

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionId = useRef("devws-session");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const desktop = (window as any).devworkspaceDesktop as {
      terminal?: DesktopTerminal;
    } | undefined;

    if (!desktop?.terminal) {
      setReady(false);
      return;
    }

    const t = desktop.terminal;
    const term = new Terminal({
      theme: {
        foreground: "#e5e5e7",
        background: "#1c1c1e",
        cursor: "#5b6af0",
        cursorAccent: "#1c1c1e",
        selectionBackground: "#3a3a5c",
        selectionForeground: "#f5f5f7",
        black: "#000000",
        red: "#ff6b6b",
        green: "#3dd68c",
        yellow: "#ffb74a",
        blue: "#5b6af0",
        magenta: "#c678dd",
        cyan: "#56b6c2",
        white: "#e5e5e7",
        brightBlack: "#636366",
        brightRed: "#ff6b6b",
        brightGreen: "#3dd68c",
        brightYellow: "#ffb74a",
        brightBlue: "#5b6af0",
        brightMagenta: "#c678dd",
        brightCyan: "#56b6c2",
        brightWhite: "#f5f5f7",
      },
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 10000,
      tabStopWidth: 4,
      rightClickSelectsWord: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const container = containerRef.current;
    if (!container) return;

    term.open(container);
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    let cols = 80;
    let rows = 24;

    const fit = () => {
      fitAddon.fit();
      const newCols = term.cols;
      const newRows = term.rows;
      if (newCols !== cols || newRows !== rows) {
        cols = newCols;
        rows = newRows;
        t.resize({ id: sessionId.current, cols, rows });
      }
    };

    const ro = new ResizeObserver(fit);
    ro.observe(container);

    t.spawn({ id: sessionId.current, cols, rows })
      .then(() => { setReady(true); fit(); })
      .catch(() => setReady(false));

    const unsubData = t.onData(({ data }) => term.write(data));
    const unsubExit = t.onExit(({ exitCode }) => {
      term.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
    });

    term.onData((data) => t.write({ id: sessionId.current, data }));

    return () => {
      unsubData();
      unsubExit();
      ro.disconnect();
      term.dispose();
      t.kill({ id: sessionId.current });
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  const isDesktop = !!((window as any).devworkspaceDesktop?.terminal);

  return (
    <div ref={containerRef} style={{
      flex: 1, width: "100%", height: "100%", background: "#1c1c1e",
      position: "relative", overflow: "hidden",
    }}>
      {!ready && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isDesktop ? "#f5f5f7" : "#636366", fontSize: 14,
          fontFamily: "Inter, sans-serif", zIndex: 10,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{isDesktop ? "⌨" : "📱"}</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {isDesktop ? "Terminal Ready — Click below to type" : "Terminal requires DevWorkspace Desktop"}
            </div>
            {!isDesktop && (
              <div style={{ fontSize: 12, color: "#888" }}>
                Run `npm run dev` in `devworkspace-desktop` to open the desktop app.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
