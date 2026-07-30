# Client persistence

## Current scope

Atlas stores one validated device-local record:

```text
key: atlas.cosmos.local-state
schema version: 2
```

The current shape is:

```text
version
preferences
  theme
  quality
  reducedMotion
  proceduralBackground
  coordinateGrid
  orbitPaths
  educationalLabels
  cameraSpeed
bookmarks[]
recentObjects[]
recentSearches[]
tourProgress{tourId: SavedTourProgress}
  schemaVersion
  tourId
  tourVersion
  lastCompletedChapterId?
  reducedMotion
layerVisibility{layerId: boolean}
```

The record supports convenience without an account. It is not a catalogue
database, authentication mechanism, scientific cache, audit log, or backup.
Camera frames, pointer history, exact timestamps, catalogue/source records,
procedural arrays, narration position, identities, and secrets are not stored.

## Bounds and defaults

`lib/client-persistence.ts` is the contract:

- unsupported/missing schema versions reset to defaults;
- bookmarks are unique safe IDs, capped at 250;
- recent object IDs are unique safe IDs, capped at 20;
- recent searches are unique non-empty strings of at most 120 characters,
  capped at 10;
- tour progress is capped at 32 safe tour IDs; each record requires its
  matching tour ID, a bounded safe tour-version string, an optional safe last
  completed chapter ID, and a reduced-motion boolean;
- layer visibility overrides use safe layer IDs and booleans and are capped at
  64 entries;
- camera speed is clamped by validation to the accepted 0.25-3 range;
- theme and quality values are allowlisted; and
- missing or invalid preferences use documented defaults.

Tour progress advances only when the next contiguous chapter reports
completion. Direct chapter selection or skipping forward cannot overstate
completion. Resume uses the saved chapter only when its tour version matches
the bundled definition. Playback timing, voice state, exact camera pose, and a
partially elapsed or interrupted chapter remain session-only.

## Trust and validation

Browser storage is untrusted input. It can be edited, truncated, copied from an
older release, blocked, or throw on read/write. Rehydration therefore:

1. runs only after browser hydration;
2. catches storage acquisition/read and JSON parsing failures;
3. accepts schema version `2` or performs the documented version-1 migration;
4. accepts only known preference keys and values;
5. caps arrays, maps, and string lengths and deduplicates IDs/queries;
6. resolves IDs through the current catalogue before display;
7. rejects malformed or mismatched saved tour records; and
8. falls back to in-memory defaults without blocking the app.

Version 1 stored a numeric tour chapter index that could represent either a
completed chapter or a direct jump. Migration preserves the other bounded
preferences, bookmarks, recent lists, and layer overrides, but deliberately
drops that ambiguous progress. This is a one-time, fail-safe loss of resume
position rather than an invented completion claim.

Never spread an unvalidated stored object into application state. Persisted
quality values must not bypass renderer scene-density or pixel-ratio caps.

## Write policy

The app serialises one coherent record after state changes; it does not write
on every renderer frame. The settings reset clears the stored user state and
restores defaults (a later state flush may write a new default-only record);
individual bookmarks can be removed from the saved-object view.
Storage acquisition/read, write, and removal are guarded. If the browser
rejects them, the current session continues in memory and a calm status message
explains that changes will not persist.

Recent object/search lists are deliberately small convenience histories. Do
not expand them into raw interaction logs. Tour progress records only the
versioned last completed chapter and reduced-motion state, not viewing
timestamps, elapsed playback, exact interaction history, or behavioural
analytics.

## Privacy and user control

State remains on the current origin and device, subject to browser policy. It
is not encrypted from scripts running on the same origin, so it must remain
non-sensitive. Clearing site data removes the state; there is no server restore
or cross-device sync. A deployment-origin change creates a different browser
storage namespace.

The service worker uses separate Cache Storage for core routes and static
assets. The in-app reset removes the local record and requests deletion only
for Cache Storage names prefixed `atlas-cosmos-`; it never deletes unrelated
origin caches. If storage or cache deletion is rejected, the current session
returns to defaults and reports that persistence cleanup was unavailable.
Browser site-data controls remain the complete origin-level reset.

## Schema changes

For a compatible change:

1. define old and new validated shapes;
2. implement a pure deterministic migration, or explicitly choose a safe
   reset;
3. add valid, missing, corrupt, oversized, unknown-version, and storage-error
   tests;
4. preserve only fields with clear current meaning;
5. bump the schema version and storage documentation; and
6. update the ADR, privacy model, threat model, and relevant browser tests.

Any server synchronisation, account binding, personal notes, cross-origin
storage, or durable behavioural history requires a new ADR, privacy/security
review, retention/deletion/export rules, server authorisation, conflict
resolution, and tested backup/restore.
