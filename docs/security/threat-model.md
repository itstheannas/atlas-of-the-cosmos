# Threat model

- Review date: 2026-07-30
- Scope: anonymous Atlas web application behind the current owner-only managed
  Sites boundary, versioned read-only API, service worker, bundled sample data,
  build pipeline, and browser persistence
- Out of scope for this release: accounts, administration, write APIs, D1/R2
  data stores, payments, and remote catalogue ingestion at request time

## Assets

1. Scientific integrity: provenance, uncertainty, catalogue/procedural
   distinction, and source manifests.
2. Application integrity: source, build artefacts, dependencies, and
   deployment versions.
3. Availability: usable semantic content and stable browser rendering.
4. User agency: bookmarks, recent lists, tour progress, preferences, and
   motion/accessibility choices.
5. Deployment metadata: logs, access policy, environment configuration, and
   any future secrets.
6. Project reputation: avoidance of misleading scientific or security claims.

## Actors

- Ordinary and accessibility-tool users.
- Curious users modifying URLs or local storage.
- Automated scanners and denial-of-service clients.
- Attackers seeking script execution, supply-chain compromise, deployment
  access, or scientific misinformation.
- A compromised dependency or maintainer account.
- A mistaken contributor who adds unlicensed, fabricated, or unsafe content.
- The hosting provider and authorised deployment operators.

## Trust boundaries and entry points

```text
contributor machine ──► git / dependency registry ──► CI build
                                                       │
                                                       ▼
browser ◄──── HTTPS / hosting edge ◄──── saved deployment artefact
   │
   ├─ route and query input
   ├─ pointer/keyboard/touch input
   ├─ local storage
   ├─ WebGL driver / GPU
   └─ outbound authoritative links
```

Entry points include route segments, search/API query strings, cursors,
resource IDs, local-storage JSON, Cache Storage/service-worker responses,
catalogue/tour files, npm packages and lifecycle scripts, Worker requests,
image optimisation, WebGL shaders/resources, external links, CI workflow
changes, and hosting configuration.

## STRIDE and abuse analysis

| Threat                 | Example                                                                                      | Existing/design mitigation                                                                                                    | Residual risk                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Spoofing               | A procedural object is made to look catalogue-backed                                         | discriminated domain types, visible provenance class, manifest review                                                         | UI regression or misleading copy can still erase the distinction                                                  |
| Spoofing               | A hidden page is treated as an admin boundary                                                | no admin/account surface; hosting policy for restricted deployments                                                           | future features could incorrectly trust client state                                                              |
| Tampering              | Modified browser storage changes settings/bookmarks/history/progress                         | schema versioning, allowlists, bounded values, guarded access, v1 migration, in-memory fallback, reset/default path           | same-origin script execution can still alter all local state                                                      |
| Tampering              | A stale or compromised service worker serves altered content                                 | same-origin caching, successful-response checks, v2 cache rotation, query-free keys, 64-entry runtime cap, Atlas-prefix reset | a compromised build/origin can still populate a trusted cache                                                     |
| Tampering              | Source or derived data is changed without traceability                                       | checked-in manifests, deterministic pipeline, reviewable diffs, validation                                                    | maintainer or CI compromise can tamper with source and report                                                     |
| Repudiation            | A production build cannot be tied to reviewed source                                         | immutable lockfile, CI artefacts, saved Sites version and commit record                                                       | provenance/signing depends on repository and platform settings                                                    |
| Information disclosure | A secret is bundled under a public env name                                                  | no secret required, `.env*` ignored, secret scan, server-only rule                                                            | future configuration can be misclassified                                                                         |
| Information disclosure | Personal identity headers appear in logs/UI                                                  | Atlas does not consume optional identity; fixed redacted server-event schema; sensitive-field logging prohibition             | edge/platform logs and any future remote sink remain operator-controlled                                          |
| Information disclosure | Local diagnostics accidentally capture user content or become telemetry                      | fixed event kinds/units, safe names, numeric values only, 64-entry memory bound, no persistence or transmission               | future fields or a remote exporter require renewed privacy/security review                                        |
| Denial of service      | Dense scene, high DPR, resize loop, or malicious stored quality setting exhausts browser/GPU | bounded sample, quality controls, value clamping, disposal, semantic fallback                                                 | driver/device failures and deliberate request floods remain possible                                              |
| Denial of service      | Repeated requests consume edge resources                                                     | read-only API, bounded inputs, per-isolate 60/minute fallback, provider edge protection/caching                               | isolate-local counters reset and are not a distributed production boundary; health/readiness bypass them          |
| Elevation of privilege | Client-only flag unlocks writes                                                              | no write features; future operations require server checks                                                                    | not applicable until privileged features exist                                                                    |
| XSS                    | Malicious catalogue/tour text or crafted route executes script                               | React text encoding, no unsafe HTML/eval, build-time validation, Worker CSP                                                   | current CSP permits inline scripts/styles for vinext; dependency/framework or later unsafe rendering flaws remain |
| Clickjacking           | App is framed and controls are overlaid                                                      | Worker `frame-ancestors 'none'` and `X-Frame-Options: DENY`                                                                   | must still be confirmed on deployed responses                                                                     |
| Open redirect/phishing | Source link or return URL sends users to attacker                                            | fixed/validated HTTPS sources; no app redirect flow                                                                           | compromised source manifest can still point to a deceptive host                                                   |
| Supply chain           | Typosquat or compromised npm/action executes in CI                                           | lockfile, exact versions, Dependabot review, CodeQL/audit/secret scan, minimal dependencies                                   | registry, action, maintainer, or CI-token compromise                                                              |
| Scientific abuse       | UI presents estimates as exact or claims completeness                                        | provenance/uncertainty fields, sample disclosure, scientific review checklist                                                 | simplified educational copy can still overstate certainty                                                         |
| Licence abuse          | An image or data set is redistributed without permission                                     | provenance manifest requirement; no random remote assets                                                                      | licence interpretation needs human/legal review                                                                   |

