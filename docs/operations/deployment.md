# Deployment guide

For a single operator-ready sequence with exact commands, verification
requests, promotion gates, and rollback steps, use the
[step-by-step deployment guide](deployment-step-by-step.md). This document
defines the underlying policy and environment model.

## Deployment model

The repository builds a portable Cloudflare Worker: `npm run build` writes
the server module, static client assets, and a complete generated
`dist/server/wrangler.json` configuration. A deployment is `wrangler deploy`
of that exact validated build output under a fixed Worker name. There is no
separate hosting manifest, archive format, or control-plane credential file
in the repository.

The default release needs no D1 database, R2 bucket, upstream external API,
or runtime secret. Its same-origin `/api/v1` projects bundled data. Keep
unused bindings unset; enabling a binding is a reviewed architecture change,
not a deployment convenience.

### Account and credential boundary

Deployments use a Cloudflare account owned by Annas M. Ishtiaq. Interactive
`wrangler login` OAuth on the release machine, or an environment-scoped
`CLOUDFLARE_API_TOKEN` held in a protected CI secret, are the only approved
credential paths. Never commit a token, place one in a URL or shell history,
or reuse a personal token for automation. Protect the Cloudflare account
with a strong unique password and two-factor authentication.

Every `*.workers.dev` URL is publicly reachable. Staging privacy relies on
an undiscoverable Worker name and short lifetime; do not upload content to
staging that must remain confidential unless the staging Worker is first
placed behind Cloudflare Access.

## Prerequisites

- Node.js at the version pinned in [`.nvmrc`](../../.nvmrc)
- npm and the committed `package-lock.json`
- Wrangler (a locked devDependency; run through `npm exec -- wrangler`)
- access to the intended Cloudflare account for a hosted release
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
reviewed release installation command; do not substitute an unconstrained
dependency update during release. `npm run start` serves the already built
Worker through the project-local preview runtime; it does not rebuild
source. Migration/seed are explicit no-ops while D1 is unbound; they must
fail closed rather than inventing a hosted operation. `validate` checks the
environment, regenerates sample data, runs coverage plus the source/history
security and licence gates, performs the network-backed high-severity
advisory audit, builds, starts a production server for browser tests, checks
the final Worker, and writes the SBOM.

## Environments

| Environment | Purpose                                      | Worker                      | Promotion                             |
| ----------- | -------------------------------------------- | --------------------------- | ------------------------------------- |
| Local       | implementation and deterministic checks      | `npm run start` preview     | none                                  |
| Staging     | browser/device checks of a release candidate | `atlas-of-the-cosmos-stage` | reviewed commit only                  |
| Production  | public release                               | `atlas-of-the-cosmos`       | explicit approval / protected release |

Staging and production are separate Workers that never share a name. A
hosted deployment URL is a real deployment, not a client-only safety
boundary. Do not connect production secrets or storage to candidate builds;
at present there are no such resources.

Deployment is a manual operator action taken only after the full CI gate has
passed on the exact candidate commit. If automated deployment is introduced
later, it must run from a protected workflow using an environment-scoped
`CLOUDFLARE_API_TOKEN` secret and preserve the same approval gates.

## Staging release

1. Choose the reviewed commit and ensure the worktree exactly matches it.
2. Run the local production rehearsal above.
3. Deploy the exact `dist/` output with
   `npm exec -- wrangler deploy --config dist/server/wrangler.json --name atlas-of-the-cosmos-stage`.
4. Record commit, dataset manifest/version, build time, Worker version ID,
   staging URL, and validation results.
5. Run smoke, API readiness, service-worker update/offline fallback,
   keyboard, reduced-motion, responsive, and WebGL-failure checks against
   the staging URL.

Do not describe a failed or unverified deploy as successful.

## Production release

1. Confirm the staging record maps to the commit being promoted.
2. Confirm CI, security scans, dependency-licence report/review, SBOM
   generation, and the release checklist passed. A high/critical finding
   requires remediation or a time-bounded, owner-approved mitigation record;
   it must not be hidden.
3. Obtain the explicit approval required by the protected production
   process.
4. Deploy the same validated `dist/` output with
   `npm exec -- wrangler deploy --config dist/server/wrangler.json --name atlas-of-the-cosmos`.
5. Record the returned version ID as the release identity alongside the
   commit.
6. Run the runbook smoke checks against production.
7. Confirm the provider-edge rate-limiting rule is active.
8. Observe errors and user-impact signals during the release window.

Application code must not contain a production token or credential.

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
cache/ETag behaviour, the absence of wildcard CORS, and the provider-edge
rate-limiting rule. The application limiter is per isolate and is not
sufficient for a public production quota.

The policy target is documented in
[Security model](../security/security-model.md). Do not claim a header is
active based only on source configuration; check the deployed response.

## Rollback

Rollback is a deployment action, not a source rewrite:

1. Declare the release degraded and stop further promotion.
2. Identify the last known-good Workers version with
   `npm exec -- wrangler deployments list`.
3. Roll back with `npm exec -- wrangler rollback` and select the recorded
   known-good version.
4. Run the smoke checks against production.
5. Record the replaced and restored version IDs, time, approver, symptoms,
   and dataset versions.
6. Keep the faulty release available for investigation; do not destroy logs
   or overwrite evidence.
7. Fix forward through the normal reviewed release process.

Because the current release has no bound server-side database or user data,
application rollback does not require a database migration. Revisit this
procedure before enabling D1/R2 or a remote upstream/persistent API.

Test rollback in a fresh browser context and an already-controlled
service-worker context. A successful origin rollback is not enough if a
stale worker/cache still serves an inconsistent artefact; inspect the active
worker, cache name, navigation response, and hashed assets.
