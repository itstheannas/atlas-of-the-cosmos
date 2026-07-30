import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import test from "node:test";

import { sha256File } from "../../pipelines/lib/integrity.mjs";
import { generateProceduralStarContext } from "../../pipelines/lib/procedural-context.mjs";
import {
  equatorialTileAddress,
  groupObjectsIntoTiles,
} from "../../pipelines/lib/spatial-tiles.mjs";
import { isStrictChildPath } from "../../pipelines/lib/safe-path.mjs";
import path from "node:path";
import { normaliseOpenNgcDataset } from "../../pipelines/lib/normalise-openngc.mjs";

const root = new URL("../../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

test("immutable raw excerpt matches its provenance manifest checksum", async () => {
  const sourceManifest = await readJson(
    "data/manifests/sources/openngc-v20231203.sample.json",
  );
  const rawUrl = new URL(
    "data/raw/openngc/v20231203/selected-records.json",
    root,
  );
  assert.equal(await sha256File(rawUrl), sourceManifest.rawSha256);
  assert.equal(sourceManifest.licence, "CC-BY-SA-4.0");
  assert.equal(sourceManifest.datasetVersion, "v20231203");
});

test("normaliser rejects malformed records without discarding valid records", async () => {
  const raw = await readJson(
    "data/raw/openngc/v20231203/selected-records.json",
  );
  const malformed = structuredClone(raw);
  malformed.records.push({
    ...malformed.records[0],
    name: "NGC-BROKEN",
    rightAscension: "99:99:99",
  });
  const result = normaliseOpenNgcDataset(malformed);
  assert.equal(result.accepted.length, 4);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].sourceIdentifier, "NGC-BROKEN");
  assert.match(result.rejected[0].reason, /Right ascension/);
});

test("pipeline output manifest hashes the normalized catalogue", async () => {
  const manifest = await readJson(
    "data/derived/openngc-sample/v20231203/manifest.json",
  );
  const catalogueUrl = new URL(
    "data/derived/openngc-sample/v20231203/catalogue.json",
    root,
  );
  assert.equal(await sha256File(catalogueUrl), manifest.sha256);
  assert.equal(manifest.recordsAccepted, 4);
  assert.equal(manifest.recordsRejected, 0);
});

test("validation report records scientific and layer-separation checks", async () => {
  const report = await readJson(
    "data/derived/openngc-sample/v20231203/validation-report.json",
  );
  assert.equal(report.status, "passed");
  assert.equal(report.checks.explicitUnitsAndPassbands, "passed");
  assert.equal(report.checks.proceduralSeparation, "passed");
  assert.equal(report.checks.previewAndDetailTileCompression, "passed");
  assert.deepEqual(report.rejectedRecords, []);
});

test("generated tiles are compressed, catalogue-labelled, and indexed", async () => {
  const index = await readJson(
    "data/derived/openngc-sample/v20231203/tile-index.json",
  );
  assert.match(index.schemeLimitations[0], /not HEALPix/);
  const artefact = index.previewTiles[0];
  assert.equal(artefact.mediaType, "application/json");
  assert.equal(artefact.contentEncoding, "gzip");
  const compressed = await readFile(
    new URL(`data/derived/openngc-sample/v20231203/${artefact.path}`, root),
  );
  const tile = JSON.parse(gunzipSync(compressed).toString("utf8"));
  assert.equal(tile.dataOrigin, "catalogue");
  assert.equal(tile.representation, "preview");
  assert.ok(tile.records.every((record) => record.dataOrigin === "catalogue"));
});

test("equal-angle tiler is deterministic at coordinate boundaries", () => {
  assert.deepEqual(equatorialTileAddress(0, -90, 0), {
    level: 0,
    x: 0,
    y: 0,
    key: "L0/x0/y0",
    scheme: "equal-angle-equatorial-j2000",
  });
  assert.deepEqual(equatorialTileAddress(359.999, 90, 0), {
    level: 0,
    x: 3,
    y: 1,
    key: "L0/x3/y1",
    scheme: "equal-angle-equatorial-j2000",
  });
  assert.throws(() => equatorialTileAddress(360, 0, 0), /Right ascension/);
});

test("catalogue tile grouping never accepts procedural points as objects", async () => {
  const catalogue = await readJson("data/sample/catalogue.v1.json");
  const groups = groupObjectsIntoTiles(catalogue.objects, 1);
  assert.equal(
    groups.reduce((count, group) => count + group.objects.length, 0),
    4,
  );
  assert.ok(
    groups
      .flatMap((group) => group.objects)
      .every((object) => object.dataOrigin === "catalogue"),
  );
});

test("procedural context is deterministic and has no per-point identifiers", () => {
  const first = generateProceduralStarContext("stable-seed", 8);
  const second = generateProceduralStarContext("stable-seed", 8);
  assert.deepEqual(first, second);
  assert.equal(first.dataOrigin, "procedural");
  assert.equal(first.layerCanBeDisabled, true);
  assert.match(first.disclaimer, /not catalogue objects/i);
  assert.ok(
    first.points.every(
      (point) =>
        !Object.hasOwn(point, "id") &&
        !Object.hasOwn(point, "name") &&
        !Object.hasOwn(point, "catalogueIdentifier"),
    ),
  );
});

test("derived-output containment is platform-neutral", () => {
  assert.equal(
    isStrictChildPath(
      "/workspace/data/derived",
      "/workspace/data/derived/openngc/v1",
      path.posix,
    ),
    true,
  );
  assert.equal(
    isStrictChildPath(
      "/workspace/data/derived",
      "/workspace/data/raw",
      path.posix,
    ),
    false,
  );
  assert.equal(
    isStrictChildPath(
      "C:\\workspace\\data\\derived",
      "C:\\workspace\\data\\derived\\openngc\\v1",
      path.win32,
    ),
    true,
  );
  assert.equal(
    isStrictChildPath(
      "C:\\workspace\\data\\derived",
      "C:\\workspace\\data\\raw",
      path.win32,
    ),
    false,
  );
});
