# Operations runbook

## Service description

Atlas is a vinext/React application served by a portable Worker with static
assets, a bundled sample catalogue, and a same-process read-only `/api/v1`.
The principal user value is available without a database or upstream catalogue
service. Client bookmarks, recent lists, tour progress, and preferences stay
on the user's device.

## Healthy means

- the root route returns successful HTML;
- `/api/v1/health` returns `ok`, `/api/v1/ready` returns `ready`, and
  `/api/v1/version` matches the release record;
- direct section URLs render rather than returning an error;
- navigation, search, object details, and tour controls are usable;
- the semantic catalogue remains available if the 3D scene cannot start;
- assets load without a recurring retry loop;
- malformed/unsupported stored JSON and rejected storage access fall back to a
  usable in-memory session; and
- `window.__ATLAS_DIAGNOSTICS__` exposes a bounded local-only snapshot without
  user identifiers or network transmission; and
- the deployed build and displayed dataset versions match the release record.

## Release smoke check

Run after staging and production deployment:

1. Open `/` in a clean browser context.
2. Confirm the Atlas title, primary navigation, and main landmark are present.
3. Open the catalogue, search for a known bundled object, and inspect its
   provenance/status.
4. Select an object in the explorer and confirm details match the catalogue.
5. Start a tour, pause, resume, then exit; user input must remain responsive.
6. Toggle procedural context and a scientific layer.
7. Change a preference, reload, and verify only that preference persists.
8. Add and remove a bookmark.
9. Navigate directly to representative section URLs.
10. Enable OS reduced motion and verify long travel is removed or shortened.
11. Use keyboard-only navigation and confirm focus remains visible.
12. Test a narrow viewport and 200% text zoom.
13. Disable WebGL or simulate a context failure; verify useful non-3D content.
14. Inspect console and network panels for unexpected errors, remote trackers,
    secrets, failed assets, and unbounded requests.
15. Inspect response security and cache headers.
16. Check health/readiness/version, one catalogue query, an ETag/304 response,
    a rejected invalid query, and provider-edge rate limiting.
17. Reload under service-worker control, test the documented offline fallback,
    reconnect, and confirm the active worker/cache updates cleanly.
18. Inspect `window.__ATLAS_DIAGNOSTICS__`; confirm the documented schema,
    64-entry bound, privacy mode, and expected renderer metrics after at least
    one five-second scene window.
19. Confirm the managed Sites access policy remains owner-only with no user
    group, workspace group, or tenant group grant.

Record browser/OS, viewport, commit, build/dataset version, URL, timestamp, and
failures. A screenshot alone is not a pass.

## Local diagnostics

```bash
npm run validate
npm run security:audit
npm run start
```

For development, the local Worker preview runtime writes ignored project-local
diagnostic output that may contain request metadata. Do not attach it before
reviewing and redacting sensitive fields.

API handlers also emit fixed-schema `server.request` JSON lines and redacted
`server.error` lines for 5xx outcomes. They intentionally exclude URLs,
queries, headers, cookies, tokens, bodies, correlation values, personal data,
exception messages, and stacks. Verify `traceparent` and `Server-Timing`
response headers when diagnosing an API request.

The application also publishes a page-session diagnostic snapshot at
`window.__ATLAS_DIAGNOSTICS__`. It contains only stable metric names, finite
numeric values, fixed units/kinds, and timestamps; it retains at most 64
entries and is neither persisted nor transmitted. Depending on browser
support, it can contain navigation timing, LCP, CLS, an INP candidate, long
tasks, coded client errors, renderer frame rate, and average frame time.
Missing entries are not proof that an event did not occur.

The desktop `@performance` browser test writes
`outputs/performance-smoke.json`. Retain the file only with the matching commit
and environment record; its broad budgets are a regression smoke, not a
representative hardware benchmark. The recorded release-baseline run passed;
rerun it for every release commit.

When a browser issue is reported, collect:

- release URL and approximate time;
- browser/OS/device and graphics adapter if relevant;
- route and smallest reproducible interaction;
- whether reduced motion, contrast, zoom, or assistive technology was active;
- console error text with secrets removed; and
- whether semantic content still worked.

Do not request a user's full local-storage dump or identity headers.

## Common failure playbooks

### Blank or failed 3D view

1. Confirm semantic catalogue/content is present.
2. Inspect WebGL capability and context-loss messages.
3. Reset saved quality settings.
4. Retry at Low quality and normal pixel ratio.
5. Check for a release-specific asset or shader error.
6. If widespread, rollback; if device-specific, document the browser/GPU and
   keep the fallback usable.

### Repeated loading or failed asset

1. Identify the exact request and status.
2. Check whether the deployed HTML references an artefact from another build.
3. Verify cache headers and deployment completion.
4. Test in a fresh context to distinguish corrupt cache from origin failure.
5. Roll back if the build manifest and deployed assets disagree.

### Search or object details disagree

1. Capture object ID, source status, and displayed build/dataset version.
2. Compare the bundled content, machine-readable manifest, and pipeline report.
3. Treat a catalogue/procedural misclassification as a release-blocking
   scientific-integrity incident.
4. Correct source/transformation with review; never patch the display value
   alone.

### Bad persisted state

1. Verify the app offers reset and survives malformed/unsupported JSON.
2. Clear Atlas site data in a test profile.
3. If reset fixes the issue, inspect schema migration and bounding logic.
4. Ship a migration or safe reset; do not attempt to preserve unknown fields.
5. Test a browser profile/policy where `localStorage` access throws; confirm
   the in-memory session and non-persistence status message remain usable.

### Stale or excessive service-worker cache

1. Inspect the controlling worker and `atlas-cosmos-shell-v2` /
   `atlas-cosmos-runtime-v2` caches.
2. Compare cached navigation/static responses with the active deployment.
3. Test reload online, then offline, in both an existing and fresh context.
4. Clear site data as a user recovery path.
5. Confirm queries are absent from cache keys and the runtime cache stays at or
   below 64 entries; remember this is a count cap, not a byte quota.
6. Use in-app reset and verify only cache names beginning `atlas-cosmos-` are
   deleted; unrelated origin caches must remain untouched.

### API unavailable or inconsistent

1. Check `/api/v1/health`, then `/api/v1/ready` and `/api/v1/version`.
2. Capture the correlation ID without attaching identity or secret material.
3. Compare application and catalogue revisions with the release record.
4. Check cache/ETag behaviour and whether an edge rule is rewriting responses.
5. Remember the in-process limiter is per isolate; investigate provider-edge
   limits for distributed traffic.
6. Roll back if the API projection and bundled UI disagree.

### Deployment outage

1. Check Sites deployment status and hosting-provider status.
2. Determine whether the last release changed runtime/configuration.
3. Roll back to the last known-good saved version when user impact is material.
4. Follow the [incident-response process](incident-response.md).

## Observability boundary

The repository does not configure a remote error tracker, distributed tracing
backend, persistent metrics collector, or behavioural analytics. The bounded
local browser snapshot, CI results, Sites deployment status, provider-edge
signals, browser reports, and structured release records are the available
sources. An operator adding remote telemetry must update privacy documentation,
retention, access controls, consent requirements, redaction, and this runbook
before collection begins.
