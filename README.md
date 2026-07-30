# Atlas of the Cosmos

**An Annas M. Ishtiaq project.** Copyright © 2026 Annas M. Ishtiaq.
All rights reserved.

An interactive, local-first astronomical exploration reference built with
vinext, React, TypeScript, and Three.js. It combines a bounded 3D scene with a
searchable catalogue, object provenance, educational sections, guided tours,
accessibility alternatives, saved objects, a versioned read-only API, and
visual preferences.

Atlas ships a **small, curated sample** plus clearly separate illustrative
context. It does not claim to map every known object, reproduce a full
astronomical catalogue, or provide precision ephemerides.

## Quick start

Prerequisite: Node.js `>=22.13.0`; [`.nvmrc`](.nvmrc) records the pinned
version used for CI and for regenerating the committed `data/derived`
artifacts.

```bash
npm ci
npm run dev
```

The local URL is printed by vinext. No account, API key, database, paid service,
or external catalogue download is required.

Production-style local check:

```bash
npm run db:migrate
npm run db:seed
npm run validate
npm run start
```

Contributors can enable the repository-owned pre-commit checks with
`git config core.hooksPath .githooks`; see
[CONTRIBUTING.md](CONTRIBUTING.md).

With the default unbound D1 configuration, the migration and seed commands
report a deliberate no-op. `npm run validate` already regenerates sample data,
validates the environment, reports Node coverage, runs the source and
Git-history security gates, checks locked-package licences, runs the
high-severity dependency audit, builds the application, tests the rendered
Worker, runs the desktop/mobile browser suite, and generates an SBOM.

## What is included

- 19 route-aware sections covering the central explorer, tours, catalogue,
  Solar System, stars, exoplanets, deep sky, Milky Way, galaxies, cosmic
  scale, learning, saved objects, settings, and reference policies;
- a WebGL 2 Three.js scene with selectable labelled objects, batched
  catalogue/procedural rendering, a bounded floating-origin rebase,
  logarithmic depth, quality modes, and context-loss fallback;
- individually shaded Solar System bodies with procedural surfaces, ring
  systems, axial tilt, atmospheric limb glow, and Sun-driven day/night
  terminators, drawn entirely in code from cited physical parameters;
- local catalogue search and object details with source/provenance status;
- seven data-driven tours (57 chapters) with transcripts and controllable,
  interruptible playback, deep-linked chapters, and device-local progress;
- explicit-unit astronomy, coordinate, search, and tour packages;
- a deterministic sample-data validation/derivation pipeline;
- semantic non-3D content, keyboard support, reduced motion, and contrast
  preferences;
- device-local bookmarks, recent items/searches, tour progress, and
  preferences, with no account tracking;
- a bounded, local-only browser diagnostic buffer for numeric navigation,
  web-vital, long-task, renderer, and coded-error signals;
- a same-origin `/api/v1` surface for health, readiness, versions, catalogue
  search/details, tours, source provenance, and OpenAPI 3.1;
- an install-time service worker that caches core routes and same-origin static
  assets for a limited offline-after-first-load fallback; and
- a portable Cloudflare Workers build with generated deployment
  configuration.

Visual positions, sizes, colour, glow, orbit guides, and time animation may be
compressed, schematic, or illustrative. The interface and data model
distinguish those encodings from catalogue-backed facts. Planetary surfaces
and rings are drawn mathematically from the cited measurements in
[`lib/planetary-appearance.ts`](lib/planetary-appearance.ts) and from
hand-matched impressions of published NASA/ESA imagery; no photograph or
texture is bundled, and no rendered surface is an observation. See
[imagery attribution](docs/data-sources/imagery-attribution.md).

## Architecture

The application is a modular monolith:

```text
React routes and semantic UI
  |-- local catalogue and tour state
  |-- versioned, validated browser state
  |-- same-process, read-only /api/v1
  `-- imperative Three.js renderer
        `-- render view models, not scientific source values

scientific packages and deterministic pipeline
  `-- typed units, coordinates, provenance, uncertainty, validation
