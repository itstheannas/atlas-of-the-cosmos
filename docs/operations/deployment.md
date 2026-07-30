# Deployment guide

For a single operator-ready sequence with exact commands, verification
requests, promotion gates, and rollback steps, use the
[step-by-step deployment guide](deployment-step-by-step.md). This document
defines the underlying policy and environment model.

## Deployment model

The repository builds a portable Worker application for managed Sites hosting.
The hidden hosting manifest is the source of truth for the opaque Sites project
and optional binding identifiers. Never invent, derive, copy from another
project, or hand-edit an opaque project ID.

If the file has no `project_id`, initialise the site exactly once through the
Sites control plane and immediately persist the returned opaque ID unchanged.
Do not call site creation repeatedly to work around a slug or permission
failure. Obtain source credentials through the control plane, keep them
process-scoped, push the exact candidate source, and never commit the token.

The default release needs no D1 database, R2 bucket, upstream external API, or
secret. Its same-origin `/api/v1` projects bundled data. Keep unused bindings
unset.

### Current access boundary

The current Sites project was inspected with a custom private policy: one
allowed owner account, no allowed groups, and no workspace- or tenant-wide
group access. Preserve that owner-only boundary unless Annas M. Ishtiaq
explicitly approves a reviewed policy change. Record the policy shape, not
identity values or access tokens, in release evidence.

## Prerequisites

- Node.js `>=22.13.0`
- npm and the committed `package-lock.json`
- access to the intended Sites project for a hosted release
- a reviewed commit on the protected release branch

## Local production rehearsal

From a clean checkout:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run db:migrate
npm run db:seed
npm run assets:sanitize
npm run validate
npm run security:audit
npm run start
```

Open the printed local URL and complete the smoke checks in the
[runbook](runbook.md). `npm ci --ignore-scripts --no-audit --no-fund` is the
reviewed release installation command;
do not substitute an unconstrained dependency update during release.
`npm run start` serves the already built Worker through the project-local
preview runtime; it does not rebuild source.
Migration/seed are explicit no-ops while the hidden hosting manifest has no D1
or R2 binding. They must fail closed rather than inventing a hosted operation.
`validate` checks the environment/hosting shape, regenerates sample data, runs
coverage plus the source/history security and licence gates, performs the
network-backed high-severity advisory audit, builds, starts a production server
for browser tests, checks the final Worker, and writes the SBOM. The explicit
standalone audit command above preserves a separate release-log entry for the
master verification sequence. The asset sanitizer must be lossless; verify
that it leaves no unexpected source diff before promotion.

## Environments

Use independent configuration and independent managed projects for hosted
preview, staging, and production. A hosted deployment URL is a real
deployment, not a client-only safety boundary.

| Environment    | Purpose                                      | Data                                       | Promotion                             |
| -------------- | -------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| Local          | implementation and deterministic checks      | bundled sample                             | none                                  |
| Hosted preview | ephemeral review of a candidate commit       | bundled candidate sample                   | reviewed candidate only               |
| Staging        | browser/device checks of a release candidate | same versioned sample intended for release | reviewed commit only                  |
| Production     | policy-restricted release                    | immutable versioned sample                 | explicit approval / protected release |

The manually dispatched `Release candidate` workflow has separate `preview`,
`staging`, and `production` choices. Its validation job finishes before the
environment-specific packaging job, and `deployment: false` avoids a false
deployment record. Where supported for the private repository, administrators
must protect production packaging with required reviewers and prevent
self-review; otherwise retain a separate owner approval record. Source upload
and deployment remain separately authorised operator actions.

Do not connect production secrets or storage to pull-request builds. At present
there are no such resources.

## Staging release

1. Choose the reviewed commit and ensure the worktree exactly matches it.
2. Run the local production rehearsal above.
3. Push that exact source state.
4. Run `npm run release:package -- --environment staging` on that clean source
   state with the matching protected metadata and retain the generated
   commit/file/archive hash manifest.
5. In the managed control interface, save a version from that pushed commit
   and the generated archive.
6. Deploy the saved version to the separate staging project.
7. Wait for deployment to reach a terminal successful state.
8. Record commit, dataset manifest/version, build time, deployment URL, and
   validation results.
9. Run smoke, API readiness, service-worker update/offline fallback, keyboard,
   reduced-motion, responsive, and WebGL-failure checks.

Do not describe a non-terminal deployment as successful.
No separate staging project or staging deployment is recorded in the current
audit; create and verify that boundary before claiming staged promotion.

## Production release

1. Confirm the staging record maps to the commit being promoted.
2. Confirm CI, security scans, dependency-licence report/review, SBOM
   generation, and the release checklist passed. A high/critical finding
   requires remediation or a time-bounded, owner-approved mitigation record;
   it must not be hidden.
3. Obtain the explicit approval required by the protected production process.
4. Create and hash the production-bound archive with
   `npm run release:package -- --environment production`.
5. Save a production version from the exact pushed source state and matching
   production archive.
6. Deploy only that saved version to the production managed project.
7. Wait for terminal status and record the returned version/deployment IDs as
   opaque values.
8. Confirm the deployed access policy remains the approved owner-only policy;
   do not make the release public as a convenience.
9. Run the runbook smoke checks against production.
10. Observe errors and user-impact signals during the release window.

Application code must not contain a production token or project credential.
Hosting access belongs in the control plane.

## Security verification

Against the final HTTPS origin, inspect:

- TLS and certificate validity;
- `Content-Security-Policy`;
- `X-Content-Type-Options`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- frame restrictions;
- HSTS, after confirming the domain/subdomain policy;
- cache headers for HTML versus fingerprinted assets; and
- absence of secrets, stack traces, and internal identity headers in HTML or
  browser bundles.

Also verify `/api/v1/health`, `/api/v1/ready`, `/api/v1/version`, API
cache/ETag behaviour, the absence of wildcard CORS, and provider-edge rate
limits. Confirm the managed Sites access policy has exactly the approved
single-user scope and no group-wide grants. The application limiter is per
isolate and is not sufficient for a public production quota.

The policy target is documented in
[Security model](../security/security-model.md). Do not claim a header is
active based only on source configuration; check the deployed response.

## Rollback

Rollback is a deployment action, not a source rewrite:

1. Declare the release degraded and stop further promotion.
2. Select the last known-good **saved** version for the same production Sites
   project.
3. Deploy that version.
4. Wait for terminal success and run the smoke checks.
5. Record the replaced and restored version IDs, time, approver, symptoms, and
   dataset versions.
6. Keep the faulty release available for investigation; do not destroy logs or
   overwrite evidence.
7. Fix forward through the normal reviewed release process.

Because the current release has no bound server-side database or user data,
application rollback does not require a database migration. The committed
optional schema/down migration is not active. Revisit this procedure before
enabling D1/R2 or a remote upstream/persistent API.

Test rollback in a fresh browser context and an already-controlled
service-worker context. A successful origin rollback is not enough if a stale
worker/cache still serves an inconsistent artefact; inspect the active worker,
cache name, navigation response, and hashed assets.
