# Known limitations

This list is intentionally candid. Atlas is a deployable reference
implementation and educational sample, not a complete professional catalogue
or precision planetarium. A missing item here is not evidence that a capability
has been verified.

## Scientific and data

- The bundled machine-readable catalogue is a four-record OpenNGC excerpt; the
  browser experience also contains 49 hand-curated editorial exhibits. Search
  completeness, survey selection functions, and sky coverage must not be
  inferred from either.
- The application does not contain every known star, exoplanet, galaxy,
  nebula, compact object, or Solar System body.
- Procedural scene points and artistic spatial context are illustrative, not
  individually observed objects, and have no fabricated scientific IDs.
- Values may be rounded for education. Source precision and uncertainty vary;
  an absent uncertainty means unavailable, not exact.
- The sample is not a live upstream mirror. Corrections and source updates
  require a reviewed build.
- Time controls use an educational, low-precision mean-motion model, not
  JPL-grade ephemerides. They are unsuitable for navigation, observing,
  occultation prediction, or precision extrapolation.
- Galactic structure, cosmic-web geometry, accretion effects, habitable zones,
  the Oort Cloud, and other conceptual boundaries are simplified and must
  remain labelled.
- The equal-angle derived cells are deterministic fixtures, not HEALPix and
  not equal-area near the poles.
- Sample values, editorial interpretations, and licences still require
  qualified human scientific/legal review; a passing schema validator is not
  peer review or legal advice.

## Rendering and performance

- The WebGL 2 renderer is a bounded schematic scale-band view, not a streamed
  billion-record engine.
- It implements a single floating-origin rebase and logarithmic depth, but not
  hierarchical astronomical reference frames, double-float GPU attributes,
  streamed HEALPix/octree tiles, production LOD cross-fades, GPU occlusion, or
  worker decoding.
- Visual point size, glow, colour, orbit guides, and spacing may be exaggerated
  for legibility and are not measurements unless the interface says otherwise.
- Named Solar System bodies are rendered individually with procedural surface
  shaders, rings, axial tilt, and a Sun-facing terminator. These surfaces are
  illustrative: they are computed from the cited physical parameters and from
  hand-matched impressions of published NASA/ESA imagery, not from photographs,
  maps, or albedo data. Cloud bands, storms, cracks, craters, and ringlet
  structure are plausible patterns, not the real features at real longitudes,
  and no rendered surface should be measured or cited as an observation.
- Body sizes use a power-law compression of true equatorial radii. Ordering and
  broad proportion are preserved, but the bodies are not to scale with each
  other and are not to scale with the distances between them.
- Body spin is a presentation clock. Relative rotation rates follow the cited
  sidereal periods, including retrograde directions, but absolute orientation
  is arbitrary and is not a sub-solar longitude or a real phase.
- Only bodies with an entry in `lib/planetary-appearance.ts` receive this
  treatment. Every other object still renders as a batched marker or point.
- WebGL behaviour varies by browser, GPU, driver, device temperature, and power
  mode. The semantic fallback is more portable than the 3D fidelity.
- There is no WebGPU or VR renderer. Standard-gamepad polling is implemented,
  but no broad controller/device compatibility guarantee has been recorded.
- The last recorded clean build produced a 600,605-byte (about 586.5 KiB)
  route-split
  `CosmosScene` client chunk, above the build tool's default 500 KiB warning
  threshold. Dynamic loading keeps it out of non-renderer route entry code,
  but further renderer/module splitting is still warranted.
- `CosmosScene.tsx` remains a large renderer module. Its imperative lifecycle is
  cohesive, but future effects/tile-streaming work should split focused engine
  modules rather than enlarge it.
- Static performance guards inspect deterministic batching, disposal, route
  splitting, social-card size, and offline-cache bounds. A desktop browser
  smoke now records coarse initial semantic readiness, local-search response,
  repeated navigation, optional JavaScript heap growth, graphics state, and
  console errors. The recorded release-baseline run passed its broad regression
  ceilings; it does not measure tile latency, GPU resource stability, long
  tour playback, or low-end/mobile runtime performance.
- The browser publishes a local-only buffer of up to 64 numeric navigation,
  web-vital, long-task, renderer, and coded-error diagnostic events. Observer
  support varies by browser, the INP value is only a candidate, the buffer is
  neither persisted nor transmitted, and there is no aggregate field
  telemetry, dashboard, or alerting.
- Automated screenshot comparison is a UI regression aid, not scientific or
  cross-GPU rendering validation.

## Product, persistence, and offline behaviour

- Content depth is representative, not a complete textbook for every section.
- Search supports names, aliases, catalogue IDs, types, source, magnitude,
  distance, mapped constellation, equatorial cone, and angular-near-object
  filters over the curated sample. Coordinate and constellation coverage is
  partial because many editorial objects lack parseable equatorial positions
  or a mapped constellation; `near` means angular separation on the sky, not
  three-dimensional physical proximity.
