"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnTerminal = spawnTerminal;
exports.writeTerminal = writeTerminal;
exports.resizeTerminal = resizeTerminal;
exports.killTerminal = killTerminal;
exports.listSessions = listSessions;
exports.setBroadcastHandlers = setBroadcastHandlers;
const node_pty_1 = __importDefault(require("node-pty"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const sessions = new Map();
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "D:\\Personal Data\\Dhruv\\Collab Git\\workspace";
const nodePath = "C:\\Program Files\\nodejs";
const gitBin = "C:\\Program Files\\Git\\bin";
const gitCmd = "C:\\Program Files\\Git\\cmd";
const systemRoot = process.env.SystemRoot || "C:\\Windows\\System32";
function shellEnv() {
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
function resolveShell() {
    // Prefer PowerShell (full Windows support, npm/node work out of the box)
    const psPath = node_path_1.default.join(systemRoot, "WindowsPowerShell\\v1.0\\powershell.exe");
    if (node_fs_1.default.existsSync(psPath)) {
        return { file: psPath, args: ["-NoLogo", "-Command", "Set-Location '" + WORKSPACE_ROOT + "'"] };
    }
    // Fallback to Git Bash
    const bashPath = node_path_1.default.join(gitBin, "bash.exe");
    if (node_fs_1.default.existsSync(bashPath)) {
        return { file: bashPath, args: ["-l", "-i"] };
    }
    // Last resort: cmd.exe
    return { file: process.env.COMSPEC || "cmd.exe", args: ["/K", "cd /d " + WORKSPACE_ROOT] };
}
function spawnTerminal(id, cols, rows) {
    const { file, args } = resolveShell();
    const ptyProcess = node_pty_1.default.spawn(file, args, {
        name: "xterm-256color",
        cols,
        rows,
        cwd: WORKSPACE_ROOT,
        env: shellEnv(),
        useConpty: false,
    });
    const session = { pty: ptyProcess, cols, rows };
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
function writeTerminal(id, data) {
    sessions.get(id)?.pty.write(data);
}
function resizeTerminal(id, cols, rows) {
    const session = sessions.get(id);
    if (!session)
        return;
    session.pty.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
}
function killTerminal(id) {
    const session = sessions.get(id);
    if (!session)
        return;
    try {
        session.pty.kill();
    }
    catch { }
    sessions.delete(id);
}
function listSessions() {
    return Array.from(sessions.keys());
}
// Handlers set by main.ts
let broadcastOutput = () => { };
let broadcastExit = () => { };
function setBroadcastHandlers(onOutput, onExit) {
    broadcastOutput = onOutput;
    broadcastExit = onExit;
}
