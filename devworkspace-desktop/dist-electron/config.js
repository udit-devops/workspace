"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDev = exports.BACKEND_ORIGIN = exports.ALLOWED_ORIGINS = exports.LOGIN_URL = exports.APP_URL = void 0;
exports.stripTrailingSlash = stripTrailingSlash;
exports.isAllowedOrigin = isAllowedOrigin;
const electron_1 = require("electron");
/**
 * URL the desktop shell loads.
 *
 * Dev:  your local Vite dev server (start `npm run dev` in devworkspace-frontend).
 * Prod: your hosted deployment - set DEVWORKSPACE_APP_URL when packaging,
 *       e.g. DEVWORKSPACE_APP_URL=https://app.devworkspace.com
 */
function resolveAppUrl() {
    const forced = process.env.DEVWORKSPACE_APP_URL;
    if (forced)
        return stripTrailingSlash(forced);
    if (!electron_1.app.isPackaged) {
        return stripTrailingSlash(process.env.DEVWORKSPACE_DEV_URL ?? "http://localhost:5173");
    }
    // Packaged build without an explicit URL falls back to localhost so the app
    // never silently points at the wrong host. Set DEVWORKSPACE_APP_URL at build time.
    return "http://localhost:5173";
}
function stripTrailingSlash(url) {
    return url.replace(/\/+$/, "");
}
exports.APP_URL = resolveAppUrl();
/** Direct login/signup page — skips the web landing page. */
exports.LOGIN_URL = exports.APP_URL + "/login";
/** Origins the window is allowed to navigate to. Everything else opens in the system browser. */
exports.ALLOWED_ORIGINS = [
    new URL(exports.APP_URL).origin,
    new URL(exports.LOGIN_URL).origin,
    "http://localhost:5173",
    "http://localhost:4173",
];
function isAllowedOrigin(url) {
    try {
        const origin = new URL(url).origin;
        return exports.ALLOWED_ORIGINS.includes(origin);
    }
    catch {
        return false;
    }
}
/** Backend origin is allowed for XHR/fetch inside the page; navigation stays locked to APP_URL. */
exports.BACKEND_ORIGIN = stripTrailingSlash(process.env.DEVWORKSPACE_API_URL ?? "http://localhost:5000");
exports.isDev = !electron_1.app.isPackaged;
