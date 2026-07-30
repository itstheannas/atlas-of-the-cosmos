# Step-by-step deployment

Atlas of the Cosmos is an Annas M. Ishtiaq project. This guide is the
operator-facing release path from a clean checkout to a hosted production
deployment on Cloudflare Workers. It supplements the policy and architecture
details in the [deployment model](deployment.md),
[release process](release-process.md), and [operations runbook](runbook.md).

The bundled release does not require a database, object-storage bucket, paid
plan, external catalogue API, or runtime secret. Optional D1/R2 bindings must
remain unbound unless Annas M. Ishtiaq approves a separate reviewed change.

## Deployment outcomes

| Outcome                  | Purpose                                          | Where                                             |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| Local production preview | Rehearse the built Worker on the release machine | `npm run start` on the local machine              |
| Staging                  | Test the exact candidate on Cloudflare           | separate Worker, e.g. `atlas-of-the-cosmos-stage` |
| Production               | Promote the already reviewed candidate           | the production Worker `atlas-of-the-cosmos`       |

Staging and production are **separate Workers** in the same Cloudflare
account. They never share a name, and a candidate is always deployed to
staging before production.

Reachability note: every `*.workers.dev` URL is publicly reachable by anyone
who knows it. Staging relies on an undiscoverable name plus short lifetime,
not on an access policy. If confidential staging is ever required, place the
staging Worker behind Cloudflare Access before uploading anything sensitive.

## 1. Prepare the release machine

Required:

- Git;
- Node.js at the pinned version in [`.nvmrc`](../../.nvmrc);
- npm and the committed `package-lock.json` (Wrangler is a locked
  devDependency; no global install is needed);
- a Cloudflare account owned by Annas M. Ishtiaq with Workers enabled (the
  free plan is sufficient); and
- an interactive browser session for `wrangler login`.

Check the tools:

```powershell
git --version
node --version
npm.cmd --version
```

On macOS or Linux, use `npm` in place of `npm.cmd`, and `sha256sum` in place
of `Get-FileHash`.

Authenticate Wrangler once per machine (opens a browser window; approve in
the intended Cloudflare account):

```powershell
npm.cmd exec -- wrangler login
npm.cmd exec -- wrangler whoami
```

`whoami` must report the intended account before any deploy. Never paste an
API token into a file, shell history, or commit; interactive OAuth or an
environment-scoped `CLOUDFLARE_API_TOKEN` secret are the only approved
credential paths.

## 2. Check out the exact candidate

Use a fresh directory. Replace the bracketed values with the repository and
reviewed candidate commit:

```powershell
git clone <REPOSITORY_URL> atlas-of-the-cosmos
Set-Location atlas-of-the-cosmos
git checkout --detach <RELEASE_COMMIT>
git status --short
git rev-parse HEAD
```

Expected: `git status --short` prints nothing and `git rev-parse HEAD` equals
`<RELEASE_COMMIT>`. Stop if the worktree is dirty or the commit is not the
reviewed candidate.

