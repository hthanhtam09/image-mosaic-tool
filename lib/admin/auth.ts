// Admin authentication (demo-grade). Credentials and session token are kept
// here so both the API route and the edge middleware can validate the cookie.
// In production, replace the static token with a signed/HMAC session.

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "shin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "thanh9199";

export const SESSION_COOKIE = "mosaci_admin";
export const SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN ?? "mosaci-admin-session-v1";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export function isValidSession(token?: string | null): boolean {
  return Boolean(token) && token === SESSION_TOKEN;
}

export function checkCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}
