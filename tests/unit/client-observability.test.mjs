import assert from "node:assert/strict";
import test from "node:test";

import {
  AtlasDiagnosticBuffer,
  readAtlasDiagnostics,
  recordAtlasDiagnostic,
  reportCodedClientError,
} from "../../lib/client-observability.ts";

test("diagnostics are bounded and contain numeric metrics only", () => {
  const buffer = new AtlasDiagnosticBuffer(2);
  assert.equal(
    buffer.record(
      { kind: "web-vital", name: "LCP", value: 1234.567, unit: "ms" },
      new Date("2026-07-30T00:00:00.000Z"),
    ),
    true,
  );
  buffer.record(
    { kind: "web-vital", name: "CLS", value: 0.1234, unit: "score" },
    new Date("2026-07-30T00:00:01.000Z"),
  );
  buffer.record(
    { kind: "renderer", name: "frame-rate", value: 58.765, unit: "fps" },
    new Date("2026-07-30T00:00:02.000Z"),
  );

  assert.deepEqual(buffer.snapshot(), {
    schemaVersion: 1,
    privacyMode: "local-only-no-identifiers",
    maximumEntries: 2,
    events: [
      {
        kind: "web-vital",
        name: "CLS",
        value: 0.12,
        unit: "score",
        recordedAt: "2026-07-30T00:00:01.000Z",
      },
      {
        kind: "renderer",
        name: "frame-rate",
        value: 58.77,
        unit: "fps",
        recordedAt: "2026-07-30T00:00:02.000Z",
      },
    ],
  });
});

test("diagnostics reject unsafe names and non-finite values", () => {
  const buffer = new AtlasDiagnosticBuffer();
  assert.equal(
    buffer.record({
      kind: "coded-error",
      name: "https://example.test/?query=private",
      value: 1,
      unit: "count",
    }),
    false,
  );
  assert.equal(
    buffer.record({
      kind: "web-vital",
      name: "LCP",
      value: Number.NaN,
      unit: "ms",
    }),
    false,
  );
  assert.deepEqual(buffer.snapshot().events, []);
});

test("public helpers retain only coded local diagnostics", () => {
  const before = readAtlasDiagnostics().events.length;
  reportCodedClientError("view-load-failed");
  recordAtlasDiagnostic({
    kind: "renderer",
    name: "frame-rate",
    value: 60,
    unit: "fps",
  });
  const snapshot = readAtlasDiagnostics();
  assert.equal(snapshot.privacyMode, "local-only-no-identifiers");
  assert.equal(snapshot.events.length, before + 2);
  assert.equal(snapshot.events.at(-2)?.name, "view-load-failed");
});
