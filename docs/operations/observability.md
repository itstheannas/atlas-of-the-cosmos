# Observability and diagnostics

## Implemented signals

The reference release deliberately avoids a remote telemetry dependency. Its
implemented application signals are:

- `/api/v1/health` for process liveness;
- `/api/v1/ready` for bundled catalogue/tour/source validation;
- `/api/v1/version` for application, API, contract, catalogue revision, sample
  counts, tour schema, endpoint map, and rate-limiter limitation;
- bounded request correlation IDs on API success/error responses;
- a W3C-style `traceparent` response header, with safe continuation of valid
  version `00` incoming trace IDs and a fresh server span for every request;
- a privacy-safe structured `server.request` JSON-line event for every API
  response;
- a privacy-safe structured `server.error` JSON-line event for 5xx responses;
- a typed request-metric and error-tracking sink boundary, with a local
  JSON-line sink as the default;
- monotonic API request duration in both `server.request.durationMs` and the
  `Server-Timing: app;dur=...` response header;
- typed API errors without stack traces;
- a browser-memory diagnostic buffer exposed as
  `window.__ATLAS_DIAGNOSTICS__`;
- navigation timing, LCP, cumulative layout shift, an INP candidate, and
  long-task entries when the browser exposes the corresponding Performance
  Observer APIs;
- renderer frame rate and average frame time sampled in five-second windows
  while the scene is running;
- stable coded client-error counters for selected recovery boundaries;
- user-visible renderer readiness, resolved quality, context-loss,
  context-restored, unsupported, and failed states;
- client-visible online/offline status;
- build chunk output from `npm run build`;
- deterministic pipeline manifests and validation reports;
- CI results, Playwright reports/traces/screenshots/videos on configured
  failures, dependency-audit/licence reports, and a CycloneDX SBOM; and
- managed deployment/version state plus edge diagnostics available to the
  deployment operator.

These signals are useful diagnostics, not a complete observability system.

### Server event schema

`lib/server/observability.ts` owns the fixed, low-cardinality event contract.
The request event contains only:

- schema version, service name, and the owner `Annas M. Ishtiaq`;
- ISO recording time;
- an allowlisted operation name such as `catalogue.list`;
- generated/validated trace and span identifiers;
- a method reduced to `GET`, `HEAD`, or `OTHER`;
- numeric status and duration; and
- a stable outcome and, when applicable, a typed API error code.

The error-tracking event is emitted only for 5xx outcomes. It adds the stable
fault classification `handled-problem` or `unexpected-exception`. It never
captures an exception object, exception message, stack trace, or arbitrary
context. Sink failures are isolated from the request path.

The implementation never sends a URL, path, query string, request/response
headers, authorisation value, cookie, token, network address, request body,
search text, correlation ID, session/account identifier, or personal data to
either server sink. The API may accept a syntactically bounded correlation ID
for response correlation, but that value is deliberately excluded from the
server event schema.

Incoming `traceparent` values are accepted only when they match the bounded
version `00` format and contain non-zero trace and parent-span identifiers.
Invalid values are ignored. A valid trace ID and flags are continued, while a
fresh server span ID is generated. Trace state and arbitrary baggage are not
accepted, copied, or logged. Generated traces are unsampled by default.

The default local sink serializes exactly one JSON object per line. Request
metrics use the informational channel; 5xx error-tracking events use the error
channel. `ServerRequestMetricSink` and `ServerErrorTrackingSink` are narrow
interfaces for a future operator-approved collector. Any replacement must
retain the redacted schema, bounded operation names, failure isolation, and
tests before it is enabled.

### Client diagnostic privacy and bounds

`lib/client-observability.ts` accepts only a safe metric name, a finite numeric
value, a fixed unit, a fixed event kind, and an ISO timestamp. It retains at
most 64 entries in memory and publishes a copied snapshot. It does not record a
URL, route, query, DOM text, search string, bookmark, tour history, storage
contents, account identifier, network address, or device identifier. It does
not persist or transmit the buffer.

The `INP-candidate` entry is the greatest observed interaction-event duration
in that page session, not a complete standards-grade INP calculation. Missing
entries can mean that the browser does not support an observer type, that no
qualifying event occurred, or that the page was inspected too early. A local
snapshot is diagnostic evidence from one page session; it is not aggregate
production telemetry.

## Not implemented

The repository does not currently provide:

- a remote log, metric, trace, or error-tracking backend;
- multi-service trace export, trace-state propagation, or trace sampling;
- aggregate latency histograms, error-rate time series, or traffic counters;
- persistent or remotely collected web-vitals/renderer metrics;
- automated renderer heap/GPU-resource metrics;
- a production dashboard, SLO calculation, or alert delivery integration; or
- an application-owned retention/deletion pipeline for hosting logs.

Do not claim aggregate production monitoring, end-to-end distributed tracing,
alerting, or measured SLOs based on local structured events, health endpoints,
a single-browser buffer, and CI.

## Local diagnostic procedure

1. Run `npm run validate` and retain command output.
2. Start the final build with `npm run start`.
3. Record `/api/v1/health`, `/api/v1/ready`, and `/api/v1/version`. Confirm
   each response has `traceparent`, `server-timing`, and `x-correlation-id`.
4. Inspect the server output. Confirm each request has one parseable
   `server.request` JSON line and each intentional 5xx has one redacted
   `server.error` line. Confirm no URL, query, header, token, cookie, request
   body, correlation value, account/session identifier, exception text, or
   stack appears.
5. In browser developer tools, inspect
   `window.__ATLAS_DIAGNOSTICS__`. Confirm `schemaVersion: 1`,
   `privacyMode: "local-only-no-identifiers"`, `maximumEntries: 64`, and no
   unexpected fields.
6. Exercise the runbook principal flow for at least one five-second renderer
   window while recording browser console/network errors and a performance
   trace where performance is under review.
7. Run the desktop performance smoke and retain
   `outputs/performance-smoke.json` with the release evidence.
8. Simulate WebGL context loss and verify visible diagnostic state/recovery.
9. Verify service-worker activation, the two v2 caches, offline fallback, and
   recovery.
10. Record commit, dataset revision, browser/OS/GPU, quality, viewport,
    timestamps, correlation IDs relevant to a failure, and exact reproduction.
11. Redact secrets, identity headers, cookies, IP addresses, full browser
    storage, and unrelated user data before attaching evidence.

Do not use recent searches, bookmarks, tour progress, or precise interaction
histories as telemetry.

## Production operator requirements

Before enabling central logs, metrics, traces, or error tracking:

- define the operational question and minimum fields;
- classify each field for privacy/security risk;
- exclude authorisation headers, cookies, tokens, full session IDs, identity
  headers, search text, bookmarks, and browser-storage content;
- set access roles, region, retention, deletion, and incident-use rules;
- sample high-volume events and bound cardinality;
- keep the current fixed server-event schema or document and test every added
  field;
- prevent correlation IDs from becoming durable user identifiers;
- document provider/subprocessor behaviour in the deployed privacy notice;
- add failure-safe buffering/back-pressure so telemetry cannot break the
  product; and
- test redaction and secret absence in source, browser bundles, logs, and
  exported reports.

An operator should define availability and latency objectives only after a
representative traffic profile and measurement pipeline exist. Alerting
guidance should cover readiness failure, sustained 5xx/latency, asset/version
mismatch, deployment failure, scientific-integrity incident, and security
events without turning single-client GPU problems into noisy global alerts.
