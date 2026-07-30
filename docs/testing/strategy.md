# Testing strategy

## Principles

Testing follows user and scientific risk rather than a coverage percentage.
The highest-risk boundaries are scientific transformations, provenance
classification, tour validation/interruption, persistence validation, API
input/output contracts, semantic accessibility, rendered Worker behaviour, and
renderer lifecycle/fallback.

A script or test filename is not evidence of a pass. Release records must
include the actual command, date, source commit, environment, exit status, and
relevant report.

The browser, visual, performance, observability, constellation, and
internationalisation suites changed during the compliance audit. Only counts
and measurements in the
[validation report](../operations/validation-report.md), tied to the release
source state, are release evidence.

## Exact commands

| Command                      | Current coverage                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run env:check`          | Node floor, hosting-config shape/bindings, and public secret-like environment names                          |
| `npm run format:check`       | Prettier verification                                                                                        |
| `npm run lint`               | ESLint repository check                                                                                      |
| `npm run typecheck`          | root strict TypeScript without emit                                                                          |
| `npm run typecheck:packages` | independent strict package TypeScript check                                                                  |
| `npm run data:sample`        | deterministic integrity, normalisation, tiling, manifest/report generation                                   |
| `npm run assets:sanitize`    | lossless social-card metadata removal with reviewed dimensions/pixels preserved                              |
| `npm run test:unit`          | astronomy core, coordinates, search, pipeline, and tour-engine tests                                         |
| `npm run test:integration`   | versioned API contracts plus SQLite migration/seed/constraint/parity/rollback artifacts                      |
| `npm run test:security`      | invalid API input/method/body/cursor/rate/CORS cases and source security invariants                          |
| `npm run test:a11y`          | static source checks for semantics, text alternatives, focus/motion/forced-colour CSS, and labelled controls |
| `npm run test:performance`   | static batching, disposal, context-loss, route-split, social-card-size, and bounded offline-cache guards     |
| `npm run test:coverage`      | Node coverage for imported unit/integration/security modules; excludes React/WebGL/browser execution         |
| `npm test`                   | unit + integration + security + static accessibility + performance                                           |
| `npm run build`              | production vinext/Worker compilation and chunk output                                                        |
| `npm run test:rendered`      | imports the final built Worker and checks root/secondary HTML plus response headers                          |
| `npm run test:e2e`           | desktop/mobile browser flows, axe, five visual scenarios, and a desktop runtime performance smoke            |
| `npm run test:visual`        | only the five Playwright scenarios tagged `@visual`                                                          |
| `npm run security:scan`      | working-tree secret-pattern, wildcard-CORS, eval, and unsafe-HTML scan                                       |
| `npm run security:history`   | bounded full-history credential-signature/entropy scan with value-redacted diagnostics                       |
| `npm run security:licenses`  | reviewed SPDX-expression gate and reciprocal-component report for every locked package entry                 |
| `npm run security:audit`     | npm advisory audit, failing at high/critical severity                                                        |
| `npm run sbom`               | deterministic CycloneDX 1.6 SBOM at `outputs/sbom.cdx.json`                                                  |
| `npm run validate`           | environment, format, lint, types, data, tests, scans/audit, build, rendered/Playwright tests, and SBOM       |

`npm run validate` includes the network-backed npm advisory audit at the
configured high-severity threshold. Playwright expects a completed production
build; its managed server runs the built Worker through the project-local
preview runtime.

## Test layers

### Unit and deterministic pipeline

Unit tests cover:

- explicit unit conversions, invalid values, and significant-figure
  formatting;
- equatorial, galactic, Cartesian, epoch/frame, parallax, and cosmology helper
  cases;
- catalogue/procedural discriminants, provenance, photometry, and scale
  helpers;
- cross-unit comparison canonicalisation, dimension gating, logarithmic
  positioning, intervals, and linear physical-diameter scaling;
- search parsing/ranking/filtering/typo tolerance;
- tour schema validation, playback state transitions, schematic
  camera-distance conversion, orientation, and target locking;
- client-persistence v1-to-v2 migration, versioned contiguous tour progress,
  Atlas-prefixed cache deletion, bounded local diagnostics, translation-key
  parity/fallback, and RTL direction resolution; and
- social-card provenance, dimensions, allowed PNG chunks, and locked SHA-256;
  the sanitizer separately verifies pixel equality before writing; and
- deterministic sample integrity, normalisation, index/tile generation,
  validation reports, and safe output paths.

Scientific reference values need an independently justified source/fixture;
tests must not compare a formula only with a duplicate of itself.

### API integration

The integration suite calls the same handlers used by `/api/v1` and exercises
successful catalogue search, filtering, cursor pagination, object retrieval,
tour/source projections, version metadata, ETags/304 behaviour, typed
not-found results, and catalogue/provenance disclosures.

It also applies the optional SQLite/D1 forward migration and idempotent sample
seed in memory, checks constraints and bundled-data/checksum parity, and
applies the destructive down migration. The local-first release has no hosted
D1 connectivity, authentication, write API, remote upstream, or distributed
cache, so it cannot claim integration coverage for those systems. `npm run
test:rendered` separately imports `dist/server/index.js` and verifies
representative server HTML and Worker headers after a build.

### Browser end to end

Playwright runs Chromium against the local production server in:

- desktop Chrome emulation at 1440 x 900;
- Pixel 7/mobile Chrome emulation at 412 x 915; and
- an isolated mobile-Chrome landscape project at 800 x 430.

The current tests cover:

1. built HTML references to CSS/JavaScript assets that return expected content;
2. opening the explorer and WebGL canvas;
3. slash-key searches for Andromeda and Earth, object-panel updates, and
   explicit completed camera-flight evidence;
4. procedural-layer toggle, low/scientific quality persistence, and detailed
   date/Julian-date/direction/speed/event/reset time behavior;
5. starting, pausing, resuming, selecting/advancing chapters, interrupting with
   pointer camera input, and exiting a guided tour;
6. catalogue selection, bookmark persistence, saved-object display, reduced
   motion setting, and high-contrast setting;
7. collection of unexpected console errors in the principal explorer flow;
8. axe WCAG A/AA checks across all 19 principal routes;
9. warmed service-worker navigation plus an explicitly uncached route falling
   back to the warm shell while Chromium is offline;
10. canvas keyboard input plus a keyboard-only global-search, navigation,
    catalogue-selection and object-tab flow;
11. WebGL 2 initialisation failure plus post-initialisation context
    loss/restoration when the browser exposes the control extension;
12. system reduced-motion travel completing as an immediate cut;
13. usable 800 x 430 landscape explorer navigation, tools, touch-target sizes,
    panel bounds, time controls and catalogue navigation;
14. five deterministic visual states: desktop catalogue, explorer object
    panel/layers with graphics fallback, tour controls with fallback,
    contrast/reduced-motion settings, and mobile catalogue; and
15. a desktop runtime performance smoke covering semantic readiness, local
    search response, three catalogue/explorer navigation cycles, optional
    JavaScript heap growth, graphics state, and unexpected console errors.

The suite does not yet automate every required failure/accessibility path.
A genuinely cold first visit cannot be service-worker controlled before one
successful online install. Corrupt Cache Storage, low-memory pressure,
corrupt/throwing storage in a real browser, physical gamepad behavior,
screen-reader output, broad OS/assistive-technology coverage, and long-duration
resource stability remain manual or uncovered and must not be reported as
automated passes.

### Accessibility

`test:a11y` checks source invariants; it is not a DOM audit. The Playwright axe
test audits all 19 rendered principal routes and fails on serious/critical
violations for the selected WCAG tags. Automated findings are not a
conformance audit. Manual screen-reader, zoom/reflow, contrast, touch, and
motion checks follow the
[accessibility checklist](../accessibility/accessibility.md).

### Visual regression

The current `@visual` suite defines five reviewed source-tree baselines:
desktop catalogue; explorer object panel/layer manager with deterministic
graphics fallback; guided-tour controls with fallback; high-contrast and
reduced-motion settings; and mobile catalogue. It masks live network status,
disables animations, and allows a maximum 8% changed-pixel ratio. The suite
does not yet cover every major route or a
deterministic cross-GPU 3D-scene matrix.

Baselines are canonical to the CI environment (Linux Chromium). Font
rasterisation and metrics differ across operating systems, so screenshots
captured on Windows or macOS will not match and must not be committed as
baselines. To update a baseline: push the change, download the CI run's
Playwright artifact, review the `-actual.png` images, and commit the
reviewed CI-rendered images as the new baselines.

A local regeneration (`npm run build && npm run test:visual --
--update-snapshots`) is useful for previewing a change but is only a valid
baseline source on a matching Linux environment.

Do not auto-accept a changed baseline in CI.

### Security

API security tests cover invalid/duplicate parameters, malformed and
query-mismatched cursors, unsafe IDs, request bodies, oversized requests,
unsupported methods, typed error/correlation behaviour, ETag/cache policy,
rate-limit mechanics, and absence of wildcard CORS.

The working-tree source check rejects selected executable/HTML sinks,
fixed credential signatures, and
high-entropy values assigned to credential-like names. A separate,
dependency-free history gate scans every reachable commit, tag, and blob from a
full-depth checkout, including deleted text blobs. It skips known or detected
binary content, fails closed above 100,000 reachable objects, 2 MiB for one
text-like object, or 64 MiB of candidate text, and reports only sanitised
paths, object IDs, and signature labels—never matched values.
The gate rejects shallow clones and treats an empty object graph as a CI
configuration failure.

These deterministic checks complement rather than replace repository-host
secret scanning and push protection. CI also runs the locked-dependency
licence gate, npm advisory audit, and CodeQL.

### Performance

`test:performance` is a source/artefact architecture guard, not a benchmark.
The `@performance` browser test writes `outputs/performance-smoke.json` with
coarse bounded timings, optional Chromium heap values, browser version,
graphics state, and error count. Its broad ceilings are smoke gates rather
than product performance claims. A release benchmark must still record
browser, OS, CPU, memory, GPU, viewport, device-pixel ratio, quality, sample
size, traces, and exact interaction. See the
[performance guide](../performance.md).

## CI composition

The main CI job installs the lockfile with scripts disabled, validates the
environment/hosting shape, verifies formatting, regenerates and diff-checks
sample data, runs lint and both type checks, all deterministic test groups,
the Node coverage gate, source scanning, locked-package licence policy, the
high-severity advisory audit, the production build, rendered-Worker tests,
desktop/mobile browser, axe, visual, and performance-smoke tests, and SBOM
generation. Only then does it publish the build/report artefact.

A separate least-privilege CodeQL workflow analyses JavaScript/TypeScript.
Dependabot proposes npm and
GitHub Actions updates; updates still require review and the same gates.

## Flake, fixture, and coverage policy

- Tests must not depend on current wall-clock astronomy unless the clock is
  injected.
- Random/procedural fixtures use fixed seeds.
- No test calls an undocumented live astronomy endpoint.
- Retry only infrastructure setup; Playwright CI retries must not be used to
  conceal deterministic assertion failures.
- Quarantining a critical-path test requires an owner, reason, deadline, and a
  release decision that acknowledges the lost assurance.
- Sample changes update source/provenance and expected fixtures together.

Node's experimental coverage report instruments modules imported by the unit,
integration, and security runners. The release report records the exact
aggregate and exclusions for its source state. React components, WebGL
renderer execution, browser/service-worker flows, generated data/build output,
third-party code, and declarative fixtures are not represented in that
aggregate; React/WebGL/browser behaviour is assessed separately by Playwright,
visual review, and manual checks. Untested critical paths remain release
blockers regardless of aggregate percentage.
