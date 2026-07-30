# Guided-tour authoring

## Authority

`packages/tour-engine/src/schema.ts` is the canonical TypeScript/runtime
contract. `data/schemas/tour.schema.json` is the JSON Schema representation for
external authoring tools. They must change together in one reviewed commit.
Runtime content must pass `validateTourDefinition`; a TypeScript type assertion
alone is not validation.

The seven bundled definitions and their 57 chapters pass the canonical runtime
validator and cross-reference checks in the current source. The draft 2020-12
JSON Schema is supplied for authoring, but it is not independently executed by
the present test stack; do not claim two-validator parity until a compatible
JSON Schema validator and drift tests are added.

The playback reducer in `packages/tour-engine/src/state-machine.ts` is
framework-neutral and supports load, play, pause, tick, next/previous, manual
exploration, resume, interruption, exit, and replay.

## Minimum definition

```json
{
  "schemaVersion": "1.0.0",
  "id": "sample-tour",
  "version": "1.0.0",
  "language": "en",
  "title": "Sample tour",
  "summary": "A short, factual description.",
  "chapters": [
    {
      "id": "first-stop",
      "title": "First stop",
      "caption": "A concise on-screen caption.",
      "transcript": "The complete accessible narration and visual context.",
      "sourceIds": ["declared-source-id"],
      "duration": { "value": 12, "unit": "s" },
      "waypoint": {
        "targetObjectId": "earth",
        "targetLock": true,
        "cameraDistance": { "value": 20000, "unit": "km" }
      },
      "transition": {
        "style": "fade",
        "duration": { "value": 0.25, "unit": "s" }
      },
      "pauseAtEnd": false,
      "contentBasis": "observed"
    }
  ],
  "sources": [
    {
      "id": "declared-source-id",
      "title": "Source title",
      "provider": "Source provider",
      "url": "https://example.org/authoritative-source",
      "accessedAt": "2026-07-29"
    }
  ]
}
```

Stable IDs are lower-case hyphenated slugs. Durations use explicit seconds.
Camera distances use `km`, `au`, `ly`, `pc`, `kpc`, or `Mpc`. Orientation, when
provided, supplies yaw, pitch, and roll in degrees; pitch stays between -90 and
+90.

## Scientific and accessibility rules

- `caption` is brief visible copy; `transcript` contains the complete text
  alternative needed to understand the chapter without the animation.
- Every tour has at least one authoritative HTTPS source.
- Every chapter has a non-empty, unique `sourceIds` list. Each ID must resolve
  to the source registry so the player can show the references relevant to that
  chapter rather than the whole-tour bibliography.
- `contentBasis` is one of `observed`, `derived`, `estimated`, `modelled`, or
  `illustrative`.
- Estimated, modelled, and illustrative chapters require a plain-language
  `caveat`.
- Do not call a model an observation or invent a waypoint target.
- A waypoint ID must resolve to a declared catalogue or scene target.
- The narration script is authored text. An optional audio URL must be HTTPS
  and needs asset licence/provenance, captions/transcript, and a duration.
- Do not encode essential meaning only in a camera path, colour, or sound.

## Motion and interruption

Authors choose `fly`, `fade`, or `cut`, but the player retains control. A
reduced-motion plan converts non-cut travel to a short fade (at most 0.25 s in
the canonical reducer). Pointer/keyboard/touch input, a new target, WebGL
context loss, or an error can interrupt playback. Chapter writing must still
make sense after a cut or resume.

Use `pauseAtEnd` for a deliberate reading/decision point, not to force dwell.
The user can always pause, go back/forward, explore manually, exit, and replay.

### Runtime mapping and remaining limits

The React player applies target ID, orientation, target lock, camera distance,
transition style/duration, and `pauseAtEnd`. Physical camera distances are
converted into bounded logarithmic schematic render distances: equivalent
units map equivalently and scale ordering is preserved, but a render unit is
not a kilometre or parsec. Authored yaw/pitch/roll use schematic scene axes,
not a physical body-attitude or ephemeris frame. Target lock governs the
travel; after arrival the chapter target remains the orbit pivot.

Pointer, wheel, keyboard, and standard-gamepad camera input pauses the chapter
timer for manual exploration. The in-player chapter selector, previous/next,
and URL deep links all change chapters.

The schema permits an HTTPS narration `audioUrl`, but the current player does
not fetch/play authored recordings. Bundled tours use transcript text and
optional device speech synthesis.

## Progress persistence

The UI stores a bounded, validated `SavedTourProgress` mapping inside
`atlas.cosmos.local-state` version 2. Each entry contains the tour ID and
version, optional last completed chapter ID, and reduced-motion state.
Completion advances only to the next contiguous chapter; direct chapter
selection and skip controls cannot overstate progress. Resume ignores a record
whose tour version no longer matches the bundled definition.

Playback mode, elapsed time, voice state, exact camera frames, and audio
position remain session state. Version-1 numeric chapter indexes are discarded
during migration because they did not distinguish a completed chapter from a
direct jump. When a tour changes chapter order or meaning, increment its
version and review progress compatibility rather than applying stale state
silently.

`/tours?tour=<tour-id>&chapter=<one-based-index>` provides chapter deep links.
Query values are resolved only against bundled validated tours and chapter
bounds. Do not persist exact camera frames or audio position as durable
scientific state.

## Validation and review

Run:

```bash
npm run typecheck
npm run test:unit
npm run test:a11y
npm run validate
```

Then manually:

- start from the tour and from a deep-linked chapter if supported;
- pause/resume, previous/next, manual exploration, interruption, exit, replay;
- repeat with reduced motion set before load;
- navigate with keyboard and a screen reader;
- compare captions/transcripts with what the visuals communicate;
- verify every source, evidence label, caveat, unit, and target;
- check narrow/mobile layout and text zoom; and
- confirm cleanup after repeated start/exit cycles.

When schema version changes, add migration/compatibility policy, invalid and
older-version tests, update both schema representations, and record the
decision. Do not silently accept unknown versions.