## 3. Install exactly the locked dependencies

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
```

Do not substitute `npm install`, an automatic major update, or a forced audit
fix during release preparation. If no supported system browser is available
for the browser suite:

```powershell
npm.cmd exec -- playwright install chromium
```

## 4. Validate the environment and data boundary

```powershell
npm.cmd run env:check
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run assets:sanitize
npm.cmd run data:sample
git diff --exit-code -- public/og.png data
```

For the bundled unbound configuration, migration and seed report an explicit
no-op, the social image stays byte-identical, and deterministic sample
generation produces no diff. Any unexplained change is a failed release
check; review it, do not overwrite it.

## 5. Run the full automated gate

```powershell
npm.cmd run validate
npm.cmd run security:audit -- --no-fund
git status --short
```

`npm run validate` includes environment checks, formatting, linting, both
TypeScript checks, deterministic data generation, unit/integration/security/
accessibility/performance tests, coverage, working-tree and Git-history
secret scans, licence policy, the high-severity dependency audit, the
production build, rendered-Worker checks, the browser suite with visual
baselines, and SBOM generation. Expected final state: every command exits
successfully and the worktree is clean.

## 6. Record immutable release evidence

```powershell
git rev-parse HEAD
npm.cmd run security:history
Get-FileHash data\derived\openngc-sample\v20231203\manifest.json -Algorithm SHA256
Get-FileHash public\og.png -Algorithm SHA256
```

Record: release commit, application version, dataset manifest hash,
social-image hash, Node/npm/browser versions, test totals, coverage,
build warnings and chunk sizes, audit findings, licence/SBOM paths, and
known limitations. Never record credentials or tokens.

## 7. Run the local production preview

`npm run validate` already produced the build in `dist/`. Serve that exact
output locally:

```powershell
npm.cmd run start
```

Open the printed local URL and complete at minimum:

1. Open the explorer and select Earth.
2. Search for Andromeda and use the travel action.
3. Toggle the procedural-background layer and one scientific layer.
4. Start, pause, resume, interrupt, and exit a tour.
5. Change quality, time, reduced-motion, contrast, and theme settings.
6. Add and remove a bookmark.
7. Open the catalogue and a source citation.
8. Verify the semantic fallback with graphics support disabled.
9. Inspect the browser console and network panel.
10. Check `/api/v1/health`, `/api/v1/ready`, and `/api/v1/version`.

Stop the preview with `Ctrl+C` after the checks are recorded.

## 8. Deploy the candidate to staging

The build writes a complete Worker configuration to
`dist/server/wrangler.json` (module Worker plus static assets). Deploy that
exact output under the staging name:

```powershell
npm.cmd exec -- wrangler deploy --config dist/server/wrangler.json --name atlas-of-the-cosmos-stage
```

Record the deployment output: Worker name, version ID, and the staging URL
`https://atlas-of-the-cosmos-stage.<account-subdomain>.workers.dev`.

## 9. Verify staging

