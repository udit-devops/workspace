"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const terminal_1 = require("./terminal");
let mainWindow = null;
const gotSingleInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
function hardenSession() {
    // Deny permission requests (camera, notifications, geolocation...) by default.
    electron_1.session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
        const allowed = ["clipboard-read", "clipboard-sanitized-write"];
        callback(allowed.includes(permission));
    });
}
function setupTerminalIpc() {
    (0, terminal_1.setBroadcastHandlers)((id, data) => {
        if (mainWindow)
            mainWindow.webContents.send("terminal:data", { id, data });
    }, (id, exitCode) => {
        if (mainWindow)
            mainWindow.webContents.send("terminal:exit", { id, exitCode });
    });
    electron_1.ipcMain.handle("terminal:spawn", (_event, { id, cols, rows }) => {
        return (0, terminal_1.spawnTerminal)(id, cols, rows);
    });
    electron_1.ipcMain.on("terminal:write", (_event, { id, data }) => {
        (0, terminal_1.writeTerminal)(id, data);
    });
    electron_1.ipcMain.on("terminal:resize", (_event, { id, cols, rows }) => {
        (0, terminal_1.resizeTerminal)(id, cols, rows);
    });
    electron_1.ipcMain.on("terminal:kill", (_event, { id }) => {
        (0, terminal_1.killTerminal)(id);
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 940,
        minHeight: 600,
        backgroundColor: "#1c1c1e",
        show: false,
        autoHideMenuBar: true,
        title: "DevWorkspace",
        icon: path_1.default.join(__dirname, "../assets/icon.ico"),
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webviewTag: false,
            spellcheck: false,
        },
    });
    mainWindow.once("ready-to-show", () => mainWindow?.show());
    // Any window.open / target=_blank goes to the system browser, but the
    // Google OAuth popup must be allowed to open as a real window.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\/([^.]+\.)*google\.com/i.test(url)) {
            return { action: 'allow' };
        }
        if (/^https?:/i.test(url))
            void electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Lock in-page navigation to the app origin; everything else opens externally.
    mainWindow.webContents.on("will-navigate", (event, url) => {
        if (!(0, config_1.isAllowedOrigin)(url)) {
            event.preventDefault();
            if (/^https?:/i.test(url))
                void electron_1.shell.openExternal(url);
        }
    });
    mainWindow.webContents.on("render-process-gone", (_e, details) => {
        console.error("renderer gone:", details.reason);
    });
    void mainWindow.loadURL(config_1.LOGIN_URL);
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    electron_1.Menu.setApplicationMenu(null);
    hardenSession();
    setupTerminalIpc();
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
