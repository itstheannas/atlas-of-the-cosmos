import assert from "node:assert/strict";
import test from "node:test";

import { GET as getCatalogue } from "../../app/api/v1/catalogue/route.ts";
import { GET as getCatalogueAliasObject } from "../../app/api/v1/catalogue/[id]/route.ts";
import { GET as getHealth } from "../../app/api/v1/health/route.ts";
import { GET as getObject } from "../../app/api/v1/objects/[id]/route.ts";
import { GET as getOpenApi } from "../../app/api/v1/openapi/route.ts";
import { GET as getReady } from "../../app/api/v1/ready/route.ts";
import { GET as getSource } from "../../app/api/v1/sources/[id]/route.ts";
import { GET as getSources } from "../../app/api/v1/sources/route.ts";
import { GET as getTour } from "../../app/api/v1/tours/[id]/route.ts";
import { GET as getTours } from "../../app/api/v1/tours/route.ts";
import { GET as getVersion } from "../../app/api/v1/version/route.ts";

let clientSequence = 0;

function apiRequest(path, init = {}) {
  clientSequence += 1;
  const headers = new Headers(init.headers);
  headers.set("cf-connecting-ip", `198.51.100.${clientSequence}`);
  return new Request(`https://atlas.test${path}`, { ...init, headers });
}

async function successPayload(response) {
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/json\b/,
  );
  const payload = await response.json();
  assert.equal(payload.meta.apiVersion, "v1");
  assert.equal(payload.meta.contractVersion, "1.0.0");
  return payload;
}

test("health, readiness, and version endpoints report the bundled service", async () => {
  const healthResponse = await getHealth(apiRequest("/api/v1/health"));
  const health = await successPayload(healthResponse);
  assert.equal(health.data.status, "ok");
  assert.equal(healthResponse.headers.get("cache-control"), "no-store");

  const readyResponse = await getReady(apiRequest("/api/v1/ready"));
  const ready = await successPayload(readyResponse);
  assert.equal(ready.data.status, "ready");
  assert.equal(ready.data.checks.catalogue.records, 49);
  assert.equal(ready.data.checks.tours.records, 7);
  assert.equal(ready.data.checks.sources.records, 9);

  const version = await successPayload(
    await getVersion(apiRequest("/api/v1/version")),
  );
  assert.equal(version.data.apiVersion, "v1");
  assert.equal(
    version.data.datasets.sampleStatus,
    "curated-educational-sample",
  );
  assert.equal(version.data.endpoints.catalogue, "/api/v1/catalogue");
});

test("catalogue search supports relevance, bounded typo tolerance, and provenance", async () => {
  const exact = await successPayload(
    await getCatalogue(apiRequest("/api/v1/catalogue?q=NAIF%20399&limit=1")),
  );
  assert.equal(exact.data.items[0].id, "earth");
  assert.equal(exact.data.items[0].match.kind, "identifier-exact");
  assert.equal(exact.data.items[0].dataClassification.catalogueBacked, true);
  assert.ok(
    exact.data.items[0].sources.some(
      (source) => source.id === "nasa-solar-system",
    ),
  );

  const fuzzy = await successPayload(
    await getCatalogue(apiRequest("/api/v1/catalogue?q=Andromdeda&limit=1")),
  );
  assert.equal(fuzzy.data.items[0].id, "andromeda-galaxy");
  assert.equal(fuzzy.data.items[0].match.kind, "fuzzy");
});

test("catalogue filters and deterministic cursor pagination compose safely", async () => {
  const filtered = await successPayload(
    await getCatalogue(
      apiRequest(
        "/api/v1/catalogue?type=terrestrial%20planet&source=nasa-solar-system",
      ),
    ),
  );
  assert.ok(filtered.data.items.length >= 4);
  assert.ok(
    filtered.data.items.every(
      (item) =>
        item.objectType === "terrestrial planet" &&
        item.sources.some((source) => source.id === "nasa-solar-system"),
    ),
  );

  const firstPage = await successPayload(
    await getCatalogue(apiRequest("/api/v1/catalogue?limit=3")),
  );
  assert.equal(firstPage.data.page.returned, 3);
  assert.equal(firstPage.data.page.total, 49);
  assert.ok(firstPage.data.page.nextCursor);

  const secondPage = await successPayload(
    await getCatalogue(
      apiRequest(
        `/api/v1/catalogue?limit=3&cursor=${encodeURIComponent(firstPage.data.page.nextCursor)}`,
      ),
    ),
  );
  const firstIds = new Set(firstPage.data.items.map((item) => item.id));
  assert.ok(secondPage.data.items.every((item) => !firstIds.has(item.id)));
  assert.deepEqual(
    [...firstPage.data.items, ...secondPage.data.items].map(
      (item) => item.name,
    ),
    [...firstPage.data.items, ...secondPage.data.items]
      .map((item) => item.name)
      .toSorted((first, second) =>
        first.localeCompare(second, "en", { sensitivity: "base" }),
      ),
  );

  const mismatched = await getCatalogue(
    apiRequest(
      `/api/v1/catalogue?type=terrestrial%20planet&cursor=${encodeURIComponent(firstPage.data.page.nextCursor)}`,
    ),
  );
  assert.equal(mismatched.status, 400);
  assert.equal((await mismatched.json()).error.code, "CURSOR_MISMATCH");
});

