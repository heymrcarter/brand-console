// A stand-in for GitHub, served over HTTP on this computer, holding this project's design system files.
// npm start runs the console against it, and npm run test:worker tests against it, so neither needs a GitHub
// account or the internet. Everything it holds is lost when it stops.
import http from "node:http";
import { createGitHubMock } from "../test/github-mock.mjs";
import { createDiskStorage } from "../server/storage/disk.mjs";

export const FAKE_REPO = "local/design-system";
export const FAKE_TOKEN = "local-token";

/** Starts the stand-in on a free port. Resolves with { url, github, close }, where github is the mock itself. */
export async function startFakeGitHub(root, { onWrite } = {}) {
  const disk = createDiskStorage(root), files = {};
  for (const p of [...await disk.list("tokens"), ...await disk.list("releases"), ...await disk.list("dist"), ...await disk.list("build/draft"), ...await disk.list("fonts")]) files[p] = await disk.readBytes(p);
  const changelog = await disk.readBytes("CHANGELOG.md");
  if (changelog) files["CHANGELOG.md"] = changelog;
  const github = createGitHubMock({ repo: FAKE_REPO, token: FAKE_TOKEN, files });
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await github.fetch(`http://${req.headers.host}${req.url}`, { method: req.method, headers: { authorization: req.headers.authorization || "" }, body: chunks.length ? Buffer.concat(chunks).toString() : undefined });
    if (req.method === "PATCH" && r.ok && onWrite) onWrite(github.log()[0]);
    res.writeHead(r.status, { "content-type": "application/json" }); res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, github, close: () => new Promise((ok) => server.close(ok)) };
}
