// Tokens for a GitHub App, so the Worker can commit without anyone's personal token. A GitHub App is limited to the
// repositories it is installed on, and its tokens expire after an hour.
//
// How it works: sign a JSON Web Token with the app's private key (RS256), trade it for an installation token, and
// keep that token until 5 minutes before it expires. It only uses WebCrypto and fetch, so it runs in a Worker.
//
// GitHub gives the private key as "BEGIN RSA PRIVATE KEY" (PKCS#1). WebCrypto only reads PKCS#8, so this wraps it.
// A key already in PKCS#8 ("BEGIN PRIVATE KEY") works as it is. A key pasted with \n instead of line breaks works too.

const plainErr = (status, message) => Object.assign(new Error(message), { status });
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const utf8 = (s) => new TextEncoder().encode(s);

// DER length: one byte under 128, otherwise 0x80 + how many bytes follow, then the length.
function derLength(n) {
  if (n < 128) return [n];
  const out = []; for (let x = n; x > 0; x >>= 8) out.unshift(x & 0xff);
  return [0x80 | out.length, ...out];
}
const der = (tag, body) => Uint8Array.from([tag, ...derLength(body.length), ...body]);

/** PKCS#1 RSAPrivateKey bytes, wrapped as a PKCS#8 PrivateKeyInfo for rsaEncryption. */
export function pkcs1ToPkcs8(pkcs1) {
  const version = [0x02, 0x01, 0x00];
  const rsaEncryption = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  return der(0x30, Uint8Array.from([...version, ...rsaEncryption, ...der(0x04, pkcs1)]));
}

export async function importAppKey(pem) {
  const text = String(pem || "").replace(/\\n/g, "\n").trim();
  const m = text.match(/-----BEGIN (RSA )?PRIVATE KEY-----([\s\S]+?)-----END (RSA )?PRIVATE KEY-----/);
  if (!m) throw plainErr(500, "GITHUB_APP_PRIVATE_KEY is not a private key. Paste the whole .pem file GitHub gave you, from -----BEGIN to -----END.");
  let bytes = Uint8Array.from(atob(m[2].replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  if (m[1]) bytes = pkcs1ToPkcs8(bytes);
  try {
    return await crypto.subtle.importKey("pkcs8", bytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  } catch { throw plainErr(500, "GITHUB_APP_PRIVATE_KEY could not be read as an RSA key. Paste the whole .pem file GitHub gave you."); }
}

/** The JSON Web Token an app signs to ask for an installation token. GitHub allows at most 10 minutes. */
export async function appJwt({ appId, key, now = Date.now() }) {
  const t = Math.floor(now / 1000);
  // iat is a minute early, in case this clock is ahead of GitHub's.
  const head = b64url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" }))), body = b64url(utf8(JSON.stringify({ iat: t - 60, exp: t + 540, iss: String(appId) })));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

/** Returns an async function that gives a current installation token, for createGitHubStorage({ token }). */
export function createGitHubAppToken({ appId, privateKey, installationId, apiBase = "https://api.github.com", fetch: fetchFn = globalThis.fetch, now = () => Date.now() }) {
  if (!appId || !privateKey || !installationId) throw plainErr(500, "The GitHub App needs GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_APP_INSTALLATION_ID.");
  if (!/^\d+$/.test(String(installationId))) throw plainErr(500, "GITHUB_APP_INSTALLATION_ID is a number, like 12345678. It is at the end of the app's installation page address.");
  let key = null, current = null, asking = null;
  async function fresh() {
    key = key || await importAppKey(privateKey);
    let r;
    try {
      r = await fetchFn(`${apiBase.replace(/\/$/, "")}/app/installations/${installationId}/access_tokens`, {
        method: "POST",
        headers: { authorization: `Bearer ${await appJwt({ appId, key, now: now() })}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "brand-console" },
      });
    } catch { throw plainErr(502, "The server could not reach GitHub. Try again in a moment."); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) throw plainErr(502, "GitHub did not accept the app's key. Check GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.");
    if (r.status === 404) throw plainErr(502, "GitHub could not find the app's installation. Check GITHUB_APP_INSTALLATION_ID, and that the app is installed on the repository.");
    if (!r.ok || !j.token) throw plainErr(502, `GitHub did not give the app a token (${r.status}): ${j.message || "no details"}`);
    return { token: j.token, expires: Date.parse(j.expires_at) || now() + 3600e3 };
  }
  return async function token() {
    if (current && now() < current.expires - 5 * 60e3) return current.token;
    // Several requests at once share one trip to GitHub.
    asking = asking || fresh().finally(() => { asking = null; });
    current = await asking;
    return current.token;
  };
}
