import assert from "node:assert/strict";
import test from "node:test";

import { GET as getCatalogue } from "../../app/api/v1/catalogue/route.ts";
import { GET as getObject } from "../../app/api/v1/objects/[id]/route.ts";
import { InMemoryRateLimiter } from "../../lib/server/rate-limit.ts";

let securityClientSequence = 0;

function securityRequest(path, init = {}) {
  securityClientSequence += 1;
  const headers = new Headers(init.headers);
  headers.set("cf-connecting-ip", `203.0.113.${securityClientSequence}`);
  return new Request(`https://atlas.test${path}`, { ...init, headers });
}

async function assertTypedError(response, expectedStatus, expectedCode) {
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const payload = await response.json();
  assert.equal(payload.error.code, expectedCode);
  assert.match(payload.error.correlationId, /^[A-Za-z0-9][A-Za-z0-9._:-]+$/);
  assert.equal(payload.meta.apiVersion, "v1");
  return payload;
}

test("strict query validation rejects pollution, unknown fields, and invalid bounds", async () => {
  const duplicate = await getCatalogue(
    securityRequest("/api/v1/catalogue?q=Earth&q=Mars"),
  );
  const duplicatePayload = await assertTypedError(
    duplicate,
    400,
    "INVALID_QUERY",
  );
  assert.equal(duplicatePayload.error.details[0].field, "q");

  await assertTypedError(
    await getCatalogue(
      securityRequest("/api/v1/catalogue?includeInternal=true"),
    ),
    400,
    "INVALID_QUERY",
  );
  await assertTypedError(
    await getCatalogue(securityRequest("/api/v1/catalogue?limit=51")),
    400,
    "INVALID_QUERY",
  );
  await assertTypedError(
    await getCatalogue(
      securityRequest("/api/v1/catalogue?cursor=not%2Bbase64"),
    ),
    400,
    "INVALID_CURSOR",
  );
});

test("request-size and method guards run before endpoint work", async () => {
  await assertTypedError(
    await getCatalogue(
      securityRequest("/api/v1/catalogue", {
        headers: { "content-length": "16385" },
      }),
    ),
    413,
    "PAYLOAD_TOO_LARGE",
  );

  const methodResponse = await getCatalogue(
    securityRequest("/api/v1/catalogue", { method: "POST" }),
  );
  await assertTypedError(methodResponse, 405, "METHOD_NOT_ALLOWED");
  assert.equal(methodResponse.headers.get("allow"), "GET, HEAD");
});

test("correlation IDs are bounded and untrusted values are not reflected", async () => {
  const accepted = await getCatalogue(
    securityRequest("/api/v1/catalogue?limit=1", {
      headers: { "x-correlation-id": "atlas-test:request-42" },
    }),
  );
  assert.equal(
    accepted.headers.get("x-correlation-id"),
    "atlas-test:request-42",
  );

  const rejected = await getCatalogue(
    securityRequest("/api/v1/catalogue?unknown=true", {
      headers: { "x-correlation-id": "<script>alert(1)</script>" },
    }),
  );
  const payload = await assertTypedError(rejected, 400, "INVALID_QUERY");
  assert.notEqual(payload.error.correlationId, "<script>alert(1)</script>");
  assert.doesNotMatch(payload.error.correlationId, /[<>]/);
});

test("JSON output and explicit projections contain no HTML or internal renderer fields", async () => {
  const injection = encodeURIComponent(
    `"><script>alert(document.domain)</script> OR 1=1 --`,
  );
  const response = await getCatalogue(
    securityRequest(`/api/v1/catalogue?q=${injection}`),
  );
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/json\b/,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  const body = await response.text();
  assert.doesNotMatch(body, /stack|lib[\\/]server|node_modules/i);

  const objectResponse = await getObject(
    securityRequest("/api/v1/objects/earth"),
    { params: { id: "earth" } },
  );
  const objectBody = await objectResponse.text();
  assert.doesNotMatch(objectBody, /textureMode|css-procedural/);
  assert.equal(objectResponse.headers.get("access-control-allow-origin"), null);
});

test("resource identifiers reject traversal-like and oversized input", async () => {
  const traversal = await getObject(securityRequest("/api/v1/objects/%2e%2e"), {
    params: { id: ".." },
  });
  await assertTypedError(traversal, 400, "INVALID_RESOURCE_ID");

  const oversizedId = `a${"-segment".repeat(20)}`;
  const oversized = await getObject(
    securityRequest(`/api/v1/objects/${oversizedId}`),
    { params: { id: oversizedId } },
  );
  await assertTypedError(oversized, 400, "INVALID_RESOURCE_ID");
});

test("in-memory limiter enforces a bounded window and resets deterministically", () => {
  let now = 1_000;
  const limiter = new InMemoryRateLimiter({
    limit: 2,
    windowMs: 1_000,
    maxEntries: 2,
    now: () => now,
  });

  assert.deepEqual(limiter.consume("client-a"), {
    allowed: true,
    limit: 2,
    remaining: 1,
    resetAtEpochSeconds: 2,
    retryAfterSeconds: 0,
  });
  assert.equal(limiter.consume("client-a").allowed, true);
  const denied = limiter.consume("client-a");
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterSeconds, 1);

  now = 2_000;
  assert.equal(limiter.consume("client-a").allowed, true);
  assert.equal(limiter.consume("client-b").allowed, true);
  assert.equal(limiter.consume("client-c").allowed, true);
});

test("route integration returns a typed 429 response with retry metadata", async () => {
  const headers = { "cf-connecting-ip": "203.0.113.250" };
  for (let index = 0; index < 60; index += 1) {
    const response = await getCatalogue(
      new Request("https://atlas.test/api/v1/catalogue?limit=1", { headers }),
    );
    assert.equal(response.status, 200);
  }

  const denied = await getCatalogue(
    new Request("https://atlas.test/api/v1/catalogue?limit=1", { headers }),
  );
  await assertTypedError(denied, 429, "RATE_LIMITED");
  assert.equal(denied.headers.get("ratelimit-remaining"), "0");
  assert.match(denied.headers.get("retry-after") ?? "", /^[1-9]\d*$/);
});
