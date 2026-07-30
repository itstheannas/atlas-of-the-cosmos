# ADR-0004: Minimal, versioned client persistence

- Status: Accepted
- Date: 2026-07-29
- Amended: 2026-07-30 for schema version 2

## Context

Bookmarks and visual preferences are useful without an account. Server-side
profiles would introduce identity, authorisation, retention, deletion, breach,
and backup obligations that the reference release does not otherwise need.
Browser storage can be corrupt, manually edited, stale, unavailable, or cleared
without notice.

## Decision

Persist only non-sensitive settings, stable object IDs, bounded recent
object/search lists, and per-tour chapter progress on the current device. Use
the single `atlas.cosmos.local-state` namespace and schema version `2`. Treat
stored JSON as untrusted: parse defensively, allowlist keys and values, bound
arrays and strings, migrate known older versions, and reset unknown versions.

Storage is accessed only in the browser after hydration. Camera frames, search
results, catalogue records, narration/audio position, raw interaction
timestamps, identity, and secrets are not persisted. Tour persistence records
only a validated tour ID/version, optional last completed chapter ID, and
reduced-motion state. Completion advances contiguously, so direct chapter
selection cannot overstate progress.

JSON parsing, unknown versions, and browser-storage acquisition/read failures
degrade to defaults. Write/removal failures retain the in-memory session and
produce a user-visible non-persistence warning.

Version-1 numeric tour indexes are deliberately discarded during migration
because they cannot distinguish completion from a direct jump; other bounded
version-1 fields are preserved. The settings reset also requests deletion of
Cache Storage names prefixed `atlas-cosmos-` and leaves unrelated origin caches
untouched.

## Consequences

- Anonymous exploration remains the default and no account service is needed.
- Data does not sync between browsers and can be lost when site data is
  cleared.
- There is no central bookmark backup or account-level deletion request.
- Any later synchronisation feature needs a new ADR, privacy review, server
  authorisation, conflict handling, export/deletion support, and migration.