test("object endpoints expose explicit scientific projections without renderer fields", async () => {
  const context = { params: Promise.resolve({ id: "earth" }) };
  const payload = await successPayload(
    await getObject(apiRequest("/api/v1/objects/earth"), context),
  );
  assert.equal(payload.data.object.name, "Earth");
  assert.equal(payload.data.object.distance.unit, "au");
  assert.equal(payload.data.object.coordinates.sourceId, "jpl-horizons");
  assert.ok(
    payload.data.object.sources.some(
      (source) =>
        source.linkScope === "object-record" &&
        source.recordUrl.startsWith("https://science.nasa.gov/"),
    ),
  );
  assert.equal(
    payload.data.object.provenance.sampleStatus,
    "curated-educational-sample",
  );
  assert.equal("visual" in payload.data.object, false);
  assert.equal("textureMode" in payload.data.object, false);

  const aliasPayload = await successPayload(
    await getCatalogueAliasObject(
      apiRequest("/api/v1/catalogue/earth"),
      context,
    ),
  );
  assert.deepEqual(aliasPayload.data.object, payload.data.object);

  const missing = await getObject(
    apiRequest("/api/v1/objects/not-a-real-object"),
    { params: { id: "not-a-real-object" } },
  );
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, "NOT_FOUND");
});

test("tour and source endpoints provide validated public metadata and details", async () => {
  const tours = await successPayload(
    await getTours(apiRequest("/api/v1/tours")),
  );
  assert.equal(tours.data.total, 7);
  assert.ok(
    tours.data.items.every(
      (tour) =>
        tour.presentation.capabilities.completeTranscript &&
        tour.presentation.capabilities.reducedMotionAlternative,
    ),
  );

  const tour = await successPayload(
    await getTour(apiRequest("/api/v1/tours/our-cosmic-address"), {
      params: { id: "our-cosmic-address" },
    }),
  );
  assert.equal(tour.data.tour.schemaVersion, "1.0.0");
  assert.ok(tour.data.tour.chapters.length >= 6);
  assert.ok(tour.data.tour.chapters.every((chapter) => chapter.transcript));
  assert.ok(
    tour.data.tour.chapters.every((chapter) => chapter.sourceIds.length > 0),
  );
  assert.ok(
    tour.data.tour.sources.some((source) => source.url.startsWith("https://")),
  );
  assert.ok(
    tour.data.tour.sources.every(
      (source) =>
        source.url.startsWith("https://") ||
        (source.url.startsWith("/") && !source.url.startsWith("//")),
    ),
  );

  const sources = await successPayload(
    await getSources(apiRequest("/api/v1/sources")),
  );
  assert.equal(sources.data.total, 9);
  assert.ok(sources.data.items.every((source) => source.licence));

  const source = await successPayload(
    await getSource(apiRequest("/api/v1/sources/gaia-dr3"), {
      params: Promise.resolve({ id: "gaia-dr3" }),
    }),
  );
  assert.equal(source.data.source.id, "gaia-dr3");
  assert.ok(source.data.source.citation.url.startsWith("https://"));
  assert.ok(source.data.source.validationRules.length > 0);
  assert.ok(source.data.source.knownLimitations.length > 0);
});

test("cacheable responses return stable ETags and support revalidation", async () => {
  const first = await getCatalogue(
    apiRequest("/api/v1/catalogue?q=Earth&limit=1"),
  );
  assert.equal(first.status, 200);
  const etag = first.headers.get("etag");
  assert.match(etag ?? "", /^"sha256-[a-f0-9]{64}"$/);

  const revalidated = await getCatalogue(
    apiRequest("/api/v1/catalogue?q=Earth&limit=1", {
      headers: { "if-none-match": etag },
    }),
  );
  assert.equal(revalidated.status, 304);
  assert.equal(await revalidated.text(), "");
  assert.equal(revalidated.headers.get("etag"), etag);
  assert.match(
    revalidated.headers.get("cache-control") ?? "",
    /stale-while-revalidate/,
  );
});

test("OpenAPI endpoint returns a directly consumable 3.1 document", async () => {
  const response = await getOpenApi(apiRequest("/api/v1/openapi"));
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths["/api/v1/catalogue"]);
  assert.ok(document.components.schemas.ApiFailure);
  assert.equal("meta" in document, false);
});