```

vinext runs the Next-style app through Vite and a Cloudflare Worker runtime.
The default configuration binds no D1 database or R2 bucket. The repository
includes an implementation-ready, locally verified SQLite/D1 schema,
deterministic development seed, and destructive rollback artifact for future
reviewed persistence work; no hosted D1 operation is claimed.

Read the [architecture overview](docs/architecture/overview.md) and the
[rendering/coordinate model](docs/architecture/rendering-and-coordinates.md)
before changing cross-module behaviour. The [API contract](docs/api.md)
documents the public read surface and its production rate-limit limitation.

## Repository map

| Path         | Purpose                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `app/`       | routes, application shell, UI, and client renderer                                                  |
| `lib/`       | curated display content, client persistence, and API services                                       |
| `packages/`  | framework-neutral astronomy, coordinates, catalogue, tours, and shared types                        |
| `data/`      | sample, manifests, raw/derived boundaries                                                           |
| `db/`        | optional Drizzle schema and deterministic development seed                                          |
| `drizzle/`   | generated forward and explicitly destructive rollback migrations                                    |
| `pipelines/` | deterministic sample validation and derivation                                                      |
| `tests/`     | unit, API integration/security, rendered, accessibility, performance, Playwright, and visual checks |
| `worker/`    | portable Worker entry point and response headers                                                    |
| `public/`    | manifest, service worker, and attributed social card                                                |
| `docs/`      | architecture, data, security, operations, testing, and limitations                                  |
| `.github/`   | continuous integration, CodeQL, and dependency update policy                                        |
| `.githooks/` | opt-in local pre-commit validation                                                                  |

## Commands

| Command                                  | Purpose                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                            | local development server                                                     |
| `npm run build`                          | production vinext build                                                      |
| `npm run start`                          | serve the built Worker through the project-local production preview          |
| `npm run preview`                        | alias for the project-local production preview                               |
| `npm run env:check`                      | Node/hosting/public-secret-name validation                                   |
| `npm run format:check`                   | Prettier verification                                                        |
| `npm run lint`                           | lint repository source                                                       |
| `npm run typecheck`                      | strict TypeScript check                                                      |
| `npm run typecheck:packages`             | independent strict check of domain packages                                  |
| `npm run test:unit`                      | scientific/domain unit tests                                                 |
| `npm run test:integration`               | versioned API integration and cache-contract tests                           |
| `npm run test:security`                  | API abuse cases and source security invariants                               |
| `npm run test:a11y`                      | static accessibility invariants                                              |
| `npm run test:performance`               | deterministic source/bundle-architecture guards                              |
| `npm run test:coverage`                  | Node domain/API/pipeline coverage with documented browser exclusions         |
| `npm run test:rendered`                  | final built Worker HTML and response-header checks                           |
| `npm run test:e2e`                       | desktop/mobile, axe, five visual states, and runtime performance smoke       |
| `npm run test:visual`                    | the five reviewed browser scenarios tagged `@visual`                         |
| `npm test`                               | unit, integration, security, static accessibility, and performance aggregate |
| `npm run security:scan`                  | working-tree secret-pattern and unsafe-sink scan                             |
| `npm run security:history`               | bounded, value-redacted full-Git-history secret scan                         |
| `npm run security:licenses`              | locked-package SPDX policy and reciprocal-component report                   |
| `npm run security:audit`                 | npm advisory audit at high severity                                          |
| `npm run validate`                       | local automated gate, including build, rendered, Playwright, and SBOM checks |
| `npm run data:sample`                    | regenerate/validate deterministic sample outputs                             |
| `npm run assets:sanitize`                | losslessly remove social-image metadata; reviewed pixels must remain exact   |
| `npm run sbom`                           | generate `outputs/sbom.cdx.json` in CycloneDX 1.6 form                       |
| `npm run db:generate`                    | regenerate the optional SQLite/D1 migration from the Drizzle schema          |
| `npm run db:migrate` / `npm run db:seed` | protected D1 operation, or explicit no-op while D1 is unbound                |

`npm run test:visual` uses the reviewed deterministic baselines under
`tests/e2e/__screenshots__/`. Baseline updates are explicit review actions.
Automated accessibility and performance guards are not substitutes for the
manual browser/device checks in the documentation.

## Scientific and data policy

Catalogue-backed, derived/modelled, and procedural/illustrative records are
different categories. Missing values remain unknown. New sources require a
manifest containing provider, version, licence, attribution, frame/epoch,
units, uncertainty handling, transformations, and validation results.

See [Data provenance](docs/data-sources/provenance.md). Do not add downloaded
imagery, textures, audio, models, or large catalogues without verified licence
and traceable attribution.

## Privacy and security

The reference release is anonymous. Saved object IDs, recent object/search
strings, tour chapter progress, layer visibility overrides, and display
preferences are stored in one validated version-2 browser record under
`atlas.cosmos.local-state`; there is no remote user profile or application
analytics. Version-1 state preserves bounded non-tour fields while dropping
ambiguous numeric tour progress during migration. Reset deletes only
Atlas-prefixed Cache Storage entries. Local diagnostics retain at most 64
numeric events in page memory and are not transmitted. Hosting providers may
still process ordinary request metadata, which the deployment operator must
document.

Start with the [privacy model](docs/privacy.md),
[security model](docs/security/security-model.md), and
[threat model](docs/security/threat-model.md). Report vulnerabilities through
the private process in [SECURITY.md](SECURITY.md), not a public issue.

## Deploy

Deployments are Cloudflare Workers deployments of the exact validated build,
tied to a reviewed commit. Staging and production use separate Workers, and
production requires explicit approval. Run the full gate, deploy with
Wrangler, verify the hosted response and `/api/v1/ready`, and retain the
previous Workers version for rollback.

Start with the
[step-by-step deployment guide](docs/operations/deployment-step-by-step.md),
then use the [deployment policy](docs/operations/deployment.md) and
[operations runbook](docs/operations/runbook.md).

The
[criterion-by-criterion master-prompt audit](docs/operations/master-prompt-compliance.md)
records what is met, partial, inactive by design, or externally blocked.

## Documented performance boundary

The final recorded local build placed the route-split `CosmosScene` client
chunk at 597,549 bytes (about 583.5 KiB) minified, above the build tool's
default 500 KiB warning threshold. The renderer is loaded only by
explorer/tour views. The warning and the missing production-scale
spatial-streaming path remain documented work rather than hidden release
claims.

## Documentation

The [documentation index](docs/README.md) links architecture decisions,
accessibility, testing, operations, browser support, performance, API,
release, and incident-response material. Read
[Known limitations](docs/known-limitations.md) before describing the
application's coverage or precision.

## Contributing

Contributions are welcome when they preserve scientific provenance,
accessibility, data licensing, and the 3D/non-3D boundary. Read
[CONTRIBUTING.md](CONTRIBUTING.md) and the
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Contribution does not change ownership or grant a project licence;
contributions are accepted only under the
[Contributor License Agreement](CONTRIBUTOR_LICENSE_AGREEMENT.md). See the
[LICENSE](LICENSE) and the [copyright and rights notice](NOTICE.md).
Third-party scientific data retain their respective licences and
attribution requirements.
