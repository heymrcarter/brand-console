// A stand-in for GitHub, served over HTTP on this computer, holding the sample design system (fixtures/sample) the
// way the design system repository holds it: main, tagged releases, and room for proposal branches and pull
// requests. npm start runs the console against it, and npm run test:worker tests against it, so neither needs a
// GitHub account or the internet. Everything it holds is lost when it stops.
//
// Nobody can review a pull request here, so two addresses do what a reviewer and the Release workflow would:
//   POST /_local/pulls/<number>/merge   lands it: merges it, and releases the version its changesets call for
//   POST /_local/pulls/<number>/close   withdraws it
import http from "node:http";
import { sampleRepo } from "../test/helpers/sample-repo.mjs";

export const FAKE_REPO = "local/design-system";
export const FAKE_TOKEN = "local-token";

/**
 * Starts the stand-in on a free port, holding the design system in dir. Resolves with { url, github, close }.
 * onChange(message) hears about each new commit on a branch. draftPRs: false refuses draft pull requests, the way
 * GitHub does on a private repository without a paid plan.
 */
export async function startFakeGitHub(dir, { onChange, draftPRs = true } = {}) {
  const github = sampleRepo({ repo: FAKE_REPO, token: FAKE_TOKEN, draftPRs }, dir);
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const local = req.method === "POST" && req.url.match(/^\/_local\/pulls\/(\d+)\/(merge|close)$/);
    if (local) {
      const pr = github.pull(+local[1]);
      if (!pr || pr.state !== "open") { res.writeHead(404, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "There is no open pull request with that number." })); return; }
      let out;
      if (local[2] === "close") { github.close(pr.number); out = { closed: pr.number }; }
      else { const version = landedVersion(github, pr); github.merge(pr.number, { release: version }); clearChangesets(github); out = { merged: pr.number, version }; }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(out)); return;
    }
    const r = await github.fetch(`http://${req.headers.host}${req.url}`, { method: req.method, headers: { authorization: req.headers.authorization || "" }, body: chunks.length ? Buffer.concat(chunks).toString() : undefined });
    if (onChange && r.ok && /\/git\/refs/.test(req.url) && req.method !== "DELETE") onChange(JSON.parse(chunks.length ? Buffer.concat(chunks).toString() : "{}"));
    res.writeHead(r.status, { "content-type": "application/json" }); res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, github, close: () => new Promise((ok) => server.close(ok)) };
}

// The version the Release workflow would make: the biggest bump in the pull request's changesets wins.
function landedVersion(github, pr) {
  const files = github.files(pr.head.ref), order = ["patch", "minor", "major"];
  let bump = "patch";
  for (const [p, bytes] of Object.entries(files)) {
    const m = /^\.changeset\/.+\.md$/.test(p) && new TextDecoder().decode(bytes).match(/:\s*(patch|minor|major)\s*\n/);
    if (m && order.indexOf(m[1]) > order.indexOf(bump)) bump = m[1];
  }
  const [a, b, c] = JSON.parse(github.text("package.json")).version.split(".").map(Number);
  return bump === "major" ? `${a + 1}.0.0` : bump === "minor" ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
}
// The Release workflow deletes the changesets it used.
function clearChangesets(github) {
  const used = Object.keys(github.files()).filter((p) => /^\.changeset\/.+\.md$/.test(p) && !/readme\.md$/i.test(p));
  if (used.length) github.push(Object.fromEntries(used.map((p) => [p, null])), "Clear the used changesets");
}
