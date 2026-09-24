# DevWorkspace Desktop

Electron shell that wraps the existing DevWorkspace web app. The frontend/backend
code lives once (in `devworkspace-frontend` / `devworkspace-backend`); this repo
contains only the native shell (~300 lines) and never forks app logic.

```
Web code (unchanged, one source of truth)
├── devworkspace-frontend   →  React/Vite app the shell loads
├── devworkspace-backend    →  Express API (stays hosted or local)
└── devworkspace-desktop    →  THIS REPO: window + security + packaging only
```

## Prerequisites

- Node 18+
- The frontend running for dev: `npm run dev` inside `devworkspace-frontend` (port 5173)

## Development

```powershell
# terminal 1 - the web app
cd ..\devworkspace-frontend
npm run dev

# terminal 2 - the desktop shell
npm install
npm run dev          # opens a native window on http://localhost:5173
```

Environment overrides:

| Variable | Purpose | Default |
|---|---|---|
| `DEVWORKSPACE_DEV_URL` | URL to load in dev | `http://localhost:5173` |
| `DEVWORKSPACE_APP_URL` | URL baked into packaged builds | none (required for release) |
| `DEVWORKSPACE_API_URL` | Backend origin (documented use / future checks) | `http://localhost:5000` |

The desktop shell always opens the `/login` page directly (skipping the web landing page).

PowerShell example:

```powershell
$env:DEVWORKSPACE_APP_URL = "https://app.yourdomain.com"; npm run dist
```

## Building the installer

```powershell
npm run dist              # NSIS installer → release/DevWorkspace Setup <ver>.exe
npm run dist:portable     # single portable .exe
```

Before distributing publicly:

1. **Point at your hosted URL** — set `DEVWORKSPACE_APP_URL` (packaged builds fall
   back to localhost if unset).
2. **Code-sign** — uncomment `azureSignOptions` (Azure Trusted Signing) or provide
   a `.pfx` in `electron-builder.yml`. Unsigned builds trigger SmartScreen warnings.
3. **Enable auto-update** — uncomment `publish`, host releases (e.g. GitHub
   Releases), and wire `electron-updater` in `src/main/main.ts`.

## Security model

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Empty IPC surface; preload exposes only read-only runtime info
  (`window.devworkspaceDesktop`)
- In-page navigation locked to the app origin; all other links open in the
  system browser; `window.open` denied
- Permission requests (camera/mic/geolocation/notifications) denied by default
- **Never put secrets (.env keys) in this repo or the bundle** — the backend owns
  every secret

## Frontend awareness (optional)

The web app can detect the desktop runtime without any fork:

```ts
const isDesktop = Boolean((window as any).devworkspaceDesktop);
```

Use it sparingly (e.g. hide "open in browser" buttons). Avoid branching core
logic so both editions stay identical.
