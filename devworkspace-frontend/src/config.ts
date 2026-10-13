/** Runtime endpoints and public keys. Override per environment via .env (VITE_*). */
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_ORIGIN = new URL(API_URL).origin;
export const WS_URL = API_URL.replace(/^http/, "ws");
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAACCcd2b8x6PCWQ_p";
