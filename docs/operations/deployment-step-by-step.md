# Step-by-step deployment

Atlas of the Cosmos is an Annas M. Ishtiaq project. This guide is the
operator-facing release path from a clean checkout to an owner-only hosted
production version. It supplements the policy and architecture details in the
[deployment model](deployment.md), [release process](release-process.md), and
[operations runbook](runbook.md).

The bundled release does not require a database, object-storage bucket, paid
service, external catalogue API, or runtime secret. Optional database and
object-storage bindings must remain unbound unless Annas M. Ishtiaq approves a
separate reviewed change.

## Deployment outcomes

Use four distinct outcomes:

| Outcome                  | Purpose                                                            | Required access                                     |
| ------------------------ | ------------------------------------------------------------------ | --------------------------------------------------- |
| Local production preview | Rehearse the built Worker on the release machine                   | Local machine only                                  |
| Hosted preview           | Review a pull-request or candidate commit without touching staging | Separate owner-only preview project                 |
| Staging                  | Test the exact candidate on hosted infrastructure                  | Separate owner-only staging project                 |
| Production               | Promote the already reviewed candidate                             | Owner-only production project and explicit approval |

A hosted URL is a real deployment. Do not use the production project as an
informal preview environment.

The repository contains a manually dispatched `Release candidate` workflow.
Its validation job runs before its environment-specific packaging job. The
packaging job uses `deployment: false`, so it can apply environment review
rules without creating a misleading deployment record.

Configure `preview`, `staging`, and `production` as separate repository
environments. Where the repository plan supports required reviewers for a
private repository, require them for production packaging and prevent
self-review. Where that feature is unavailable, retain a separate,
time-stamped owner approval record. Neither mechanism replaces the later
production-promotion approval.

## 1. Prepare the release machine

Required:

- Git;
- Node.js `>=22.13.0`;
- npm;
- `tar` (`tar.exe` on Windows) for the managed release archive;
- the repository's committed `package-lock.json`;
- access to the intended owner-only preview, staging, and production projects;
- one environment-specific managed-hosting metadata value for preview and
  staging, stored as the protected `ATLAS_HOSTING_METADATA_JSON` environment
  secret; and
- authority to request short-lived source-write credentials.

Check the tools:

```powershell
git --version
node --version
npm.cmd --version
```

On macOS or Linux, use `npm` in place of `npm.cmd`, `cd` in place of
`Set-Location`, and `sha256sum` in place of `Get-FileHash`.

## 2. Check out the exact candidate

Use a fresh directory. Replace the bracketed values with the reviewed private
repository and candidate commit:

```powershell
git clone <PRIVATE_REPOSITORY_URL> atlas-of-the-cosmos
Set-Location atlas-of-the-cosmos
git checkout --detach <RELEASE_COMMIT>
git status --short
git rev-parse HEAD
```

Expected:

- `git status --short` prints nothing; and
- `git rev-parse HEAD` equals `<RELEASE_COMMIT>`.

Stop if the worktree is dirty or the commit is not the reviewed candidate.

