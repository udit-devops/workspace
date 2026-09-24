import { app, BrowserWindow, shell, Menu, session, ipcMain } from "electron";
import path from "path";
import { LOGIN_URL, isAllowedOrigin, isDev } from "./config";
import { spawnTerminal, writeTerminal, resizeTerminal, killTerminal, setBroadcastHandlers } from "./terminal";

let mainWindow: BrowserWindow | null = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function hardenSession(): void {
  // Deny permission requests (camera, notifications, geolocation...) by default.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ["clipboard-read", "clipboard-sanitized-write"];
    callback(allowed.includes(permission));
  });
}

function setupTerminalIpc(): void {
  setBroadcastHandlers(
    (id: string, data: string) => {
      if (mainWindow) mainWindow.webContents.send("terminal:data", { id, data });
    },
    (id: string, exitCode: number) => {
      if (mainWindow) mainWindow.webContents.send("terminal:exit", { id, exitCode });
    },
  );

  ipcMain.handle("terminal:spawn", (_event, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    return spawnTerminal(id, cols, rows);
  });
  ipcMain.on("terminal:write", (_event, { id, data }: { id: string; data: string }) => {
    writeTerminal(id, data);
  });
  ipcMain.on("terminal:resize", (_event, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    resizeTerminal(id, cols, rows);
  });
  ipcMain.on("terminal:kill", (_event, { id }: { id: string }) => {
    killTerminal(id);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#1c1c1e",
    show: false,
    autoHideMenuBar: true,
    title: "DevWorkspace",
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Lock in-page navigation to the app origin; everything else opens externally.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedOrigin(url)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("renderer gone:", details.reason);
  });

  void mainWindow.loadURL(LOGIN_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  hardenSession();
  setupTerminalIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
