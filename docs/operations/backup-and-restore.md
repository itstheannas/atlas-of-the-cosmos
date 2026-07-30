# Backup and restore

## Current data classes

The reference release has no active D1/R2 binding or server-side user data.

| Data                                                          | Backup authority                            | Restore method                                                                    |
| ------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| Source, docs, manifests, migrations                           | protected Git remote                        | checkout reviewed commit                                                          |
| npm dependency graph                                          | `package-lock.json` + registry availability | `npm ci`                                                                          |
| Derived sample data                                           | source inputs, manifests, pipeline version  | `npm run data:sample` and compare validation report                               |
| Built deployment                                              | recorded Workers deployment version         | `wrangler rollback` to the recorded version                                       |
| Device-local bookmarks/recent lists/tour progress/preferences | user's browser                              | no central restore; reset or user-controlled browser backup only                  |
| Service-worker route/static cache                             | disposable browser cache                    | repopulate from a verified online deployment; never treat as authoritative backup |
| Hosting logs/configuration                                    | deployment operator/provider                | provider-specific, with documented retention                                      |

Do not call browser local storage a backup. It is intentionally disposable and
may be cleared by the user, browser, or policy.

## Source and release restoration

1. Identify the last reviewed commit and its dataset manifest.
2. Restore to a new clean worktree; do not overwrite incident evidence.
3. Run `npm ci`, the explicit database no-op/migration commands,
   `npm run validate`, and `npm run security:audit`.
4. Compare generated data, build chunks, and the SBOM with the release record.
5. Smoke-test locally, then deploy through the normal approval process and
   record the new Workers version ID.
6. Verify API readiness and service-worker update in fresh and existing browser
   contexts.

For an urgent runtime rollback, redeploy the last known-good saved version
first, then perform the source restoration.

## Future D1/R2 requirements

Before enabling persistent server storage, define and test:

- included tables/buckets and explicit exclusions;
- encryption, access roles, regions, retention, and deletion;
- automated backup frequency and integrity checks;
- point-in-time or snapshot capabilities;
- schema-version compatibility and rollback policy;
- restore to an isolated environment;
- recovery point and recovery time objectives;
- quarterly restore exercises with recorded results; and
- ownership during an incident.

A successful backup job is not proof of restorability. Do not enable a
production binding until a representative restore has been rehearsed.
