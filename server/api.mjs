// The console's API, run by the Cloudflare Worker's Durable Object (worker/design-system.mjs).
// Each route gets the request's JSON body. The server around it reads the body, decides who may call,
// and sends the answer. Errors with a status (like 409 for "no edits to add") go back as they are.
//
// store holds the edits (server/store.mjs). proposals turns them into a pull request (server/proposals.mjs).
// info(): { ai, model, storybook, github }, the parts of the console's state that come from the server's setup.
//   github is { repo, branch }, so the console can say where proposals go.
// roleOf(user): "viewer", "editor", or "admin". Everyone is an admin for now; later the roles come from Microsoft
//   Entra ID groups. The browser never decides a role: the server's role replaces any the browser sends.
import { ENGINE_VERSION, engineBehind } from "./engine.mjs";

export function createApi({ store, proposals, figma, ask, info, roleOf = () => "admin" }) {
  async function state(user) {
    // The proposal first: if it has just landed, the reads after it see the new main.
    const prop = await proposals.status();
    const [draft, published, history, figmaStatus] = await Promise.all([store.draft(), store.published(), proposals.releases(), figma.status()]);
    const i = info();
    const me = user ? { email: user.email, name: user.name || "", role: roleOf(user) } : null;
    return { draft, published, engine: { version: ENGINE_VERSION, behind: engineBehind(published.version) }, proposal: prop.proposal, base: prop.base, notice: prop.notice, history, ai: !!i.ai, model: i.ai ? i.model : null, storybook: i.storybook, figma: figmaStatus, github: i.github || null, me };
  }
  const who = (user) => (user ? { email: user.email, name: user.name || "" } : {});
  const withRole = (b, user) => ({ ...b, role: roleOf(user) });
  const routes = {
    "GET /api/state": (b, user) => state(user),
    "PUT /api/draft": (b) => store.saveDraft(b.draft),
    // A change: the edits, with a note and a bump, become one commit on the proposal. The first opens it.
    "POST /api/proposal/add": async (b, user) => { await proposals.add({ note: b.note, bump: b.bump, who: who(user) }); return state(user); },
    "POST /api/proposal/submit": async (b, user) => { await proposals.submit(); return state(user); },
    "POST /api/proposal/withdraw": async (b, user) => { await proposals.withdraw(); return state(user); },
    "POST /api/proposal/dismiss": async (b, user) => { await proposals.dismiss(); return state(user); },
    // Makes the edits an earlier version. It reaches apps only when it is added to a proposal and lands.
    "POST /api/rollback": async (b, user) => { await store.restore(await proposals.stateOfVersion(String(b.version || ""))); return state(user); },
    "POST /api/ask": async (b) => ({ text: await ask(b.turns || []) }),
    "GET /api/health": () => ({ ok: true }),
    "POST /api/fonts": (b) => store.saveFont(b),
    "GET /api/figma": () => figma.status(),
    "POST /api/figma/connect": (b) => figma.connect(b),
    "POST /api/figma/link": (b) => figma.setLink(b),
    "POST /api/figma/disconnect": (b) => figma.disconnect(b),
    "POST /api/figma/compare": (b, user) => figma.compare(withRole(b, user)),
    "POST /api/figma/apply": async (b, user) => ({ ...(await figma.apply(withRole(b, user))), ...(await state(user)) }),
    "GET /api/figma/files": () => figma.exportFiles(),
    "POST /api/figma/files/compare": (b, user) => figma.compareFiles(withRole(b, user)),
    "POST /api/figma/files/apply": async (b, user) => ({ ...(await figma.applyFiles(withRole(b, user))), ...(await state(user)) }),
  };
  return {
    /** True when method and path name a route. */
    has: (method, path) => Object.hasOwn(routes, `${method} ${path}`),
    /** Runs a route. body is the parsed JSON body ({} for none). user is the signed-in person, when the server knows. */
    call: (method, path, body = {}, user = null) => routes[`${method} ${path}`](body || {}, user),
  };
}