## Highest-priority abuse cases

### Script execution through content

Catalogue and tour content may eventually come from external sources, making it
an input boundary even when checked in. Keep it as text, validate URLs, and
reject HTML. If Markdown is introduced, use a maintained parser with raw HTML
disabled, a protocol allowlist, and security tests.

### Scientific provenance erasure

An attacker or accidental edit could relabel procedural content as observed.
The type system, pipeline, UI badge, and About the Data view provide separate
checks. Reviews of data changes must compare source manifests and rendered
labels, not just schema validity.

### Dependency/build compromise

Install scripts and CI actions execute with meaningful access. The lockfile,
least-privilege workflow permissions, automated scanning, protected branches,
reviewed updates, and saved deployment versions reduce exposure. Production
deployment should not run from an unreviewed pull request or a contributor's
workstation.

### Browser/GPU resource exhaustion

The renderer can degrade availability without compromising the server. Bound
pixel ratio, scene density, timers, and persisted quality values; dispose GPU
resources; offer reduced quality and semantic fallback. Test repeated
mount/unmount and context loss.

### Service-worker persistence

An installed service worker can outlive a page and serve cached content after a
release or network failure. Cache only same-origin successful responses,
version names on behaviour changes, and verify update/activation. The current
worker removes query strings from cache keys and evicts the oldest runtime
entries above 64; this is a simple count bound, not a byte/storage quota.

### Read API abuse

The API is read-only and validates input, but read traffic can still consume
Worker CPU and expose catalogue projections at scale. The in-process limiter
is bounded memory but isolate-local. Production needs provider-edge quotas,
request/response monitoring with privacy limits, and a tested incident
response; health/readiness should not be treated as unprotected unlimited
work.

## Security assumptions

- TLS and edge isolation are correctly provided by the hosting platform.
- Production deployment access and branch protection are configured by the
  repository/deployment owner.
- Checked-in sample data is reviewed before release.
- No undocumented write or authentication endpoint is introduced.
- Browser and GPU vendors supply relevant security updates.

These are assumptions to verify, not controls implemented by application code.

## Residual risks and triggers for review

Review this model before adding any upstream runtime fetch, user content,
authentication, database/object-store binding, analytics, uploaded asset,
service-worker caching rule, Markdown/HTML renderer, administrative action,
payment, or cross-origin integration. Also review after a hosting/runtime
migration, API contract change, or material dependency change.

Current material residual risks are dependency/CI compromise, unsigned release
artefacts, inaccurate or mislicensed data introduced during review, unverified
production response headers, GPU instability on untested devices, and
hosting-log practices outside the repository.
