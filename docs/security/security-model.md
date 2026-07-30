# Security model

## Current security posture

Atlas is an anonymous, read-oriented reference application with bundled data and
bounded device-local preferences, recent lists, bookmarks, and tour progress.
It has no product login, write API, remote catalogue ingestion at request time,
administration surface, D1 binding, R2 binding, payment flow, or user-generated
HTML. It does expose a versioned read-only API over bundled data and registers
a same-origin service worker. This deliberately small attack surface is a
design control, not a claim of absolute security.

The active controls must be verified on every release using the repository
validation and hosted-response checks. See the [threat model](threat-model.md)
and [deployment guide](../operations/deployment.md).

## Trust rules

- Treat URL parameters, route segments, browser storage, headers, fetched
  content, and build-time data as untrusted.
- React text rendering is the default output path. Do not add
  `dangerouslySetInnerHTML`, `eval`, dynamic code generation, or unsanitised
  SVG/HTML.
- Validate stored state before use; discard unknown schema versions.
- Keep server-only values out of names prefixed with `NEXT_PUBLIC_` and out of
  the bundle.
- External URLs must be fixed or validated as `https:` links to the intended
  host. Never redirect to an arbitrary supplied URL.
- Catalogue identifiers are data, not paths, SQL fragments, or executable
  selectors.
- Service-worker cache keys and responses are a trust boundary. Cache only
  successful same-origin content and rotate the named cache deliberately.
- Do not make an object "trusted" because it came from a checked-in JSON file;
  pipelines and dependency compromise are relevant threats.

## Authentication and authorisation

No Atlas route requires an application account. The starter's optional
authentication helper is unused. Hiding navigation would not be access
control.

The current managed Sites project uses a custom owner-only access policy with
one allowed user and no group-wide grants. Preserve that control-plane boundary
unless Annas M. Ishtiaq explicitly approves a reviewed policy change. The
application itself does not consume the hosting identity as product
authorisation. If write features are added, enforce identity and authorisation
on the server for every operation; never depend on a client role or injected
display name alone.

## Browser storage

Persistence contains only non-sensitive preferences, object/search IDs or
strings, and versioned last-completed tour chapters. Values are versioned and
bounded; malformed or unsupported JSON resets to defaults. Version-1 migration
preserves bounded non-tour state but discards ambiguous numeric progress.
Storage acquisition/read, write, removal, and Atlas-prefixed cache deletion are
guarded; rejected access keeps a user-visible in-memory session without
persistence. Cache reset targets only names beginning `atlas-cosmos-`. A
malicious script running on the origin could still read or change local
storage, which is why secrets and bearer tokens are prohibited there.

## HTTP response policy

`worker/index.ts` currently applies these headers to app, API, and image
optimisation responses. The deployment owner must still verify them on the
final HTTPS origin:

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';
  manifest-src 'self'
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

The source policy currently permits inline scripts and styles for vinext's
rendered output. That weakens CSP against same-origin injection and should be
replaced with nonces/hashes when the deployed stack supports them without
breaking hydration. HSTS is emitted only for HTTPS requests and
`includeSubDomains` requires owner review before using a domain with unrelated
subdomains. Source and rendered-Worker tests are evidence about the artefact,
not proof of the hosted response.

## Read-only API

`/api/v1` accepts only `GET` and `HEAD`. It validates method, URL/body size,
resource IDs, query names/lengths, filters, page limits, and query-scoped
cursors. Responses use typed errors without stack traces, correlation IDs,
ETags where applicable, and no wildcard CORS header.

The in-memory limiter is bounded but per Worker isolate and reset by cold
starts. It cannot enforce a global production quota; configure distributed
provider-edge limits. Health and readiness routes intentionally bypass the
application limiter and need edge abuse controls. See the
[API contract](../api.md).

## Service worker and cache

`public/sw.js` preloads a small route list, uses network-first navigation, and
cache-first same-origin static assets. It does not cache API responses or
cross-origin content. Runtime cache keys omit queries and the runtime cache is
capped at 64 entries. Cache poisoning through a compromised origin/build and
simple oldest-entry eviction remain residual risks. Cache name changes, routing
changes, and offline behaviour require security/privacy review.

## Secrets and configuration

The default application requires no secret. `.env.example` therefore contains
no dummy credentials. If a future feature adds one:

- validate it server-side at startup;
- store it in the hosting secret manager, not an `.env` file in source;
- grant the smallest scope;
- use separate values for preview, staging, and production;
- document rotation and revocation;
- ensure errors and logs redact it; and
- test that it is absent from client bundles and build artefacts.

## Dependencies and build integrity

