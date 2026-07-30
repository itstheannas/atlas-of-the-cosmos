import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${pathname}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://atlas.test${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the final Atlas shell with evidence-aware copy", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );

  const html = await response.text();
  assert.match(html, /<title>Atlas of the Cosmos/);
  assert.match(html, /ATLAS \/ COSMOS/);
  assert.match(html, /Search objects, catalogues, and classes/);
  assert.match(html, /Preparing the scale-aware 3D scene/);
  assert.match(html, /Procedural background points are never searchable/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(
    html,
    /Your site is taking shape|react-loading-skeleton/i,
  );
});

test("server-renders functional secondary sections", async () => {
  const catalogue = await render("/catalogue");
  const catalogueHtml = await catalogue.text();
  assert.match(catalogueHtml, /A navigable scientific reference/);
  assert.match(catalogueHtml, /Catalogue-backed, derived, conceptual/);

  const learning = await render("/learning");
  const learningHtml = await learning.text();
  assert.match(learningHtml, /Learn how astronomy becomes knowledge/);
  assert.match(learningHtml, /How do we know this\?/);
});
