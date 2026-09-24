import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

interface TerminalIpc {
  spawn: (args: { id: string; cols: number; rows: number }) => Promise<{ pid: number; process: string }>;
  write: (args: { id: string; data: string }) => void;
  resize: (args: { id: string; cols: number; rows: number }) => void;
  kill: (args: { id: string }) => void;
  onData: (callback: (payload: { id: string; data: string }) => void) => void;
  onExit: (callback: (payload: { id: string; exitCode: number }) => void) => void;
  offData: () => void;
  offExit: () => void;
}

const terminal: TerminalIpc = {
  spawn: (args) => ipcRenderer.invoke("terminal:spawn", args),
  write: (args) => ipcRenderer.send("terminal:write", args),
  resize: (args) => ipcRenderer.send("terminal:resize", args),
  kill: (args) => ipcRenderer.send("terminal:kill", args),
  onData: (callback) => {
    const listener = (_e: IpcRendererEvent, payload: { id: string; data: string }) => callback(payload);
    ipcRenderer.on("terminal:data", listener);
    return () => ipcRenderer.off("terminal:data", listener);
  },
  onExit: (callback) => {
    const listener = (_e: IpcRendererEvent, payload: { id: string; exitCode: number }) => callback(payload);
    ipcRenderer.on("terminal:exit", listener);
    return () => ipcRenderer.off("terminal:exit", listener);
  },
  offData: () => {},
  offExit: () => {},
};

contextBridge.exposeInMainWorld("devworkspaceDesktop", {
  platform: process.platform,
  electronVersion: process.versions.electron,
  appVersion: process.env.npm_package_version ?? "unknown",
  terminal,
});
