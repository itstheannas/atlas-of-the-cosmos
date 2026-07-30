# Database schema, seed, and rollback

## Current boundary

The default Atlas release has no D1 binding and does not need a database at
runtime. Its public API reads the bundled, versioned sample. The relational
artifacts in this repository are an implementation-ready persistence boundary,
not evidence that a hosted database is active, backed up, or operationally
rehearsed.

## Artifacts

| Path                                                   | Purpose                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `db/schema.ts`                                         | Drizzle source schema and constraints                                   |
| `drizzle/0000_tired_miss_america.sql`                  | generated forward SQLite/D1 migration                                   |
| `db/seed.sql`                                          | idempotent four-record OpenNGC development fixture                      |
| `drizzle/rollback/0000_tired_miss_america.down.sql`    | destructive reverse migration, dependent tables first                   |
| `tests/integration/database-artifacts.test.mjs`        | executable migration, seed, constraint, parity, and rollback validation |
| `data/derived/openngc-sample/v20231203/manifest.json`  | fixture checksum and provenance authority                               |
| `data/manifests/sources/openngc-v20231203.sample.json` | source/licence/transformation policy                                    |

The seed fixes identifiers, timestamps, coordinates, source links, aliases,
and the dataset checksum. Running it twice leaves the same rows. It persists no
procedural context as catalogue data and does not infer missing distances.
Large spatial payloads belong in object storage; the relational
`spatial_tile_metadata` table stores only metadata and an object-storage key.

## Local verification

```bash
npm run db:generate
npm run test:integration
```

The integration suite executes the generated migration and seed twice in an
in-memory SQLite database with foreign keys enabled. It compares the four
stored identities and coordinates with `data/sample/catalogue.v1.json`, checks
the manifest checksum, exercises scientific-integrity constraints, verifies
foreign keys and the no-blob spatial boundary, then applies the down migration
and confirms that no application tables remain.

This is SQLite artifact coverage, not a hosted D1 connectivity, backup, or
restore test. `npm run db:migrate` and `npm run db:seed` deliberately report a
no-op while the hidden hosting manifest has no D1 binding. When a binding exists,
those commands refuse ad hoc mutation: the protected release workflow owns the
actual D1 operation.

## Production change policy

Before enabling D1:

1. create a separate staging database and configure the opaque binding through
   the hosting control plane;
2. take and verify a restorable backup or provider-supported snapshot;
3. apply forward migrations through the protected release workflow;
4. run the seed only for an explicitly approved empty/sample environment;
5. execute integrity queries and application smoke checks against staging;
6. record migration, dataset, deployment, backup, and approver identifiers;
7. rehearse recovery before production promotion; and
8. update retention, access control, monitoring, incident ownership, and
   privacy documentation.

Never seed the four-record development sample into an existing production
catalogue merely because the script is idempotent.

## Retention and recovery boundary

The unbound reference release retains no server-side object, bookmark, tour,
or preference rows. Migration, seed, and provenance files follow reviewed
source-control retention; derived sample files can be reproduced from the
pinned raw excerpt and manifest. Device-local bookmark/preference retention is
documented separately in the privacy model.

A hosted database must not be enabled until the operator publishes row-class
retention/deletion periods, backup frequency, restore objectives, region,
access roles, and incident ownership. The backup and restore requirements are
maintained in [Backup and restore](backup-and-restore.md).

## Rollback policy

Application rollback and schema rollback are separate operations. Prefer
redeploying the previous saved application version when its schema remains
compatible. For a database failure, prefer a reviewed forward repair or restore
from the verified backup. The committed down migration drops every Atlas table
and all stored rows; it is suitable only for an approved disposable environment
or a rehearsed full restore.

If the destructive down migration is explicitly approved:

1. stop writes and capture the migration/dataset/deployment identifiers;
2. verify the exact target database and backup;
3. apply
   `drizzle/rollback/0000_tired_miss_america.down.sql` through the protected
   workflow;
4. confirm no Atlas application tables remain;
5. restore the intended known-good schema and data; and
6. run foreign-key, row-count, checksum, API, and application smoke checks.

Do not treat a successful `DROP TABLE` sequence as a successful recovery.
