#!/usr/bin/env node

import { readFile, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeStableJson, stableStringify } from "./lib/deterministic-json.mjs";
import { sha256Bytes, sha256File, verifySha256 } from "./lib/integrity.mjs";
import { normaliseOpenNgcDataset } from "./lib/normalise-openngc.mjs";
import { generateProceduralStarContext } from "./lib/procedural-context.mjs";
import { writeTileSet } from "./lib/spatial-tiles.mjs";
import { isStrictChildPath } from "./lib/safe-path.mjs";

const PIPELINE_VERSION = "1.0.0";
const REPRODUCIBLE_TIMESTAMP = "2023-12-03T00:00:00.000Z";
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, "..");

function ensureGeneratedPath(path) {
  const derivedRoot = resolve(workspaceRoot, "data", "derived");
  const resolved = resolve(path);
  if (!isStrictChildPath(derivedRoot, resolved)) {
    throw new Error(
      `Refusing to replace path outside data/derived: ${resolved}`,
    );
  }
  return resolved;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const rawPath = join(
    workspaceRoot,
    "data",
    "raw",
    "openngc",
    "v20231203",
    "selected-records.json",
  );
  const sourceManifestPath = join(
    workspaceRoot,
    "data",
    "manifests",
    "sources",
    "openngc-v20231203.sample.json",
  );
  const outputRoot = ensureGeneratedPath(
    join(workspaceRoot, "data", "derived", "openngc-sample", "v20231203"),
  );
  const sampleCataloguePath = join(
    workspaceRoot,
    "data",
    "sample",
    "catalogue.v1.json",
  );
  const proceduralPath = join(
    workspaceRoot,
    "data",
    "sample",
    "procedural-context.v1.json",
  );

  const sourceManifest = await readJson(sourceManifestPath);
  await verifySha256(rawPath, sourceManifest.rawSha256);
  const rawDataset = await readJson(rawPath);
  if (rawDataset.source.datasetVersion !== sourceManifest.datasetVersion) {
    throw new Error("Raw dataset version does not match its source manifest.");
  }

  const normalised = normaliseOpenNgcDataset(rawDataset);
  await rm(outputRoot, { recursive: true, force: true });
  if (normalised.rejected.length > 0) {
    await writeStableJson(join(outputRoot, "validation-report.json"), {
      schemaVersion: "1.0.0",
      pipelineVersion: PIPELINE_VERSION,
      datasetVersion: "v20231203-atlas-1",
      generatedAt: REPRODUCIBLE_TIMESTAMP,
      status: "failed",
      checks: {
        sourceIntegrity: "passed",
        schemaValidation: "failed",
      },
      acceptedRecordIds: normalised.accepted.map((object) => object.id),
      rejectedRecords: normalised.rejected,
    });
    throw new Error(
      `Pipeline rejected ${normalised.rejected.length} record(s): ${JSON.stringify(
        normalised.rejected,
      )}`,
    );
  }

  const catalogue = {
    schemaVersion: "1.0.0",
    datasetId: "openngc-development-sample",
    datasetVersion: "v20231203-atlas-1",
    generatedAt: REPRODUCIBLE_TIMESTAMP,
    pipelineVersion: PIPELINE_VERSION,
    completeness:
      "Four-record development sample only; this is not the complete OpenNGC catalogue or a complete map of the sky.",
    dataOrigin: "catalogue",
    objects: normalised.accepted,
  };
  await writeStableJson(join(outputRoot, "catalogue.json"), catalogue);
  await writeStableJson(sampleCataloguePath, catalogue);

  const previewTiles = await writeTileSet(
    outputRoot,
    normalised.accepted,
    1,
    "preview",
  );
  const detailTiles = await writeTileSet(
    outputRoot,
    normalised.accepted,
    3,
    "detail",
  );
  const tileIndex = {
    schemaVersion: "1.0.0",
    scheme: "equal-angle-equatorial-j2000",
    schemeLimitations: [
      "This simple dependency-free development tiler is not HEALPix.",
      "Equal-angle cells have unequal solid angle and distortion near the celestial poles.",
      "Production-scale ingestion should use a reviewed spherical index such as HEALPix.",
    ],
    previewLevel: 1,
    detailLevel: 3,
    previewTiles,
    detailTiles,
  };
  await writeStableJson(join(outputRoot, "tile-index.json"), tileIndex);

  const procedural = generateProceduralStarContext(
    "atlas-cosmos-procedural-context-v1",
    64,
  );
  await writeStableJson(proceduralPath, procedural);

  const catalogueBytes = Buffer.from(stableStringify(catalogue), "utf8");
  const proceduralSha256 = await sha256File(proceduralPath);
  const manifest = {
    schemaVersion: "1.0.0",
    datasetId: catalogue.datasetId,
    datasetVersion: catalogue.datasetVersion,
    generatedAt: REPRODUCIBLE_TIMESTAMP,
    reproducibleTimestampPolicy:
      "Generated timestamps are pinned to the upstream release date for byte-for-byte reproducibility.",
    pipelineVersion: PIPELINE_VERSION,
    recordsAccepted: normalised.accepted.length,
    recordsRejected: normalised.rejected.length,
    sha256: sha256Bytes(catalogueBytes),
    sourceManifest: relative(workspaceRoot, sourceManifestPath).replaceAll(
      "\\",
      "/",
    ),
    sourceSha256: sourceManifest.rawSha256,
    proceduralContext: {
      path: relative(workspaceRoot, proceduralPath).replaceAll("\\", "/"),
      sha256: proceduralSha256,
      dataOrigin: "procedural",
      individuallyCatalogued: false,
    },
    tileIndex: "tile-index.json",
    provenance: normalised.accepted.flatMap((object) => object.provenance),
  };
  await writeStableJson(join(outputRoot, "manifest.json"), manifest);
  await writeStableJson(
    join(workspaceRoot, "data", "manifests", "openngc-development-sample.json"),
    manifest,
  );

  const report = {
    schemaVersion: "1.0.0",
    pipelineVersion: PIPELINE_VERSION,
    datasetVersion: catalogue.datasetVersion,
    generatedAt: REPRODUCIBLE_TIMESTAMP,
    status: "passed",
    checks: {
      sourceIntegrity: "passed",
      schemaValidation: "passed",
      coordinateRanges: "passed",
      canonicalIdUniqueness: "passed",
      provenancePresence: "passed",
      catalogueOriginLabelling: "passed",
      explicitUnitsAndPassbands: "passed",
      proceduralSeparation: "passed",
      previewAndDetailTileCompression: "passed",
    },
    acceptedRecordIds: normalised.accepted.map((object) => object.id),
    rejectedRecords: normalised.rejected,
    tileCounts: {
      preview: previewTiles.length,
      detail: detailTiles.length,
    },
    limitations: tileIndex.schemeLimitations,
  };
  await writeStableJson(join(outputRoot, "validation-report.json"), report);

  process.stdout.write(
    `Atlas catalogue pipeline passed: ${normalised.accepted.length} records, ` +
      `${previewTiles.length} preview tiles, ${detailTiles.length} detail tiles.\n`,
  );
}

await main();
