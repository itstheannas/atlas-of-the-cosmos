# Architecture overview

## Scope and status

Atlas of the Cosmos is a modular, local-first astronomical exploration
reference application. Its browser experience combines a route-aware React
interface, a bounded Three.js scene, searchable educational content,
data-driven guided tours, a same-process read-only API, and a small curated data
set. Scientific packages and the deterministic sample pipeline are reusable
outside the UI.

The repository demonstrates serious architecture and interaction patterns at a
safe browser scale. It does **not** ship a complete Gaia, SIMBAD, exoplanet, or
deep-sky catalogue; precision ephemerides; an account system; server-side
bookmarks; or live upstream catalogue ingestion. See
[Known limitations](../known-limitations.md).

## System context

```text
checked source excerpt + manifests
                 |
                 v
deterministic validation / normalisation / sample tiling
                 |
                 v
versioned bundled data and editorial content
                 |
        +--------+-------------------------------+
        |                                        |
        v                                        v
React routes and semantic UI              read-only /api/v1
  |-- catalogue, learning, tours            |-- health/ready/version
  |-- validated browser persistence          |-- catalogue/object
  |-- service-worker registration            |-- tours/sources
  `-- client-only Three.js renderer           `-- OpenAPI 3.1
                 |                                  |
                 +----------------+-----------------+
                                  v
                    portable Worker runtime
                    + same-origin static assets
```

The default release needs no upstream external API, database, object store,
account, secret, or paid service. The hidden hosting manifest leaves D1 and R2
unbound until a Sites project or binding is deliberately configured. The
implementation-ready SQLite/D1 schema, seed, forward migration, and destructive
down migration are verified in memory but remain outside the active runtime
data path.

## Runtime responsibilities

### React application and routes

`app/` owns metadata, navigation, search, object selection, catalogue and
learning views, tour controls, settings, reference content, and the semantic
alternative to the visualisation. React state is reserved for values that
change documents or controls; per-frame camera and scene mutation stays in the
renderer.

The root and dynamic section route share one shell. Public section URLs are:

```text
/
/tours
/catalogue
/solar-system
/stars
/exoplanets
/deep-sky
/milky-way
/galaxies
/cosmic-scale
/learning
/saved
/settings
/about-data
/methodology
/accessibility
/privacy
/security
/attributions
```

An unknown dynamic section currently normalises to the explorer rather than
serving a dedicated 404. Query parameters on `/tours` can identify a tour and
one-based chapter for deep links.

### Renderer

Three.js is used directly behind a client-only boundary that is dynamically
loaded by explorer and tour views. The WebGL 2 scene is an enhancement:
catalogue, object, learning, and transcript content remain usable if graphics
initialisation or recovery fails.

The renderer currently implements:

- `THREE.Points` for catalogue points and one batched procedural field;
- `THREE.InstancedMesh` batches for other marker classes;
- bounded quality profiles, pixel-ratio caps, ACES tone mapping, and a
  Scientific preset;
- schematic scale-band placement that never mutates source measurements;
- a bounded floating-origin rebase and a logarithmic depth buffer;
- pointer, wheel, keyboard, touch/pointer, and practical standard-gamepad
  controls;
- interruptible and reduced-motion fly-to transitions;
- visibility pausing, resize handling, GPU/listener/frame disposal; and
- WebGL context-loss status, recovery, and non-3D fallback.

This is not a production billion-record renderer. It does not stream the
derived tile fixtures into the scene, implement hierarchical astronomical
reference-frame rebasing, perform GPU occlusion culling, or provide a WebGPU
path. [Rendering and coordinate model](rendering-and-coordinates.md) defines
the scientific/render boundary.

### Scientific packages

Domain logic is kept in focused, framework-neutral packages:

| Package                      | Responsibility                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/shared-types`      | explicit-unit quantities, provenance, uncertainty, and catalogue/procedural discriminants |
| `packages/coordinate-engine` | unit conversion and supported coordinate transforms                                       |
| `packages/astronomy-core`    | photometry, formatting, scale helpers, cosmology assumptions, and domain validation       |
| `packages/catalogue-client`  | deterministic in-memory searching and filters                                             |
| `packages/tour-engine`       | tour validation and interruptible playback state                                          |

UI and server adapters may depend on these packages; the packages do not
depend on React or Three.js.

### Data and pipeline

`data/` contains the distributable sample, source manifests, immutable input
excerpt, and derived preview/detail fixtures. `pipelines/` contains
deterministic integrity, normalisation, validation, equal-angle spatial
indexing and reporting utilities. A 64-point seeded procedural
context fixture is separate from the four-record OpenNGC excerpt.

The broader UI catalogue in `lib/cosmos-data.ts` is a curated editorial layer
with evidence and source classifications. It is not a bulk mirror. Future
upstream catalogues belong behind versioned adapters with validation,
pagination/tiling, abortable requests, bounded caches, licences, and source
attribution.

### API

The routes under `app/api/v1/` expose safe projections of the same bundled
catalogue, tour, and source registry. They support `GET` and `HEAD`, typed
errors, request correlation, ETags, bounded query/cursor parsing, and
conservative caching. Health and readiness bypass the application rate
limiter.

The rate limiter is an in-memory, bounded per-isolate fallback. It is not a
distributed production boundary and must be complemented by provider-edge
controls. See the [API contract](../api.md).

### Browser persistence and offline cache

One `localStorage` record, `atlas.cosmos.local-state`, stores schema version 2
preferences, bounded layer visibility overrides, bookmarks, recent object IDs,
recent search strings, and versioned last-completed tour chapters after
validation and bounding. Version-1 state migrates its bounded non-tour fields
but drops ambiguous numeric tour indexes. The record does not store catalogue
records, camera frames, identity, credentials, or free-form notes.

After hydration, the app registers `public/sw.js` where service workers are
supported. Its versioned Cache Storage entry preloads a small core route set,
uses network-first navigation fallback, and cache-first same-origin static
assets. Runtime keys are normalised to origin + path (queries are not retained)
and the runtime cache is capped at 64 entries. API responses are not cached by
the service worker. This is a limited offline-after-install aid, not a
guaranteed offline scientific archive.

The in-app reset removes the local-state record and requests deletion only for
Cache Storage names prefixed `atlas-cosmos-`; unrelated origin caches are not
touched.

### Optional relational persistence boundary

`db/schema.ts`, `db/seed.sql`, and `drizzle/` define a constrained future
SQLite/D1 catalogue/provenance/tour/bookmark/tile-metadata design. Integration
tests apply the forward migration, run the idempotent four-record seed twice,
check constraints and bundled-data parity, then apply the destructive down
migration in an in-memory database. The default Worker does not read these
tables, and no hosted D1 migration, backup, or restore has been exercised. See
the [database operations guide](../operations/database.md).

### Hosting boundary

vinext maps the Next-style application surface onto a Vite build and one
portable Worker. The Worker serves the app, API, static assets, and image
optimisation path and applies response-security headers.

Managed Sites access policy, TLS, provider-edge rate limiting, log retention,
saved versions, deployment approval, and rollback are operational controls.
They are not replaced by route hiding or client state.

## State boundaries

| State                                                  | Owner                          | Persistence                             |
| ------------------------------------------------------ | ------------------------------ | --------------------------------------- |
| camera pose, world origin, animation frame             | renderer instance              | none                                    |
| hover, active pointers, current flight                 | renderer instance              | none                                    |
| current section, selected object, open panels          | route shell                    | session/history URL as applicable       |
| tour playback mode and timing                          | tour reducer/UI                | session only                            |
| versioned last completed chapter by tour               | client persistence             | local device                            |
| current search query/results                           | catalogue client + UI          | session only                            |
| recent search strings                                  | client persistence             | local device, maximum 10                |
| recent object IDs                                      | client persistence             | local device, maximum 20                |
| quality, motion, theme, layer visibility, camera speed | client persistence             | local device                            |
| bookmarks                                              | client persistence             | local device, maximum 250 IDs           |
| catalogue/tour/source content                          | bundled immutable modules/data | build artefact                          |
| service-worker route/static cache                      | browser Cache Storage          | until cache rotation/site-data clearing |
| API rate counters                                      | Worker isolate memory          | reset on cold start                     |

Persisted and request values are untrusted. They are parsed, allowlisted,
bounded, rejected, or reset. High-frequency renderer values are never written
to browser storage.

## Failure model

- WebGL creation or context failure leaves semantic catalogue and object
  content available.
- Automated flights and tours can be interrupted; reduced motion removes long
  travel.
- Invalid or unsupported local-state JSON falls back to version-2 defaults;
  version-1 non-tour state migrates while ambiguous numeric progress is
  discarded.
- Invalid sample or tour records fail validation instead of becoming plausible
  invented facts.
- Network loss can fall back to previously cached navigation/static content;
  a first visit still needs a successful service-worker install.
- API failures return typed, correlation-bearing JSON without stack traces.
- A failed hosted release is rolled back to the last known-good saved Sites
  version.

## Dependency direction

```text
app UI --------> catalogue / tour packages --------> shared types
  |                         |
  +----> renderer adapter   +----------------------> astronomy / coordinates
           |
           +----> Three.js

API adapters ----> bundled content + domain packages
pipelines --------> coordinate / validation utilities
```

Avoid imports from application components into domain packages and avoid one
global store spanning renderer, catalogue, tours, API cache, and preferences.

## Evolution path

Scale should be added only with measured need:

1. replace in-memory search with signed/versioned manifests and paginated or
   spatially tiled endpoints;
2. add worker-based decoding, abortable requests, back-pressure, retry jitter,
   and bounded client caches;
3. extend the bounded floating origin to hierarchical local reference frames
   and cross-faded LOD representations;
4. add distributed edge rate limiting and observability with documented
   privacy/retention;
5. add an authenticated bookmark service only if cross-device persistence is a
   real requirement; and
6. bind D1/R2 only after schemas, migrations, access control, backup/restore,
   retention, and incident ownership are implemented and rehearsed.
