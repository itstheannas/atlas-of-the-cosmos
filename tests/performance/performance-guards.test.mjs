import assert from "node:assert/strict";
import { stat, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("renderer batches dense objects instead of creating React components per star", async () => {
  const scene = await readFile(
    new URL("app/components/CosmosScene.tsx", root),
    "utf8",
  );
  assert.match(scene, /THREE\.Points/);
  assert.match(scene, /THREE\.InstancedMesh/);
  assert.match(scene, /disposeScene/);
  assert.match(scene, /webglcontextlost/);
  assert.doesNotMatch(scene, /cosmosCatalogue\.map\([^)]*=>\s*<\w+/);
});

test("3D renderer is route-split and heavyweight social media is not an app import", async () => {
  const app = await readFile(new URL("app/CosmosApp.tsx", root), "utf8");
  assert.match(
    app,
    /dynamic\(\s*\(\)\s*=>\s*import\("\.\/components\/ExplorerView"\)/,
  );
  assert.doesNotMatch(app, /from ["']three["']/);
  const social = await stat(new URL("public/og.png", root));
  assert.ok(social.size < 3_000_000, "social card must remain under 3 MB");
});

test("offline runtime caching is query-normalized and explicitly bounded", async () => {
  const serviceWorker = await readFile(new URL("public/sw.js", root), "utf8");
  assert.match(serviceWorker, /const MAX_RUNTIME_ENTRIES = 64/);
  assert.match(serviceWorker, /keys\.length - MAX_RUNTIME_ENTRIES/);
  assert.match(serviceWorker, /keys\s*\.slice\(0,\s*overflow\)/);
  assert.match(serviceWorker, /cache\.delete\(cachedRequest\)/);
  assert.match(serviceWorker, /`\$\{url\.origin\}\$\{url\.pathname\}`/);
  assert.doesNotMatch(serviceWorker, /normalizedKey.*url\.search/);
});
