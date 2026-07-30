# Performance guide

## Performance is measured, not inferred

The reference application uses a bounded sample and local search. That avoids
network catalogue latency but does not prove it will scale to a full survey.
Record results with commit, dataset version, browser, OS, CPU, memory, GPU,
viewport, device-pixel ratio, quality mode, power state, and a reproducible
interaction.

## Release budgets

These are acceptance targets, not recorded benchmark results:

| Area                  | Target                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| Interaction           | no recurring main-thread task over 50 ms during ordinary navigation      |
| Desktop scene         | stable experience aiming for 60 fps on a representative modern laptop    |
| Reduced/low-end scene | usable quality-reduced experience aiming for 30 fps                      |
| Search                | local sample results feel immediate and are bounded by input/sample size |
| Memory                | no monotonic growth after repeated select/tour/mount cycles              |
| Loading               | semantic shell/content appears progressively; no permanent spinner       |
| Cancellation          | search, camera travel, and tours stop promptly when interrupted          |

CI deterministic guards confirm selected architectural invariants but do not
prove real-device responsiveness or actual GPU disposal. The browser now keeps
a bounded local diagnostic buffer and has a coarse desktop smoke test. The
recorded release-baseline smoke passed the broad ceilings below; a
representative physical-hardware benchmark remains outstanding.

The browser smoke uses these deliberately broad regression ceilings:

| Recorded smoke metric                 | Ceiling |
| ------------------------------------- | ------- |
| initial semantic/graphics state ready | 20 s    |
| local Andromeda search result visible | 3 s     |
| three catalogue/explorer cycles       | 30 s    |
| optional JavaScript heap growth       | 256 MiB |

These ceilings catch severe regressions; they are not the product targets
above and do not establish perceived-speed, frame-rate, or memory-quality
claims.

## Measurement scenarios

Run each after warm-up and record at least three samples:

1. cold initial root navigation;
2. direct section route;
3. repeated catalogue searches including empty/disambiguated results;
4. select and change target 20 times;
5. start/interrupt a tour 10 times;
6. toggle quality and procedural layers;
7. resize and change device-pixel ratio;
8. mount/unmount or navigate away from the scene repeatedly;
9. simulate WebGL context loss; and
10. leave a representative tour running long enough to expose timer/resource
    growth.

Use browser performance and memory tooling. The local
`window.__ATLAS_DIAGNOSTICS__` snapshot can provide LCP, CLS, an INP candidate,
long tasks, and five-second renderer frame-rate/average-frame-time samples when
the browser supports those entries. It retains only 64 numeric events, is not
persisted or transmitted, and is not a substitute for captured traces and
heap/GPU-resource inspection.

## Rendering practices

- Keep animation-frame mutations out of React state.
- Reuse geometry/materials and draw procedural fields in batches/points.
- Cap pixel ratio and bound scene density by quality mode.
- Pause or reduce work when the document is hidden.
- Dispose GPU resources, listeners, observers, and scheduled frames.
- Avoid allocating arrays/objects every frame.
- Keep labels scale-aware and bounded.
- Make automated camera/tour work interruptible.

The current renderer implements one bounded floating-origin rebase,
logarithmic depth, point/instance batching, document-visibility pausing,
quality-based point counts/pixel-ratio caps, context recovery, and explicit
resource cleanup. It does not implement streamed astronomical tiles,
hierarchical local frames/LOD, worker decoding, back-pressure, or GPU occlusion.
Add and measure those before claiming large-catalogue scale.

## Bundle and data

Three.js is expected to be a material client dependency. Keep it within the
client renderer boundary so content routes do not accidentally duplicate it.
The recorded clean production build emitted a dynamically loaded
`CosmosScene` chunk of 597,549 bytes (about 583.5 KiB) minified, above the build tool's default
500 KiB warning threshold. Filenames, hashes, and sizes change by build, so
every release must record its own value rather than silently carrying this one
forward as a budget.

Review production chunk output on upgrades. Prefer splitting renderer
subsystems and loading effects/data by need; do not silence the warning by
raising a threshold without evidence. Do not move a complete upstream
catalogue into JavaScript to improve request count; use versioned spatial tiles
and bounded caches for future scale.

## Automated guard scope

`npm run test:performance` currently checks that:

- dense markers use `THREE.Points` and `THREE.InstancedMesh`;
- renderer source includes disposal and context-loss handling;
- `CosmosScene` is dynamically imported rather than imported into the main app
  shell; and
- `public/og.png` remains below 3 MB; and
- service-worker runtime keys omit query strings and its entry count is
  explicitly bounded.

These are regression guards, not performance benchmarks. Playwright currently
adds a desktop `@performance` smoke that writes
`outputs/performance-smoke.json`. It records coarse semantic-ready, search, and
repeated-navigation timings, optional Chromium heap values, graphics state,
browser version, and unexpected console-error count. The recorded
release-baseline run passed. It does not capture traces, heap profiles, frame-time
distributions, tile latencies, low-end/mobile runtime, or long-duration
scene/tour tests.

## Regression response

1. Reproduce on the same data/hardware profile.
2. Capture before/after traces.
3. Identify CPU, GPU, network, memory, or layout as the bottleneck.
4. Change one relevant variable.
5. Rerun the same scenario and record both results.
6. Preserve visual/scientific/accessibility meaning; do not "optimise" by
   removing provenance or the non-3D alternative.
