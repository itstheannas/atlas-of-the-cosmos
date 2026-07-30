# ADR-0002: Separate scientific and render coordinates

- Status: Accepted
- Date: 2026-07-29

## Context

Astronomical values span many orders of magnitude. GPU attributes are commonly
32-bit floats, while catalogue records need explicit frames, epochs, units,
uncertainties, and responsible handling of missing values. A single naïve
world coordinate cannot represent planetary through cosmological scales with
useful precision.

## Decision

Keep a typed scientific representation as the source of truth and create a
separate render view model. Coordinate transformations happen in the
coordinate package using double-precision CPU arithmetic. Rescaling,
axis-mapping, distance compression, and illustrative placement happen only at
the renderer boundary.

The current reference scene remains bounded and honestly labelled. It uses a
camera-relative floating-origin rebase and logarithmic depth inside that
bounded schematic view. A future large-catalogue renderer still needs
hierarchical local frames, streamed LOD, and spatial tiles rather than
extending the current scene linearly.

## Consequences

- Visual changes cannot silently rewrite scientific values.
- Tests can distinguish astronomy maths from scene layout.
- Some positions and sizes are intentionally schematic and require visible
  disclosure.
- Extending the bounded rebase to hierarchical tile frames will not require
  changing the catalogue schema.
