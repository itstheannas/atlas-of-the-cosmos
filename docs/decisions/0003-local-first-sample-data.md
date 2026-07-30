# ADR-0003: Local-first, versioned sample data

- Status: Accepted
- Date: 2026-07-29

## Context

Recognised astronomical catalogues can be very large, have different licences,
and may require network access or provider-specific query limits. The default
application must run without credentials or paid services, and it must never
imply that illustrative context is a verified catalogue record.

## Decision

Ship a small, deterministic, legally reviewable sample with a versioned
manifest. Run-time search operates locally against that sample. Every
catalogue-backed record includes provenance fields, while procedural context
uses a distinct discriminated type and visible label.

The local pipeline validates and derives browser-sized data. It does not
silently download or redistribute external catalogues. A future source adapter
must record provider, dataset/version, access method, licence, attribution,
retrieval date, transformations, units, uncertainty handling, and validation
results.

## Consequences

- Development and the deployed sample have no catalogue-service dependency.
- Search is fast and deterministic but intentionally incomplete.
- Dataset updates are code-reviewed and tied to a build.
- Scaling requires a new versioned tile/API adapter; it is not achieved by
  bundling a full upstream catalogue.
