import { app } from "electron";

/**
 * URL the desktop shell loads.
 *
 * Dev:  your local Vite dev server (start `npm run dev` in devworkspace-frontend).
 * Prod: your hosted deployment - set DEVWORKSPACE_APP_URL when packaging,
 *       e.g. DEVWORKSPACE_APP_URL=https://app.devworkspace.com
 */
function resolveAppUrl(): string {
  const forced = process.env.DEVWORKSPACE_APP_URL;
  if (forced) return stripTrailingSlash(forced);
  if (!app.isPackaged) {
    return stripTrailingSlash(process.env.DEVWORKSPACE_DEV_URL ?? "http://localhost:5173");
  }
  // Packaged build without an explicit URL falls back to localhost so the app
  // never silently points at the wrong host. Set DEVWORKSPACE_APP_URL at build time.
  return "http://localhost:5173";
}

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const APP_URL = resolveAppUrl();

/** Direct login/signup page — skips the web landing page. */
export const LOGIN_URL = APP_URL + "/login";

/** Origins the window is allowed to navigate to. Everything else opens in the system browser. */
export const ALLOWED_ORIGINS: string[] = [
  new URL(APP_URL).origin,
  new URL(LOGIN_URL).origin,
  "http://localhost:5173",
  "http://localhost:4173",
];

export function isAllowedOrigin(url: string): boolean {
  try {
    const origin = new URL(url).origin;
    return ALLOWED_ORIGINS.includes(origin);
  } catch {
    return false;
  }
}

/** Backend origin is allowed for XHR/fetch inside the page; navigation stays locked to APP_URL. */
export const BACKEND_ORIGIN = stripTrailingSlash(
  process.env.DEVWORKSPACE_API_URL ?? "http://localhost:5000"
);

export const isDev = !app.isPackaged;
