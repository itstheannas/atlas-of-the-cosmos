import assert from "node:assert/strict";
import test from "node:test";

import { NO_STORE_CACHE } from "../../lib/server/cache.ts";
import { executeApiGet } from "../../lib/server/http.ts";
import {
  JsonLineServerObservabilitySink,
  ServerObservability,
  createServerTraceContext,
} from "../../lib/server/observability.ts";

class MemorySink {
  requestEvents = [];
  errorEvents = [];

  recordRequest(event) {
    this.requestEvents.push(event);
  }

  captureError(event) {
    this.errorEvents.push(event);
  }
}

function testObservability(sink, elapsedMs = 12.345) {
  let monotonicCall = 0;
  return new ServerObservability({
    requestMetricSink: sink,
    errorTrackingSink: sink,
    clock: {
      now: () => new Date("2026-07-30T08:00:00.000Z"),
      monotonicNow: () => {
        monotonicCall += 1;
        return monotonicCall === 1 ? 100 : 100 + elapsedMs;
      },
    },
  });
}

test("trace contexts continue valid W3C trace IDs and replace parent spans", () => {
  const incomingTraceId = "0123456789abcdef0123456789abcdef";
  const incomingParentId = "0123456789abcdef";
  const context = createServerTraceContext(
    new Request("https://atlas.test/private?query=never-record-this", {
      headers: {
        traceparent: `00-${incomingTraceId}-${incomingParentId}-01`,
      },
    }),
  );

  assert.equal(context.source, "continued");
  assert.equal(context.traceId, incomingTraceId);
  assert.equal(context.traceFlags, "01");
  assert.match(context.spanId, /^[0-9a-f]{16}$/);
  assert.notEqual(context.spanId, incomingParentId);
  assert.equal(
    context.traceparent,
    `00-${incomingTraceId}-${context.spanId}-01`,
  );

  const generated = createServerTraceContext(
    new Request("https://atlas.test/", {
      headers: {
        traceparent: "00-00000000000000000000000000000000-0000000000000000-01",
      },
    }),
  );
  assert.equal(generated.source, "generated");
  assert.match(generated.traceparent, /^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
});

test("request metrics expose only the fixed privacy-safe schema", () => {
  const sink = new MemorySink();
  const observability = testObservability(sink);
  const observation = observability.begin(
    new Request("https://atlas.test/catalogue?query=private", {
      method: "GET",
      headers: {
        authorization: "Bearer never-record-this",
        cookie: "session=never-record-this",
        "x-correlation-id": "private-session-identifier",
      },
    }),
    "catalogue.list",
  );

  const measurement = observation.finish({ statusCode: 200 });
  assert.deepEqual(measurement, {
    durationMs: 12.35,
    serverTiming: "app;dur=12.35",
  });
  assert.equal(sink.requestEvents.length, 1);
  assert.equal(sink.errorEvents.length, 0);
  assert.deepEqual(Object.keys(sink.requestEvents[0]), [
    "schemaVersion",
    "service",
    "owner",
    "recordedAt",
    "operation",
    "traceId",
    "spanId",
    "kind",
    "method",
    "statusCode",
    "outcome",
    "durationMs",
  ]);

  const serialized = JSON.stringify(sink.requestEvents[0]);
  assert.doesNotMatch(
    serialized,
    /never-record|authorization|cookie|query|correlation|session/i,
  );
  observation.finish({ statusCode: 500, errorCode: "INTERNAL_ERROR" });
  assert.equal(sink.requestEvents.length, 1);
});

test("unexpected failures create redacted error events and tracing headers", async () => {
  const sink = new MemorySink();
  const observability = testObservability(sink, 4);
  const response = await executeApiGet(
    new Request("https://atlas.test/api/v1/health?token=private", {
      headers: {
        authorization: "Bearer top-secret-value",
        cookie: "identity=top-secret-value",
      },
    }),
    () => {
      throw new Error("top-secret-value from an upstream exception");
    },
    {
      cache: NO_STORE_CACHE,
      rateLimit: false,
      operation: "health",
      observability,
    },
  );

  assert.equal(response.status, 500);
  assert.match(
    response.headers.get("traceparent") ?? "",
    /^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/,
  );
  assert.equal(response.headers.get("server-timing"), "app;dur=4.00");
  assert.equal(sink.requestEvents.length, 1);
  assert.equal(sink.errorEvents.length, 1);
  assert.deepEqual(sink.errorEvents[0], {
    schemaVersion: 1,
    service: "atlas-of-the-cosmos",
    owner: "Annas M. Ishtiaq",
    recordedAt: "2026-07-30T08:00:00.000Z",
    operation: "health",
    traceId: sink.requestEvents[0].traceId,
    spanId: sink.requestEvents[0].spanId,
    kind: "server.error",
    statusCode: 500,
    durationMs: 4,
    errorCode: "INTERNAL_ERROR",
    fault: "unexpected-exception",
  });
  assert.doesNotMatch(
    JSON.stringify(sink.errorEvents[0]),
    /top-secret|authorization|cookie|token|identity|exception from/i,
  );
});

test("the JSON-line adapter emits one parseable line at the correct severity", () => {
  const lines = [];
  const sink = new JsonLineServerObservabilitySink((line, severity) => {
    lines.push({ line, severity });
  });
  const observability = testObservability(sink, 8.5);
  observability
    .begin(new Request("https://atlas.test/api/v1/ready"), "ready")
    .finish({
      statusCode: 503,
      errorCode: "SERVICE_UNAVAILABLE",
      fault: "handled-problem",
    });

  assert.equal(lines.length, 2);
  assert.equal(lines[0].severity, "info");
  assert.equal(lines[1].severity, "error");
  assert.equal(lines[0].line.includes("\n"), false);
  assert.equal(JSON.parse(lines[0].line).kind, "server.request");
  assert.equal(JSON.parse(lines[1].line).kind, "server.error");
});