- Exact npm versions and the lockfile define the dependency graph.
- CI installs with `npm ci`.
- Dependabot proposes controlled updates.
- CI validates the environment/hosting shape and runs formatting, lint, both
  TypeScript checks, deterministic data regeneration,
  unit/API/security/accessibility/performance checks, the production build,
  rendered-Worker checks, Playwright desktop/mobile/axe and visual checks, a
  working-tree and full-history secret scans, unsafe-sink checks,
  locked-dependency licence policy/report, and SBOM generation.
- The validation job runs the npm high-severity advisory audit before
  publishable artifacts; CodeQL runs in its own workflow.
- The dependency-free history scan examines reachable commit/tag objects and
  historical text blobs at bounded, fail-closed limits without printing
  matched values. Repository-host secret scanning and push protection should
  remain enabled as independent controls with broader maintained signatures.
- Major upgrades require manual review and the full validation suite.
- A passing audit means no finding in the checked advisory snapshot; it does
  not prove absence of vulnerabilities.

### Current advisory residual

On 2026-07-29, `npm audit --audit-level=high` exited successfully after the
framework/runtime dependency set and image/style-processing resolutions were
updated. The advisory report still contains four **moderate**, development-only
findings in the `drizzle-kit` toolchain through deprecated `@esbuild-kit`
packages to `esbuild@0.18.20`.

Those findings are not reachable through the deployed Atlas Worker bundle, but
development/CI tools execute with contributor or automation privileges. They
remain a supply-chain risk and require a reviewed drizzle-kit/toolchain upgrade
or replacement when compatible. Do not translate the high-severity audit exit
status into “zero vulnerabilities” or “secure”.

### Current licence review residual

`npm run security:licenses` currently accepts reviewed SPDX expressions for
all 514 package-lock entries and writes `outputs/license-report.json`. It flags
43 LGPL/MPL reciprocal entries for human review; many are platform variants,
but that does not eliminate notice, source-offer, redistribution, or
modification obligations. The CycloneDX SBOM carries each available
expression. A passing expression gate is inventory evidence, not legal advice
or a blanket redistribution clearance.

## Standards alignment

The control review uses the current published editions of these primary
standards as of 2026-07-30:

- [OWASP Application Security Verification Standard 5.0.0](https://owasp.org/www-project-application-security-verification-standard/)
  for verification categories and release evidence;
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/) for common web-application
  risk review; and
- [OWASP API Security Top 10:2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
  for the read-only API threat review.

This is a risk-based mapping, not a certification:

| Control area                  | Atlas implementation/evidence                                                                                        | Residual boundary                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| access control                | no application write/admin surface; owner-only hosting policy; server-side enforcement required before adding writes | hosted policy must be rechecked after deployment                 |
| authentication                | no product accounts or credentials                                                                                   | future identity features require a new design and threat review  |
| input and API security        | method/body/URL/ID/query/cursor bounds, typed errors, safe projections, no wildcard CORS                             | edge-wide rate enforcement remains provider-operated             |
| browser injection             | encoded React text, unsafe-sink scan, protocol-restricted source links, CSP                                          | CSP still needs inline script/style compatibility exceptions     |
| cryptography and secrets      | TLS assumption, no runtime secret, source/history scans, secret-manager policy                                       | hosted TLS and repository protection are external controls       |
| data and scientific integrity | discriminated record kinds, provenance, checksums, deterministic pipeline, uncertainty                               | qualified scientific and licence review remains human            |
| logging and monitoring        | privacy-safe correlation/diagnostic design and release-log review                                                    | retention, dashboards, and alert delivery depend on the operator |
| software integrity            | frozen lockfile, pinned workflow actions, advisory/licence gates, SBOM, reviewed candidate archive                   | release artifact is not independently signed or attested         |

Each release must retain actual command and hosted-response evidence. The
existence of a table or test is not proof that a control was active at the
deployed origin.

## Logging

Do not log authorisation headers, cookies, tokens, full session IDs, raw
identity headers, URLs/queries, request bodies, browser-storage contents,
exception text, or stacks. The server emits a fixed, privacy-safe structured
request event and a redacted 5xx error event through typed sinks. The default
sink writes one JSON object per line locally; no remote collector is
configured. Events use allowlisted operation names, generated/validated trace
and span IDs, a reduced method, status, duration, outcome and stable error
codes. User-supplied correlation values are returned to the caller but excluded
from the event schema.

The browser diagnostic buffer accepts only safe metric names, fixed
kinds/units, finite numeric values and timestamps, retains at most 64 events in
memory, and is not transmitted. Before central collection, the operator must
define access, retention, deletion, sampling and alert-use rules and rerun the
redaction tests. See the
[observability guide](../operations/observability.md).

## Vulnerability handling

Follow the private reporting process in the root [SECURITY.md](../../SECURITY.md).
Do not include exploit details or secrets in a public issue. Security fixes
should include a regression test when safely reproducible.
