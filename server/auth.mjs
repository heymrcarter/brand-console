// Keeps the Brand Console private when it is shared beyond one computer.
//
// On your own computer (the default), the server listens on 127.0.0.1 only, and nothing changes: no sign-in.
// When CONSOLE_HOST (or HOST in .env) is not this computer, or ALLOW_REMOTE=1, the server is in "shared" mode:
//   - It will not start unless AUTH_BEARER_TOKEN is set to a long, random access code.
//   - Every /api call (except /api/health and /api/login) and every file in dist/, build/, and fonts/ needs that code,
//     either as "Authorization: Bearer <code>" (for scripts and CI) or as the sign-in cookie the console gets
//     after someone types the code.
// This is a shared code, not real accounts. It keeps strangers out. It does not say who did what.
// See docs/hosting-auth.md for the plan for real sign-in with the company's single sign-on.
import crypto from "node:crypto";

export const MIN_TOKEN_LENGTH = 32;
const COOKIE = "bc_session";
const OPEN_PATHS = new Set(["/api/health", "/api/login", "/api/logout"]);
const PRIVATE_PREFIXES = ["/api/", "/dist/", "/build/", "/fonts/"];

/** True for addresses that only this computer can reach. */
export function isLoopback(host) {
  const h = String(host || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "::1" || /^127\.\d+\.\d+\.\d+$/.test(h);
}

/**
 * Reads the hosting settings. `get(name)` returns a setting from the environment or .env.
 * The shell's own HOST variable is not used, because some Mac shells set it to the computer's name.
 */
export function hostingConfig({ fromEnv = {}, fromFile = {} } = {}) {
  const pick = (n) => (fromEnv[n] !== undefined && fromEnv[n] !== "" ? fromEnv[n] : fromFile[n]);
  const host = pick("CONSOLE_HOST") || fromFile.HOST || "127.0.0.1";
  const shared = !isLoopback(host) || String(pick("ALLOW_REMOTE") || "") === "1";
  const token = String(pick("AUTH_BEARER_TOKEN") || "").trim();
  let error = null;
  if (shared) {
    if (!token) error = "AUTH_BEARER_TOKEN is not set.";
    else if (token.length < MIN_TOKEN_LENGTH) error = `AUTH_BEARER_TOKEN is too short. Use at least ${MIN_TOKEN_LENGTH} characters.`;
    else if (new Set(token).size < 10) error = "AUTH_BEARER_TOKEN is too simple. Use a long random code.";
  }
  return { host, shared, token, error, secureCookie: String(pick("COOKIE_SECURE") || "") === "1" };
}

/** The message people see when the server refuses to start. */
export function refuseMessage(cfg) {
  return [
    "",
    `  The Brand Console will not start, because it is set to be shared with other computers (${cfg.host}${cfg.shared && isLoopback(cfg.host) ? ", ALLOW_REMOTE=1" : ""}).`,
    `  ${cfg.error}`,
    "  Anyone who can reach it could change or publish your design system without one.",
    "  Make a code with:  node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
    "  Then add it to .env as AUTH_BEARER_TOKEN=<the code>, and give it only to the people who need it.",
    "  To use the console on this computer only, take out CONSOLE_HOST, HOST, and ALLOW_REMOTE.",
    "",
  ].join("\n");
}

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// The sign-in cookie is plain base64url, so values are read as they are, never decoded.
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((p) => p.trim().split("=")).filter((p) => p[0]).map(([k, ...v]) => [k, v.join("=")]));
}

export function createAuth(cfg) {
  // The cookie holds a fingerprint of the code, not the code itself.
  const session = cfg.token ? crypto.createHash("sha256").update("brand-console-session\n" + cfg.token).digest("base64url") : "";

  /** Does this path need the access code? Checks the path as sent and as decoded, since files are found by the decoded one. */
  function needsCode(pathname) {
    if (!cfg.shared) return false;
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { return true; }
    return [pathname, decoded].some((p) => !OPEN_PATHS.has(p) && PRIVATE_PREFIXES.some((x) => p.startsWith(x)));
  }

  /** Did this request bring the access code (as a Bearer header or the sign-in cookie)? */
  function signedIn(req) {
    if (!cfg.shared) return true;
    const m = /^Bearer\s+(\S+)\s*$/i.exec(String(req.headers.authorization || ""));
    if (m && same(m[1], cfg.token)) return true;
    const c = cookies(req)[COOKIE];
    return !!c && same(c, session);
  }

  /** Only pages from this server may change things. On a shared server, its own address counts too. */
  function originAllowed(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return true;
    return cfg.shared && !!req.headers.host && (origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`);
  }

  function cookieHeader(req, value, maxAge) {
    const secure = cfg.secureCookie || req.headers["x-forwarded-proto"] === "https";
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  }

  /** Checks a typed code. Returns the Set-Cookie header to send, or throws a 401. */
  async function login(req, code) {
    if (!cfg.shared) return { cookie: null };
    if (!same(String(code || "").trim(), cfg.token)) {
      await new Promise((r) => setTimeout(r, 400)); // Slows down guessing.
      const e = new Error("That access code is not right. Check it and try again."); e.status = 401; throw e;
    }
    return { cookie: cookieHeader(req, session, 12 * 60 * 60) };
  }
  const logout = (req) => ({ cookie: cookieHeader(req, "", 0) });

  return { shared: cfg.shared, needsCode, signedIn, originAllowed, login, logout };
}
