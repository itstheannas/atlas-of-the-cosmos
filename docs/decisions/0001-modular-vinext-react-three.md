# ADR-0001: Modular vinext, React, and Three.js application

- Status: Accepted
- Date: 2026-07-29
- Amended: 2026-07-30 — the hosting target is Cloudflare Workers; the build
  already produced a portable Worker, so the application architecture is
  unchanged.

## Context

The experience needs semantic content and direct routes as well as an
imperative, high-frequency 3D scene. The repository starter already produces
a portable Cloudflare Worker through vinext, Vite, React server components,
and a Worker entry point. Splitting a small reference implementation into
services would add deployment and failure modes without a measured scaling
benefit.

## Decision

Use a modular monolith:

- vinext supplies the Next-style application model on the existing Vite and
  Cloudflare Workers deployment path;
- React 19 owns documents, routing, controls, accessibility, and
  low-frequency interaction state;
- Three.js is used directly behind a client-only rendering component;
- scientific, catalogue, coordinate, and tour logic live in framework-neutral
  packages; and
- bundled, versioned sample data is the default catalogue adapter; and
- versioned read-only API routes project the same bundled content from the
  modular monolith.

The renderer owns its animation loop and mutable Three.js objects. It emits
coarse application events instead of putting per-frame values into React
state. The 3D view is progressive enhancement, not the only way to obtain
content.

## Consequences

- One artefact is straightforward to install, test, and deploy.
- Domain packages remain usable in pipelines and unit tests.
- Direct Three.js control makes lifecycle and disposal explicit.
- The application must enforce module boundaries through review and tests
  because they are not network boundaries.
- vinext compatibility must be checked on upgrades; not every Next.js feature
  is necessarily supported identically.
- A remote upstream catalogue, database, or object store is deferred until its
  need and operating model are demonstrated. The local `/api/v1` projection
  adds no separate service or persistent data authority.

## Alternatives considered

- **React Three Fiber:** valuable for declarative scenes, but the small
  imperative scene does not justify another runtime abstraction today.
- **Separate API and renderer services:** rejected for the sample because the
  read-only API projects bundled data and there is no remote catalogue or
  account workload.
- **Canvas-only custom renderer:** rejected because Three.js provides a mature
  WebGL abstraction and resource model.
