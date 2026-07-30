import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertCatalogueDataset,
  createCatalogueIndex,
  normalizeSearchText,
  parseSearchExpression,
} from "../../packages/catalogue-client/src/index.ts";

const catalogueUrl = new URL(
  "../../data/sample/catalogue.v1.json",
  import.meta.url,
);

async function loadIndex() {
  const catalogue = JSON.parse(await readFile(catalogueUrl, "utf8"));
  return createCatalogueIndex(assertCatalogueDataset(catalogue).objects);
}

test("normalization is case- and accent-insensitive", () => {
  assert.equal(normalizeSearchText("  HÉRCULES—Cluster  "), "hercules cluster");
});

test("catalogue index resolves names, identifiers, and a bounded typo", async () => {
  const index = await loadIndex();
  assert.equal(
    index.search({ text: "Andromeda Galaxy" })[0].object.id,
    "openngc:ngc0224",
  );
  assert.equal(
    index.search({ text: "OpenNGC NGC0224" })[0].matchKind,
    "identifier-exact",
  );
  assert.equal(index.search({ text: "M31" })[0].object.id, "openngc:ngc0224");
  assert.equal(
    index.search({ text: "Andromdeda" })[0].object.id,
    "openngc:ngc0224",
  );
  assert.equal(
    index.search({ text: "Orion", limit: 1 })[0].object.objectType,
    "nebula",
  );
  assert.deepEqual(index.suggest("Andro", 1), [
    {
      objectId: "openngc:ngc0224",
      label: "Andromeda Galaxy",
      objectType: "galaxy",
      dataOrigin: "catalogue",
      sourceCatalogue: "OpenNGC",
    },
  ]);
});

test("typed filters expose source and never return procedural context", async () => {
  const index = await loadIndex();
  const results = index.search({
    objectTypes: ["globular-cluster"],
    maxApparentMagnitude: { value: 6, unit: "mag" },
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].object.id, "openngc:ngc6205");
  assert.equal(results[0].dataOrigin, "catalogue");
  assert.equal(results[0].sourceCatalogue, "OpenNGC");
});

test("constellation filters accept full names and source abbreviations", async () => {
  const index = await loadIndex();
  assert.equal(
    index.search(parseSearchExpression("constellation:Taurus").query)[0].object
      .id,
    "openngc:ngc1952",
  );
  assert.equal(
    index.search(parseSearchExpression("const:Her").query)[0].object.id,
    "openngc:ngc6205",
  );
});

test("numeric parser preserves strict versus inclusive magnitude boundaries", async () => {
  const index = await loadIndex();
  const strict = index.search(parseSearchExpression("type:nebula mag<4").query);
  const inclusive = index.search(
    parseSearchExpression("type:nebula mag<=4").query,
  );
  assert.equal(strict.length, 0);
  assert.equal(inclusive[0].object.id, "openngc:ngc1976");
});

test("coordinate cone search returns angular separation", async () => {
  const index = await loadIndex();
  const parsed = parseSearchExpression(
    "type:galaxy ra:10.6847 dec:41.269 radius:0.1",
  );
  assert.deepEqual(parsed.issues, []);
  const results = index.search(parsed.query);
  assert.equal(results.length, 1);
  assert.equal(results[0].object.id, "openngc:ngc0224");
  assert.ok(results[0].angularSeparation.value < 0.01);
});

test("search parser reports malformed filters without silently accepting them", () => {
  const parsed = parseSearchExpression(
    "Crab type:not-a-real-type distance<oops ra:83",
  );
  assert.equal(parsed.query.text, "Crab");
  assert.ok(
    parsed.issues.some((issue) => /Unknown object type/.test(issue.message)),
  );
  assert.ok(parsed.issues.some((issue) => /Malformed/.test(issue.message)));
  assert.ok(parsed.issues.some((issue) => /requires ra/.test(issue.message)));
  assert.match(
    parseSearchExpression("x".repeat(513)).issues[0].message,
    /safety limit/,
  );
  assert.match(
    parseSearchExpression("distance>5kpc distance<1pc").issues[0].message,
    /Minimum distance/,
  );
});

test("index rejects duplicate internal object IDs", async () => {
  const catalogue = JSON.parse(await readFile(catalogueUrl, "utf8"));
  assert.throws(
    () => createCatalogueIndex([catalogue.objects[0], catalogue.objects[0]]),
    /Duplicate catalogue object ID/,
  );
});

test("dataset parser rejects a mixed procedural layer", async () => {
  const catalogue = JSON.parse(await readFile(catalogueUrl, "utf8"));
  catalogue.dataOrigin = "procedural";
  assert.throws(() => assertCatalogueDataset(catalogue), /dataset\.origin/);
});
