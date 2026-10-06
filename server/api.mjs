// The console's API, run by the Cloudflare Worker's Durable Object (worker/design-system.mjs).
// Each route gets the request's JSON body. The server around it reads the body, decides who may call,
// and sends the answer. Errors with a status (like 409 for "no changes to publish") go back as they are.
//
// info(): { ai, model, storybook, shared, github }, the parts of the console's state that come from the server's setup.
//   github is { repo, branch } when publishes go to GitHub (the Worker), so the console can say where.
// credit(who, user): the name a publish or rollback is recorded under. The Worker uses the signed-in person.
// roleOf(user): "viewer", "editor", or "admin". Everyone is an admin for now; later the roles come from Microsoft
//   Entra ID groups. The browser never decides a role: the server's role replaces any the browser sends.
export function createApi({ store, figma, ask, info, credit = (who) => who, roleOf = () => "admin" }) {
  async function state(user) {
    const [draft, published, index, figmaStatus] = await Promise.all([store.draft(), store.published(), store.index(), figma.status()]);
    const i = info();
    const me = user ? { email: user.email, name: user.name || "", role: roleOf(user) } : null;
    return { draft, published, history: index.versions, ai: !!i.ai, model: i.ai ? i.model : null, storybook: i.storybook, figma: figmaStatus, shared: !!i.shared, github: i.github || null, me };
  }
  const withRole = (b, user) => ({ ...b, role: roleOf(user) });
  const routes = {
    "GET /api/state": (b, user) => state(user),
    "PUT /api/draft": (b) => store.saveDraft(b.draft),
    "POST /api/publish": async (b, user) => { const v = await store.publish({ ...b, who: credit(b.who, user) }); return { version: v, ...(await state(user)) }; },
    "POST /api/rollback": async (b, user) => { const v = await store.rollback({ ...b, who: credit(b.who, user) }); return { version: v, ...(await state(user)) }; },
    "POST /api/flag": async (b) => ({ flag: await store.flag(b.version), history: (await store.index()).versions }),
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