## 3. Install exactly the locked dependencies

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd ls --depth=0
```

Do not substitute `npm install`, an automatic major update, or a forced audit
fix during release preparation.

If no supported system browser is available for the browser suite, install the
project's pinned browser runtime before validation:

```powershell
npm.cmd exec -- playwright install chromium
```

## 4. Validate the environment and local data boundary

```powershell
npm.cmd run env:check
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run assets:sanitize
npm.cmd run data:sample
git diff --exit-code -- public/og.png data
```

For the bundled unbound configuration:

- migration and seed report an explicit no-op;
- the social image remains byte-identical; and
- deterministic sample generation produces no source diff.

Any unexplained change is a failed release check. Review it; do not overwrite
or commit it automatically.

## 5. Run the full automated gate

```powershell
npm.cmd run validate
npm.cmd run security:audit -- --no-fund
git diff --check
git status --short
```

`npm run validate` includes environment checks, formatting, linting, both
TypeScript checks, deterministic data generation, unit/integration/security/
accessibility/performance tests, coverage, working-tree and Git-history secret
scans, licence policy, the high-severity dependency audit, the production
build, rendered-Worker checks, desktop/mobile browser tests, five visual
baselines, and SBOM generation.

The separate audit command creates an explicit release-log entry. Four
moderate development-only findings in the database tooling chain are currently
documented; critical or high findings block promotion.

Expected final state: every command exits successfully and
`git status --short` is empty.

## 6. Record immutable release evidence

```powershell
$releaseCommit = git rev-parse HEAD
npm.cmd run security:history
Get-FileHash data\derived\openngc-sample\v20231203\manifest.json -Algorithm SHA256
Get-FileHash public\og.png -Algorithm SHA256
```

Record:

- release commit;
- application version;
- catalogue revision and manifest hash;
- social-image hash;
- Node/npm/browser versions;
- test totals and intentional skips;
- coverage totals;
- build warnings and client-chunk sizes;
- dependency-audit findings;
- licence-report and SBOM paths;
- performance measurements; and
- known limitations.

Never record credentials, cookies, identity headers, authorisation headers, or
browser-storage dumps.

## 7. Build and verify the release archive

The archive command refuses a dirty worktree, removes ignored build output,
runs a fresh production build, excludes build-generated private metadata, and
adds only the metadata/migrations for the selected environment. It records the
exact source commit plus a SHA-256 for every packaged file, the selected
metadata, and the final archive.

For production:

```powershell
npm.cmd run release:package -- --environment production
Get-FileHash outputs\atlas-release-production.tar.gz -Algorithm SHA256
Get-Content outputs\release-package-production.json
tar.exe -tzf outputs\atlas-release-production.tar.gz
```

On macOS or Linux:

```bash
npm run release:package -- --environment production
sha256sum outputs/atlas-release-production.tar.gz
cat outputs/release-package-production.json
tar -tzf outputs/atlas-release-production.tar.gz
```

Expected archive entries include:

```text
dist/server/index.js
dist/client/
```

The package also contains the selected private managed-hosting metadata,
runtime configuration, and the reviewed forward/down migrations. Archive
validation rejects missing client assets, missing required files, unexpected
archive roots, and unexpected private-metadata entries. Do not publish the
archive as a public download.

Never reuse one project-bound archive across environments. Preview and staging
must be packaged by their matching protected workflow environment; production
uses the production metadata already committed in the private repository.

## 8. Run the local production preview

The full gate already creates the build. Start that exact output:

```powershell
npm.cmd start
```

Open the printed local URL and perform these minimum checks:

1. Open the explorer and select Earth.
2. Search for Andromeda and use the travel action.
3. Toggle the procedural-background and one scientific layer.
4. Start, pause, resume, interrupt, and exit a tour.
5. Change quality, time, reduced-motion, contrast, and theme settings.
6. Add and remove a bookmark.
7. Open the catalogue and a source citation.
8. Verify the semantic fallback with graphics support disabled.
9. Inspect the browser console and network panel.
10. Check `/api/v1/health`, `/api/v1/ready`, and `/api/v1/version`.

Stop the preview with `Ctrl+C` after the checks are recorded.

## 9. Prepare hosted preview and staging

Create separate managed projects for hosted preview and staging. Neither may
share the production project identifier, deployment history, or storage.

Use hosted preview for an ephemeral review of an exact pull-request or
candidate commit:

1. Select `preview` when manually dispatching the `Release candidate`
   workflow.
2. Wait for the protected job to finish and download its validated candidate
   artifact.
3. Confirm `release-package-preview.json` names the requested commit and
   `targetEnvironment: "preview"`, and that the archive hash matches.
4. Publish the commit to the owner-only preview project using the source and
   deployment procedure below.
5. Run the principal smoke test.
6. Remove the preview deployment when review finishes; retain the validation
   record for the release decision.

Staging must be a separate managed project from production.

1. Confirm its title identifies it as staging.
2. Confirm access is custom and owner-only.
3. Confirm exactly the approved owner is allowed.
4. Confirm there are no user-group, workspace-group, tenant-group, or public
   grants.
5. Confirm optional database and object-storage bindings are unbound.
6. Confirm no production secret is present.
7. Confirm each protected environment's `ATLAS_HOSTING_METADATA_JSON` selects
   that environment's project and does not contain a credential.

Do not continue if the access shape cannot be verified.

## 10. Publish the exact source to preview or staging

Use these exact managed-control operations and retain their returned opaque
values unchanged:

1. `get_site(project_id)`: confirm `access_mode` is custom, the current owner is
   the only allowed user, and all user/workspace/tenant group lists are empty.
   Record only that policy shape; do not export the raw control response,
   identity values, or any bypass/session value it may contain.
2. `create_source_repository_write_credential(project_id)`: request a
   short-lived repository credential. Inject its source URL, username, and
   token into process-scoped values. Disable shell transcription/tracing.
3. Push without placing the token in a URL, command argument, Git config, file,
   or command history. On Windows, use a temporary ask-pass helper:

   ```powershell
   $askPass = Join-Path ([IO.Path]::GetTempPath()) "atlas-askpass-$PID.cmd"
   [IO.File]::WriteAllText(
     $askPass,
     "@echo off`r`necho %ATLAS_SOURCE_TOKEN%`r`n",
     [Text.Encoding]::ASCII
   )
   $env:GIT_ASKPASS = $askPass
   $env:GIT_TERMINAL_PROMPT = "0"
   $sourceUsername = $env:ATLAS_SOURCE_USERNAME
   $sourceRemote = "https://${sourceUsername}@<MANAGED_SOURCE_HOST>/<PROJECT_SOURCE_PATH>"
   try {
     git push `
       $sourceRemote `
       "HEAD:refs/heads/main"
     if ($LASTEXITCODE -ne 0) { throw "Source push failed." }
   } finally {
     Remove-Item Env:ATLAS_SOURCE_TOKEN -ErrorAction SilentlyContinue
     Remove-Item Env:ATLAS_SOURCE_USERNAME -ErrorAction SilentlyContinue
     Remove-Item Env:GIT_ASKPASS -ErrorAction SilentlyContinue
     Remove-Item Env:GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
     Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue
   }
   ```

   On macOS or Linux:

   ```bash
   askpass="$(mktemp)"
   cleanup_atlas_source_auth() {
     unset ATLAS_SOURCE_TOKEN ATLAS_SOURCE_USERNAME GIT_ASKPASS
     unset GIT_TERMINAL_PROMPT
     rm -f -- "$askpass"
   }
   trap cleanup_atlas_source_auth EXIT HUP INT TERM
   printf '%s\n' '#!/bin/sh' \
     'printf "%s\n" "$ATLAS_SOURCE_TOKEN"' > "$askpass"
   chmod 700 "$askpass"
   export GIT_ASKPASS="$askpass" GIT_TERMINAL_PROMPT=0
   git push \
     "https://${ATLAS_SOURCE_USERNAME}@<MANAGED_SOURCE_HOST>/<PROJECT_SOURCE_PATH>" \
     "HEAD:refs/heads/main"
   ```

4. Confirm the managed source branch head equals `$releaseCommit`.
5. Select only the matching
   `outputs/atlas-release-<ENVIRONMENT>.tar.gz`; compare its SHA-256 with
   `outputs/release-package-<ENVIRONMENT>.json`.
6. `save_site_version(project_id, commit_sha, archive)`: pass the exact
   `$releaseCommit` and absolute archive path. Record returned `version_id` and
   user-facing version number. Saving is not deployment.
7. `get_site_version(project_id, version_id)`: confirm its source provenance
   names `$releaseCommit`.
8. `deploy_private_site_version(project_id, version_id)`: use only after the
   owner-only access check succeeds. Record returned `deployment_id`.
9. `get_deployment_status(project_id, version_id, deployment_id)`: poll until
   the control reports terminal success or terminal failure. Record its
   production URL only on success.

Do not describe a queued or running deployment as successful.

## 11. Verify staging

Run the complete [release smoke check](runbook.md#release-smoke-check) against
the staging URL. At minimum verify:

- the 19 principal sections;
- explorer/search/travel/object details;
- all seven tours and their 57 chapters;
- keyboard and touch navigation;
- portrait and landscape layouts;
- 200% zoom, reduced motion, high contrast, and the light theme;
- warm offline navigation and reconnection;
- unsupported-graphics fallback;
- no unexpected console, page, asset, or API errors;
- the expected owner-only access policy; and
- the release commit and dataset version in the release record.

For owner-only hosting, open the deployed origin in the approved owner browser
session. Do not copy its cookie or identity token. In that page's developer
console, run this same-origin verification:

```js
const paths = ["/", "/api/v1/health", "/api/v1/ready", "/api/v1/version"];
const inspected = [];
for (const path of paths) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
  });
  inspected.push({
    path,
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get("content-type"),
    csp: response.headers.get("content-security-policy"),
    nosniff: response.headers.get("x-content-type-options"),
    referrer: response.headers.get("referrer-policy"),
    permissions: response.headers.get("permissions-policy"),
    hsts: response.headers.get("strict-transport-security"),
    traceparent: response.headers.get("traceparent"),
    serverTiming: response.headers.get("server-timing"),
  });
}
console.table(inspected);