- Layer scale bounds and mapped catalogue-category toggles now filter scene
  batches; the procedural background, coordinate grid, and orbit guides also
  affect the renderer. The selected object is deliberately retained when its
  layer is hidden so the detail/focus context is not lost. Several declared
  conceptual/reference layers still have no dedicated renderer geometry.
  Layer choices persist as bounded, validated device-local overrides.
- The time controller uses explicit UTC parsing/formatting and drives schematic
  circular mean-motion positions for a small Solar System subset. It also
  reports rounded orbital/rotation phases, a synthetic Moon phase indicator,
  and date jumps for a short historical-event list. The scene model clamps
  dates to 1900–2100; lunar illumination is a readout, historical events do not
  reconstruct the sky, and the model is not an ephemeris. Named Solar System
  bodies now render a schematic spin and a Sun-facing terminator, but that
  orientation is presentation-only and is not driven by the time controller.
- Comparison graphics canonicalise supported length, mass, duration,
  temperature, speed, and angle units before forming ratios; mixed dimensions
  and non-ratio quantities are not plotted. Linear true-scale mode applies only
  to canonical physical diameter and deliberately has no visibility floor, so
  small objects can disappear. Future units require an explicit reviewed
  conversion before they can participate; missing/unsupported values remain
  textual.
- Guided tours use bundled scripts and browser/device speech synthesis. The
  schema accepts an HTTPS narration `audioUrl`, but the player does not fetch
  or play authored recordings; multilingual recorded audio is not included.
- The player honours authored targets, bounded/logarithmically projected
  camera distances, schematic yaw/pitch/roll, target lock during travel,
  fly/fade/cut transitions, `pauseAtEnd`, manual-camera interruption, and
  direct chapter selection. Orientation is in schematic scene axes rather than
  a physical body-attitude/ephemeris frame; after travel the target remains the
  static orbit pivot.
- The runtime TypeScript tour validator is exercised, but the draft 2020-12
  JSON Schema is not independently executed for validator-parity testing.
- Tour progress stores the tour/version, last contiguously completed chapter,
  and reduced-motion state. Direct jumps do not advance completion, but an
  interrupted or partially viewed chapter is intentionally not resumable at an
  elapsed position. Version-1 numeric progress is dropped during migration
  because it could not distinguish completion from a direct jump.
- English is the only implemented content language. Chrome copy is routed
  through typed English resources with fallback, key-shape validation,
  locale-aware formatting helpers, and RTL direction detection, but there is
  no second complete translation, end-to-end RTL verification, or
  locale-specific scientific review. Catalogue and educational prose remain
  English source content.
- Device-local bookmarks, recent lists, progress, and preferences do not sync,
  have no account backup, and disappear when site data is cleared.
- JSON/state-shape corruption and rejected browser-storage access fall back to
  a bounded in-memory session; changes cannot persist while storage is
  unavailable.
- Unknown section slugs normalise to the explorer instead of a dedicated 404.
- Responsive layouts and a mobile bottom-sheet treatment exist, but a broad
  real-device portrait/landscape matrix has not been recorded. Known
  interactive controls now use a 44 CSS-pixel target where layout permits and
  the smallest explorer labels were raised, but physical touch, zoom/reflow,
  and comfortable-text review remain manual.
- The service worker provides limited offline-after-install support for core
  routes and same-origin static assets. It does not cache API responses,
  guarantee a first offline visit, or provide a complete offline archive.
- Explorer/tour dynamic imports have loading shells and a route-scoped failure
  boundary with full-reload and catalogue fallback actions. There is no
  in-place chunk retry with bounded backoff; recovery from a missing client
  chunk still requires reload or navigation.
- Runtime cache keys omit queries and are capped at 64 entries, but eviction is
  a simple oldest-entry/count policy rather than a byte budget or
  content-priority strategy.
- In-app reset requests deletion of local state and only Cache Storage names
  prefixed `atlas-cosmos-`. Browser policy can still reject cache deletion; the
  application reports the degraded cleanup and browser site-data controls
  remain the complete origin-level reset.

## API, backend, and operations

- `/api/v1` serves projections of bundled data only. There is no upstream
  catalogue gateway, spatial tile delivery service, write API, remote search
  index, or bookmark synchronisation.
- The application rate limiter is a bounded in-memory fallback per Worker
  isolate. Counters reset on cold start and do not provide distributed
  enforcement; production needs provider-edge rate limiting.
- The active release has no D1 database, R2 object store, ingestion scheduler,
  account system, administration interface, or server-side user data.
