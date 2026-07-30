import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("worker applies defensive response headers", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  for (const required of [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
    "Referrer-Policy",
  ]) {
    assert.match(worker, new RegExp(required));
  }
  assert.doesNotMatch(worker, /Access-Control-Allow-Origin[^\\n]+\\*/i);
});

test("client source avoids executable code and unsafe HTML sinks", async () => {
  const files = [
    "app/CosmosApp.tsx",
    "app/components/SearchDialog.tsx",
    "app/components/ObjectPanel.tsx",
    "app/components/CosmosScene.tsx",
  ];
  for (const relative of files) {
    const source = await readFile(new URL(relative, root), "utf8");
    assert.doesNotMatch(source, /\beval\s*\(/, relative);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/, relative);
    assert.doesNotMatch(source, /document\.write\s*\(/, relative);
  }
});
