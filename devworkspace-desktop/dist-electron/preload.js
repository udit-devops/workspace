"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const terminal = {
    spawn: (args) => electron_1.ipcRenderer.invoke("terminal:spawn", args),
    write: (args) => electron_1.ipcRenderer.send("terminal:write", args),
    resize: (args) => electron_1.ipcRenderer.send("terminal:resize", args),
    kill: (args) => electron_1.ipcRenderer.send("terminal:kill", args),
    onData: (callback) => {
        const listener = (_e, payload) => callback(payload);
        electron_1.ipcRenderer.on("terminal:data", listener);
        return () => electron_1.ipcRenderer.off("terminal:data", listener);
    },
    onExit: (callback) => {
        const listener = (_e, payload) => callback(payload);
        electron_1.ipcRenderer.on("terminal:exit", listener);
        return () => electron_1.ipcRenderer.off("terminal:exit", listener);
    },
    offData: () => { },
    offExit: () => { },
};
electron_1.contextBridge.exposeInMainWorld("devworkspaceDesktop", {
    platform: process.platform,
    electronVersion: process.versions.electron,
    appVersion: process.env.npm_package_version ?? "unknown",
    terminal,
});