- The repository contains an Atlas SQLite/D1 schema with indexes, foreign keys,
  constraints, a deterministic four-record development seed, forward
  migration, destructive down migration, and executable in-memory SQLite
  verification. It is an inactive future boundary: migration/seed commands
  deliberately no-op while D1 is null, and hosted D1 connectivity, migration,
  backup, restore, load, and failure recovery have not been exercised.
- There is no Docker Compose/local infrastructure stack because default mode
  has no infrastructure dependency. `npm run env:check` validates the Node
  floor, Sites configuration shape/binding types, and suspicious
  `NEXT_PUBLIC_` secret-like names; it does not verify hosting credentials,
  provider access policy, or future integration-specific variables.
- There is no configured remote log/error/trace backend, persistent metrics
  collector, behavioural analytics, dashboard, or alert delivery integration.
  Privacy-safe structured server request/error events, trace context,
  `Server-Timing`, API correlation IDs, the bounded local-only browser
  diagnostic buffer, CI, hosting status, provider signals, and manual release
  records are the available diagnostics.
- Worker security headers exist in source and rendered-Worker tests, but the
  final HTTPS origin and access policy still need verification after every
  deploy.
- CSP currently permits inline scripts and styles for vinext compatibility.
  This is weaker than a nonce/hash policy.
- Restore procedures for future D1/R2 data cannot be rehearsed while those
  services are unbound.
- No container image is built, so container scanning is not applicable to this
  deployment shape.
- CI produces build/report artefacts and an SBOM, but no separately signed or
  SLSA-attested release bundle.
- No hosted staging rehearsal or terminal production deployment has been
  verified yet; the hosted deployment path is documented work rather than a
  recorded release.

## Validation and assurance

- Static accessibility tests inspect source invariants. The Playwright axe
  audit covers all 19 principal routes and a keyboard-only principal flow.
  Neither establishes WCAG conformance; screen-reader, zoom/reflow, contrast,
  physical touch, and assistive-technology checks remain manual release
  evidence.
- Playwright covers representative explorer/search/layer/time, tour,
  bookmark/settings persistence, desktop/mobile, axe, warm offline navigation,
  pointer tour interruption, repeated SPA/canvas keyboard navigation, explicit
  Earth flight completion, quality/time changes, reduced-motion travel,
  partial-cache offline fallback, WebGL 2 initialisation fallback and runtime
  context recovery, all-route axe checks, a keyboard-only principal flow,
  portrait/landscape mobile emulation, five deterministic visual scenarios,
  and a bounded desktop performance smoke. It does not automate a genuinely
  cold first offline visit, corrupt Cache Storage, low-memory pressure,
  corrupt/throwing browser storage, screen-reader output, physical devices, or
  a broad OS/assistive-technology matrix.
- The visual suite now has baselines for the desktop catalogue, explorer
  object panel/layer manager with deterministic graphics fallback, guided-tour
  controls with fallback, high-contrast/reduced-motion settings, and a mobile
  catalogue layout. The recorded baselines passed, and the suite still lacks
  a broad major-route and deterministic cross-GPU 3D-scene matrix.
- Node's coverage gate measures imported domain, API, persistence,
  observability, tour, and pipeline modules. It does not instrument React,
  WebGL, or browser/service-worker execution; those paths rely on
  Playwright/visual/manual evidence. Risk-based acceptance still leaves
  browser/runtime paths above manual or uncovered.
- The repository supplies opt-in pre-commit checks, but Git hooks are local and
  bypassable. They do not run the browser suite or network-backed advisory
  audit; CI and the release procedure remain the enforced shared gates.
- Dependency audit, CodeQL, working-tree scanning, and the bounded
  full-history signature/entropy scan reduce risk but cannot prove absence of
  vulnerabilities or credentials. Repository-host secret scanning and push
  protection remain independently required because their maintained
  signatures and enforcement provide defence in depth.
- The dependency-licence gate recognises reviewed SPDX expressions for all 514
  package-lock entries and flags 43 LGPL/MPL reciprocal entries in
  `outputs/license-report.json`. It does not itself satisfy notice,
  source-offer, redistribution, or modification obligations; qualified legal
  review is still required.
- The 2026-07-29 high-severity npm audit gate passed, but npm still reports four
  moderate development-only findings through
  `drizzle-kit -> @esbuild-kit -> esbuild@0.18.20`. They are not in the deployed
  Worker path, but the tooling runs in developer/CI trust contexts and remains
  an unresolved supply-chain risk.
- Browser support is a policy target until a release record lists actual
  browsers, assistive technologies, GPUs, and devices exercised.
- Project-authored code, content, design, documentation, and original artwork
  are covered by the explicit all-rights-reserved [project notice](../NOTICE.md).
  Permission to reuse that material must not be inferred from the OpenNGC
  sample's CC BY-SA licence.
