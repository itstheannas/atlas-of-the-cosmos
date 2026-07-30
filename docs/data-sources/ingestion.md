# Sample ingestion guide

## Purpose

The checked-in pipeline demonstrates a reproducible, legally reviewable path
from a pinned raw excerpt to normalised browser data and small spatial test
tiles. It is intentionally sized for development. It is not a downloader or
production Gaia/OpenNGC tiling service.

## Inputs

```text
data/
  raw/openngc/v20231203/selected-records.json
  manifests/sources/openngc-v20231203.sample.json
```

Raw version directories are immutable. The source manifest records the
upstream release, URL, licence/attribution, units, coordinate assumptions,
transformations, validation rules, limitations, and raw SHA-256. The pipeline
refuses to continue when the checksum or dataset version differs.

Do not replace a file inside an existing raw version. Add a new version
directory and manifest so released results remain reproducible.

## Run

```bash
npm run data:sample
```

The underlying entry point is `pipelines/run.mjs`. It:

1. resolves paths under the workspace and refuses to replace a directory
   outside `data/derived`;
2. verifies the raw checksum and source version;
3. validates/parses the selected records;
4. requires unique identifiers, coordinate ranges, provenance, and explicit
   catalogue origin;
5. writes stable-key JSON with a pinned reproducible timestamp;
6. writes a 64-point deterministic procedural batch with a fixed seed and
   explicit non-catalogue metadata;
7. emits preview/detail gzip tiles and a tile index;
8. records content hashes and accepted/rejected counts; and
9. emits a validation report.

Expected output:

```text
data/
  sample/catalogue.v1.json
  sample/procedural-context.v1.json
  manifests/openngc-development-sample.json
  derived/openngc-sample/v20231203/
    catalogue.json
    manifest.json
    tile-index.json
    validation-report.json
    preview/...
    detail/...
```

## Review

Generation is not approval. Before committing output:

```bash
npm run data:sample
npm run test:unit
git status --short -- data
git diff -- data
```

Review:

- source and generated checksums;
- accepted/rejected counts and error reasons;
- identifier and type mapping;
- sexagesimal-to-degree conversion;
- preservation of missing uncertainty;
- source classification and attribution;
- catalogue/procedural separation;
- deterministic output on a second run; and
- tile-index limitations.

Gzip files need a deterministic header as well as deterministic JSON content.
CI fails if running the pipeline changes committed data.

## Spatial test tiles

The development tiler uses equal-angle equatorial cells at two fixed levels.
This is simple and deterministic but has unequal solid angle and polar
distortion. It must not be called HEALPix or used as evidence of
production-scale spatial performance.

A production source adapter should select a reviewed spherical index, define
tile versioning and cache keys, benchmark density extremes, cap decoded memory,
support abort/back-pressure, and preserve source provenance inside or alongside
each tile.

## Adding a source

1. Verify provider terms, redistribution rights, attribution, and whether
   individual fields/assets have different rights.
2. Pin an immutable release or file and checksum it.
3. Add a source manifest with frames, epochs, units, nulls, uncertainty/quality
   fields, update policy, and limitations.
4. Write a source-specific normaliser that outputs canonical shared types.
5. Preserve original identifiers/classification and record every
   transformation.
6. Reject invalid records into a report; never manufacture replacement facts.
7. Add independent coordinate/unit fixtures and malformed-record cases.
8. Add deterministic derived outputs under a new dataset version.
9. Review licence compatibility for combined/derived data.
10. Update [provenance documentation](provenance.md) and the About the Data UI.

Automated provider downloads should be a separate explicit command. Do not make
ordinary `npm ci`, build, tests, or runtime navigation scrape or contact a
scientific provider.

## Failure and recovery

An integrity mismatch, rejected record, incomplete provenance, or nondeterministic
output fails the pipeline. Correct the source manifest/normaliser or deliberately
version the source; do not weaken the check to make a build pass.

The pipeline deletes and recreates only its validated versioned derived
directory. Raw inputs are never deleted. Restore derived files by checking out
the source/manifests and rerunning the pinned pipeline.
