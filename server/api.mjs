// The console's API, shared by the Node server (server/index.mjs) and the Cloudflare Worker (worker/).
// Each route gets the request's JSON body. The server around it reads the body, decides who may call,
// and sends the answer. Errors with a status (like 409 for "no changes to publish") go back as they are.
//
// info(): { ai, model, storybook, shared }, the parts of the console's state that come from the server's setup.
// credit(who, user): the name a publish or rollback is recorded under. The Worker adds the signed-in person.
export function createApi({ store, figma, ask, info, credit = (who) => who }) {
  async function state() {
    const [draft, published, index, figmaStatus] = await Promise.all([store.draft(), store.published(), store.index(), figma.status()]);
    const i = info();
    return { draft, published, history: index.versions, ai: !!i.ai, model: i.ai ? i.model : null, storybook: i.storybook, figma: figmaStatus, shared: !!i.shared };
  }
  const routes = {
    "GET /api/state": () => state(),
    "PUT /api/draft": (b) => store.saveDraft(b.draft),
    "POST /api/publish": async (b, user) => { const v = await store.publish({ ...b, who: credit(b.who, user) }); return { version: v, ...(await state()) }; },
    "POST /api/rollback": async (b, user) => { const v = await store.rollback({ ...b, who: credit(b.who, user) }); return { version: v, ...(await state()) }; },
    "POST /api/flag": async (b) => ({ flag: await store.flag(b.version), history: (await store.index()).versions }),
    "POST /api/ask": async (b) => ({ text: await ask(b.turns || []) }),
    "GET /api/health": () => ({ ok: true }),
    "POST /api/fonts": (b) => store.saveFont(b),
    "GET /api/figma": () => figma.status(),
    "POST /api/figma/connect": (b) => figma.connect(b),
    "POST /api/figma/link": (b) => figma.setLink(b),
    "POST /api/figma/disconnect": (b) => figma.disconnect(b),
    "POST /api/figma/compare": (b) => figma.compare(b),
    "POST /api/figma/apply": async (b) => ({ ...(await figma.apply(b)), ...(await state()) }),
    "GET /api/figma/files": () => figma.exportFiles(),
    "POST /api/figma/files/compare": (b) => figma.compareFiles(b),
    "POST /api/figma/files/apply": async (b) => ({ ...(await figma.applyFiles(b)), ...(await state()) }),
  };
  return {
    /** True when method and path name a route. */
    has: (method, path) => Object.hasOwn(routes, `${method} ${path}`),
    /** Runs a route. body is the parsed JSON body ({} for none). user is the signed-in person, when the server knows. */
    call: (method, path, body = {}, user = null) => routes[`${method} ${path}`](body || {}, user),
  };
}
