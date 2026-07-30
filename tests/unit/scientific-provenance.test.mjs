import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  cosmosCatalogue,
  cosmosDataValidationIssues,
  dataSources,
  getObjectSourceLinks,
  getScientificSourceLink,
  guidedTours,
  learningArticles,
  sourceById,
} from "../../lib/cosmos-data.ts";
import { pngChunkTypes } from "../../scripts/sanitize-social-image.mjs";

function assertSafeSourceUrl(url, message) {
  if (url.startsWith("/")) {
    assert.ok(!url.startsWith("//"), message);
    assert.ok(!url.split("/").includes(".."), message);
    return;
  }
  assert.equal(new URL(url).protocol, "https:", message);
}

test("scientific registry has complete, deterministic provenance metadata", () => {
  assert.equal(cosmosDataValidationIssues.length, 0);
  assert.equal(sourceById.size, dataSources.length);

  for (const source of dataSources) {
    assert.ok(source.provider.trim(), `${source.id}: provider`);
    assert.ok(source.dataset.trim(), `${source.id}: dataset`);
    assert.ok(source.version.trim(), `${source.id}: version`);
    assert.ok(
      source.publicationOrSnapshotDate.trim(),
      `${source.id}: publication or snapshot date`,
    );
    assert.ok(source.licence.trim(), `${source.id}: licence statement`);
    assert.ok(source.attribution.trim(), `${source.id}: attribution`);
    assert.ok(source.citation.trim(), `${source.id}: citation`);
    assert.ok(source.updateStrategy.trim(), `${source.id}: update strategy`);
    assert.ok(
      source.coordinateSystem.trim(),
      `${source.id}: coordinate system`,
    );
    assert.ok(source.uncertaintyFields.trim(), `${source.id}: uncertainty`);
    assert.ok(source.units.length > 0, `${source.id}: units`);
    assert.ok(source.validationRules.length > 0, `${source.id}: validation`);
    assert.ok(
      source.transformations.length > 0,
      `${source.id}: transformations`,
    );
    assert.ok(source.knownLimitations.length > 0, `${source.id}: limitations`);
    assertSafeSourceUrl(source.url, `${source.id}: source URL`);
    assertSafeSourceUrl(source.citationUrl, `${source.id}: citation URL`);
  }
});

test("every object field and coordinate resolves to a declared visible source", () => {
  for (const object of cosmosCatalogue) {
    const declaredSources = new Set(object.sourceIds);
    const fieldSources = [
      ...(object.distance ? [object.distance.sourceId] : []),
      ...object.facts.map((fact) => fact.sourceId),
      ...(object.coordinates ? [object.coordinates.sourceId] : []),
    ];

    assert.ok(declaredSources.size > 0, `${object.id}: object sources`);
    for (const sourceId of fieldSources) {
      assert.ok(sourceById.has(sourceId), `${object.id}: ${sourceId} exists`);
      assert.ok(
        declaredSources.has(sourceId),
        `${object.id}: ${sourceId} is listed by the object`,
      );
      const link = getScientificSourceLink(object, sourceId);
      assert.ok(link, `${object.id}: ${sourceId} has a visible link`);
      assertSafeSourceUrl(link.url, `${object.id}: ${sourceId} URL`);
    }

    const links = getObjectSourceLinks(object);
    assert.deepEqual(
      links.map((link) => link.sourceId),
      object.sourceIds,
      `${object.id}: source links preserve declared order and coverage`,
    );

    if (object.recordKind === "catalogue-backed") {
      assert.ok(object.catalogueIds.length > 0, `${object.id}: identifier`);
      assert.ok(
        links.some((link) => link.scope === "object-record"),
        `${object.id}: authoritative object-record link`,
      );
    }
    if (object.recordKind === "procedural-context") {
      assert.equal(object.catalogueIds.length, 0, `${object.id}: no fake IDs`);
    }
  }
});

