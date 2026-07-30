# Rendering and coordinate model

## Two coordinate spaces

Scientific coordinates and GPU display coordinates serve different purposes
and are never interchangeable.

1. **Scientific space** stores typed angles, distances, epochs, frames, and
   uncertainties. Calculations use JavaScript numbers (IEEE-754 double
   precision) in the coordinate package.
2. **Render space** is a bounded, camera-oriented representation consumed by
   Three.js and eventually by 32-bit GPU attributes. It may be rescaled,
   clamped, or laid out by scale band for legibility.

The current scene is an illustrative map of a curated sample. It does not place
the observable universe into a single physically linear coordinate system.

## Canonical scientific values

- Angles have named units; right ascension and declination are not anonymous
  numbers.
- Catalogue conversions are defined against a named frame and epoch. The
  sample coordinate conversion uses the package's documented J2000/ICRS
  assumptions.
- Distances carry units such as kilometres, astronomical units, light-years,
  parsecs, kiloparsecs, or megaparsecs.
- Unknown, modelled, and uncertain values stay distinguishable.
- A negative or missing parallax is not inverted into a fictitious exact
  distance.
- Significant figures in the UI reflect source precision; display rounding
  never mutates the stored value.

For an equatorial direction with right ascension `α`, declination `δ`, and
radial distance `r`, the conventional Cartesian vector is:

```text
x = r cos(δ) cos(α)
y = r cos(δ) sin(α)
z = r sin(δ)
```

Angles are converted to radians before trigonometric operations. The
coordinate package is the authority for this conversion. Render-axis mapping
belongs in the renderer adapter and must be tested independently; UI code must
not reproduce the formula ad hoc.

## Render mapping

The renderer receives a small view model containing an ID, display position,
visual class, provenance class, label metadata, and selection target. It does
not infer scientific facts from a sprite's radius, colour, or position.

Distance compression or scale-band layout is permitted only when:

- it is applied in the render adapter, not the scientific record;
- the interface labels the visual as compressed, schematic, or illustrative;
- numerical details continue to show the source value and unit;
- comparisons state whether distance and size share a scale; and
- selection links back to the unchanged catalogue record.

Procedural background points have generated IDs scoped to rendering and never
receive catalogue identifiers or object-detail claims.

## Camera and animation

Camera state is held by the renderer and updated in its animation loop. React
receives only deliberate, low-frequency events such as selected target,
quality change, or completed flight. Automated travel must:

- accept cancellation from pointer, keyboard, touch, Escape, or tour exit;
- avoid discontinuous orientation changes;
- use the reduced-motion path when requested; and
- clean up scheduled frames when the view unmounts.

The current reference scene uses a bounded camera, a logarithmic depth buffer,
and one floating-origin accumulator. When the camera moves beyond 48 render
units, the renderer adds that double-precision CPU vector to `worldOrigin`,
recentres the camera/target, and offsets the render root. Automated flights
interpolate world positions and subtract the current origin before rendering.

This is a useful camera-relative stability measure inside the schematic scene,
not a complete universe-scale coordinate system. There are no hierarchical
astronomical tile frames, streamed LOD representations, double-float GPU
attributes, or cross-fades between physical scale models.

## Scale strategy and future catalogue tiles

A production catalogue renderer should use a hierarchy:

```text
cosmological frame
  └─ group/cluster tile frame
      └─ galactic frame
          └─ stellar-neighbourhood frame
              └─ planetary-system frame
```

The shipped bounded rebase follows part of this rule but has only one render
root. At each future hierarchy boundary, retain double-precision scientific
positions on the CPU, subtract a local origin, and upload small
camera-relative values to the GPU. Cross-fade representations during frame
changes. Do not progressively mutate the source coordinate or accumulate
rebasing error.

## Visual encoding

- Catalogue-backed and procedural content use distinct labels/legends.
- Magnitude, temperature, and object type only affect visuals when the mapping
  is documented and the source value is present.
- Decorative scale is not physical radius.
- Bloom, colour, and point size must not be presented as measurements.
- The Scientific quality mode reduces decorative motion/exposure and favours
  stable labels, grids, orbit visibility, and provenance.

## Draw-call and lifecycle strategy

- Catalogue point markers share one `THREE.Points` batch.
- Other marker classes use `THREE.InstancedMesh` batches instead of one React
  component or draw call per object.
- Procedural context is one seeded point field with a quality-bounded count and
  a separate visibility control.
- The animation loop pauses while the document is hidden.
- Context loss stops rendering and reports a calm fallback; restoration resets
  state and resumes.
- Unmount removes pointer/keyboard/context/resize listeners, cancels the frame,
  and disposes scene geometry, materials, textures, render lists, and renderer.

The current scene consumes the in-memory editorial sample. It does not consume
the generated compressed tile fixtures, run an occlusion system, or decode
catalogue data in a worker.

## Verification

Coordinate tests should cover:

- round trips and known axes;
- degree/radian/hour-angle conversion;
- equatorial/galactic reference examples;
- parsec/light-year/AU conversions;
- missing and non-positive parallax policy;
- finite-value and range validation; and
- render mapping separately from scientific transforms.

Visual checks should cover selection alignment, camera interruption,
resize/high-DPI behaviour, reduced motion, context failure, and cleanup after
repeated mounting.