Run the [release smoke check](runbook.md#release-smoke-check) against the
staging URL. At minimum verify the 19 principal sections, explorer/search/
travel/object details, tours, keyboard and touch navigation, portrait and
landscape layouts, 200% zoom, reduced motion, high contrast, the light
theme, warm offline navigation, unsupported-graphics fallback, and the
absence of unexpected console, page, asset, or API errors.

In the staging page's developer console, run this same-origin verification:

```js
const paths = ["/", "/api/v1/health", "/api/v1/ready", "/api/v1/version"];
const inspected = [];
for (const path of paths) {
  const response = await fetch(path, { cache: "no-store" });
  inspected.push({
    path,
    status: response.status,
    contentType: response.headers.get("content-type"),
    csp: response.headers.get("content-security-policy"),
    nosniff: response.headers.get("x-content-type-options"),
    referrer: response.headers.get("referrer-policy"),
    permissions: response.headers.get("permissions-policy"),
    hsts: response.headers.get("strict-transport-security"),
    traceparent: response.headers.get("traceparent"),
  });
}
console.table(inspected);

const catalogueUrl = "/api/v1/catalogue?limit=1";
const catalogue = await fetch(catalogueUrl, { cache: "no-store" });
const etag = catalogue.headers.get("etag");
if (!etag) throw new Error("Catalogue response has no ETag.");
const revalidated = await fetch(catalogueUrl, {
  cache: "no-store",
  headers: { "If-None-Match": etag },
});
if (revalidated.status !== 304) {
  throw new Error(`Expected 304; received ${revalidated.status}.`);
}
({ etag, revalidationStatus: revalidated.status });
```

Every path must return the application response, `ready` must report ready,
security headers must be present, and ETag revalidation must return
`304 Not Modified`. Record and fix any failure before production approval.

## 10. Obtain production approval

Production promotion requires an explicit approval record from Annas M.
Ishtiaq or a protected release process delegated by him. The approval must
identify the exact release commit, the staging deployment tested, the
accepted residual risks, and the intended rollback version. Approval
authorises promotion of that candidate only.

## 11. Promote to production

1. Confirm `wrangler whoami` still reports the approved account.
2. Confirm the local build in `dist/` is the exact validated candidate
   (worktree clean at `<RELEASE_COMMIT>`).
3. Deploy under the production name:

   ```powershell
   npm.cmd exec -- wrangler deploy --config dist/server/wrangler.json --name atlas-of-the-cosmos
   ```

4. Record the returned version ID and production URL.
5. List deployments and confirm the new version is current:

   ```powershell
   npm.cmd exec -- wrangler deployments list --config dist/server/wrangler.json --name atlas-of-the-cosmos
   ```

6. Repeat the staging HTTP/header/API console checks against production.
7. Confirm the provider-edge rate-limiting rule (below) is active.
8. Review live logs briefly with `wrangler tail` while exercising the site;
   confirm no errors or sensitive values:

   ```powershell
   npm.cmd exec -- wrangler tail --config dist/server/wrangler.json --name atlas-of-the-cosmos --format pretty
   ```

9. Observe the release window for errors, asset failures, or scientific-data
   mismatches.

## 12. Provider-edge rate limiting

The application's in-memory limiter is per isolate and is not a production
quota. After the first production deploy, create a rate-limiting rule in the
Cloudflare dashboard (Security → WAF → Rate limiting rules; the free plan
includes one rule) covering `/api/*`, and record its threshold in the release
record. Re-verify the rule after any zone or account change.

## 13. Production acceptance checklist

- [ ] exact source commit promoted;
- [ ] worktree clean;
- [ ] post-commit Git-history secret scan passed;
- [ ] deterministic data manifest unchanged;
- [ ] all automated gates passed;
- [ ] no unresolved critical/high dependency finding;
- [ ] reciprocal-licence obligations reviewed;
- [ ] SBOM attached;
- [ ] staging verification passed;
- [ ] explicit production approval attached;
- [ ] terminal deployment success and version ID recorded;
- [ ] root, assets, API, headers, ETag, and cache checks passed;
- [ ] service-worker update and warm-offline recovery checked;
- [ ] edge rate-limiting rule confirmed;
- [ ] `wrangler tail` log review completed;
- [ ] known limitations attached; and
- [ ] rollback version identified.

## 14. Roll back a degraded release

Rollback redeploys a previously recorded Workers version; it does not
rewrite Git history.

1. Declare the current release degraded and stop further promotion.
2. List versions and identify the recorded last known-good version ID:

   ```powershell
   npm.cmd exec -- wrangler deployments list --config dist/server/wrangler.json --name atlas-of-the-cosmos
   ```

3. Obtain the rollback approval required by the incident policy.
4. Roll back:

   ```powershell
   npm.cmd exec -- wrangler rollback --config dist/server/wrangler.json --name atlas-of-the-cosmos
   ```

   Wrangler prompts for the target version; select the recorded known-good
   version and record the returned new deployment.

5. Repeat root, API, header, service-worker, clean-context, and
   existing-context smoke checks.
6. Record replaced/restored version IDs, time, approver, symptoms, and
   dataset versions.
7. Preserve logs and the faulty release for investigation, then correct
   forward through the normal validation and approval process.

The bundled release has no active server-side database or user data, so
rollback requires no database migration. Reassess before enabling persistent
bindings.

## 15. Release-record template

```text
Project: Atlas of the Cosmos — Annas M. Ishtiaq
Environment:
Release commit:
Application version:
Dataset version:
Dataset manifest hash:
Social-image hash:
Validation date:
Node/npm/browser:
Unit/integration/security/accessibility totals:
Browser/visual totals:
Coverage:
Performance measurements:
Dependency audit:
Licence review:
SBOM:
Staging Worker/version and result:
Production approver:
Production Worker/version ID:
Production URL:
Edge rate-limit rule:
Header/API/cache verification:
Runtime-log review:
Known limitations:
Rollback version:
Operator:
```