test("learning explanations and tour chapters have relevant source coverage", () => {
  const objectIds = new Set(cosmosCatalogue.map((object) => object.id));

  for (const article of learningArticles) {
    assert.ok(article.sourceIds.length > 0, `${article.id}: learning sources`);
    for (const sourceId of article.sourceIds) {
      assert.ok(sourceById.has(sourceId), `${article.id}: ${sourceId}`);
    }
    for (const objectId of article.explorerObjectIds) {
      assert.ok(objectIds.has(objectId), `${article.id}: ${objectId}`);
    }
  }

  for (const tour of guidedTours) {
    const declaredSources = new Set(tour.sources.map((source) => source.id));
    assert.ok(
      tour.sources.some((source) => source.url.startsWith("https://")),
      `${tour.id}: authoritative external source`,
    );
    for (const source of tour.sources) {
      assert.ok(sourceById.has(source.id), `${tour.id}: ${source.id}`);
      assertSafeSourceUrl(source.url, `${tour.id}: ${source.id} URL`);
    }
    for (const chapter of tour.chapters) {
      assert.ok(chapter.sourceIds.length > 0, `${tour.id}/${chapter.id}`);
      for (const sourceId of chapter.sourceIds) {
        assert.ok(
          declaredSources.has(sourceId),
          `${tour.id}/${chapter.id}: ${sourceId} declared by tour`,
        );
      }
    }
  }
});

test("bundled social artwork has explicit project provenance", async () => {
  const [image, favicon, attribution] = await Promise.all([
    readFile(new URL("../../public/og.png", import.meta.url)),
    readFile(new URL("../../public/favicon.svg", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../../docs/data-sources/imagery-attribution.md",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(image.readUInt32BE(16), 1730);
  assert.equal(image.readUInt32BE(20), 909);
  assert.equal(
    createHash("sha256").update(image).digest("hex"),
    "a2208a67aa558bbec4261989edd08f4a4cbf9bd711be59c7a0ea26afede2af41",
  );
  const binaryText = image.toString("latin1");
  const prohibitedVendorPattern = new RegExp(["open", "ai"].join(""), "iu");
  assert.doesNotMatch(binaryText, prohibitedVendorPattern);
  assert.deepEqual(
    [...new Set(pngChunkTypes(image))],
    ["IHDR", "pHYs", "IDAT", "IEND"],
    "the shipped PNG contains pixel-density data only, not embedded provenance metadata",
  );
  assert.match(attribution, /Annas M\. Ishtiaq/u);
  assert.match(attribution, /2026-07-29/u);
  assert.match(attribution, /no third-party image/iu);
  assert.doesNotMatch(attribution, prohibitedVendorPattern);
  assert.match(favicon, /^<svg /u);
  assert.doesNotMatch(favicon, /<(?:script|image|foreignObject)\b/iu);
  assert.doesNotMatch(favicon, /\b(?:href|onload)=/iu);
  assert.match(attribution, /public\/favicon\.svg/u);
});

test("social-image PNG validation rejects trailing, missing, and malformed IEND data without changing the asset", async () => {
  const imageUrl = new URL("../../public/og.png", import.meta.url);
  const image = await readFile(imageUrl);
  const originalHash = createHash("sha256").update(image).digest("hex");

  assert.throws(
    () => pngChunkTypes(Buffer.concat([image, Buffer.from("trailing")])),
    /bytes after its IEND chunk/u,
  );

  const withoutIend = image.subarray(0, image.length - 12);
  assert.throws(
    () => pngChunkTypes(withoutIend),
    /missing its required IEND chunk/u,
  );

  const malformedIend = Buffer.from(image);
  malformedIend.writeUInt32BE(1, malformedIend.length - 12);
  assert.throws(
    () => pngChunkTypes(malformedIend),
    /malformed non-empty IEND chunk/u,
  );

  const unchanged = await readFile(imageUrl);
  assert.equal(
    createHash("sha256").update(unchanged).digest("hex"),
    originalHash,
  );
});
