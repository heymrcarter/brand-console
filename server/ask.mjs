// Asks Claude for the console's guide. Uses only fetch, so the Node server and the Cloudflare Worker share it.
export function createAsk({ key, model, fetch: fetchFn = globalThis.fetch, missingKeyHelp = "Add ANTHROPIC_API_KEY to the .env file." }) {
  return async function ask(turns) {
    if (!key) throw Object.assign(new Error(`No Claude API key is set. ${missingKeyHelp}`), { status: 503 });
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1200, messages: turns }),
    });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(j?.error?.message || `Claude returned an error (${r.status}).`), { status: 502 });
    return (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  };
}