const catalogueUrl = "/api/v1/catalogue?limit=1";
const catalogue = await fetch(catalogueUrl, {
  credentials: "same-origin",
  cache: "no-store",
});
const etag = catalogue.headers.get("etag");
if (!etag) throw new Error("Catalogue response has no ETag.");
const revalidated = await fetch(catalogueUrl, {
  credentials: "same-origin",
  cache: "no-store",
  headers: { "If-None-Match": etag },
});
if (revalidated.status !== 304) {
  throw new Error(`Expected 304; received ${revalidated.status}.`);
}
({ etag, revalidationStatus: revalidated.status });
```

Every API path must return the application response rather than an
authentication/denial document, `ready` must report ready, and ETag
revalidation must return `304 Not Modified`.

Record and fix any failure before production approval.

## 12. Obtain production approval

Production promotion requires an explicit approval record from Annas M.
Ishtiaq or a protected release process delegated by him.

The approval must identify:

- the exact release commit;
- the exact staging version tested;
- the accepted residual risks and limitations;
- the production access mode; and
- the intended rollback version.

Approval authorises promotion of that candidate only. It does not authorise
making the project public, enabling new storage, adding telemetry, or changing
scientific data.

## 13. Promote to production

1. Run `get_site(project_id)` and reconfirm the production project is
   owner-only with no group grants.
2. Reconfirm the production source branch will receive `$releaseCommit`.
3. Obtain a new short-lived production source credential with
   `create_source_repository_write_credential(project_id)`.
4. Repeat the ask-pass source push above for the exact reviewed source.
5. Use the separately built
   `outputs/atlas-release-production.tar.gz`; do not reuse preview/staging.
6. Run `save_site_version(project_id, commit_sha, archive)` and verify the
   returned saved version provenance.
7. Run `deploy_private_site_version(project_id, version_id)`.
8. Poll `get_deployment_status(project_id, version_id, deployment_id)` to
   terminal success or failure.
9. Record the production version, deployment, URL, timestamp, approver, and
   rollback target.
10. Repeat the staging HTTP/header/API checks against production.
11. Review recent runtime logs with sensitive values redacted.
12. Observe the release window for errors, asset failures, or scientific-data
    mismatches.

If source upload is not explicitly authorised, stop after the local production
preview. The repository must not be transmitted merely because the local gate
passed.

## 14. Production acceptance checklist

Production is accepted only when all items are recorded:

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
- [ ] owner-only access confirmed;
- [ ] terminal deployment success recorded;
- [ ] root, assets, API, headers, ETag, and cache checks passed;
- [ ] service-worker update and warm-offline recovery checked;
- [ ] recent runtime logs reviewed;
- [ ] known limitations attached; and
- [ ] rollback version identified.

## 15. Roll back a degraded release

Rollback redeploys a previously saved version; it does not rewrite Git history.

1. Declare the current release degraded.
2. Stop further promotion.
3. Run `list_site_versions(project_id)` and select the recorded last known-good
   saved version from the same production project.
4. Obtain the rollback approval required by the incident policy.
5. Run `get_site_version(project_id, version_id)` and verify its commit/data
   provenance against the last-known-good release record.
6. Run `deploy_private_site_version(project_id, version_id)`.
7. Poll `get_deployment_status(project_id, version_id, deployment_id)` to
   terminal success or failure.
8. Repeat root, API, header, service-worker, clean-context, and existing-context
   smoke checks.
9. Record replaced/restored version identifiers, time, approver, symptoms, and
   dataset versions.
10. Preserve logs and the faulty release for investigation.
11. Correct forward through the normal validation and approval process.

The bundled release has no active server-side database or user data, so this
rollback does not require a database down migration. Reassess that statement
before enabling persistent bindings.

## 16. Release-record template

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
Staging version and result:
Production approver:
Production saved version:
Production deployment and terminal status:
Production URL:
Access-policy shape:
Header/API/cache verification:
Runtime-log review:
Known limitations:
Rollback version:
Operator:
```
