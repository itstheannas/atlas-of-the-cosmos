# Data provenance and local-first operation

## What ships

The repository ships a deliberately small sample intended to exercise the
interface, search, tours, coordinate utilities, and provenance display. It is
not a replacement for Gaia, SIMBAD, the NASA Exoplanet Archive, JPL
ephemerides, or another maintained scientific catalogue.

The authoritative machine-readable manifests live under `data/manifests/`.
Sample and derived records live under `data/sample/` and `data/derived/`.
Educational display content is also assembled in `lib/cosmos-data.ts`. When a
human-readable statement and a manifest conflict, treat the record as invalid
until reviewed; do not silently pick the more convenient value.

## Included distributable catalogue excerpt

The machine-readable scientific sample is a four-record excerpt of
[OpenNGC v20231203](https://github.com/mattiaverga/OpenNGC/tree/v20231203):
the Andromeda Galaxy (`NGC0224`/M 31), Crab Nebula
(`NGC1952`/M 1), Great Orion Nebula (`NGC1976`/M 42), and Hercules
Globular Cluster (`NGC6205`/M 13).

| Field                | Recorded value                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Provider             | OpenNGC contributors                                                                           |
| Dataset/release      | OpenNGC `v20231203`                                                                            |
| Atlas sample version | `v20231203-atlas-1`                                                                            |
| Licence              | [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Attribution          | Contains data from OpenNGC, © OpenNGC contributors, licensed under CC BY-SA 4.0.               |
| Raw excerpt          | `data/raw/openngc/v20231203/selected-records.json`                                             |
| Source manifest      | `data/manifests/sources/openngc-v20231203.sample.json`                                         |
| Derived manifest     | `data/manifests/openngc-development-sample.json`                                               |

The raw-file SHA-256 is recorded and verified before transformation. The
pipeline parses source sexagesimal positions to degrees, retains the source
type code, normalises identifiers, preserves V magnitude and heliocentric
redshift when present, and does not infer distance. The working frame is
explicitly labelled FK5 at Julian epoch 2000.0 because an upstream "J2000"
label alone is not a claim of milliarcsecond ICRS precision.

The selected OpenNGC fields do not contain coordinate or magnitude uncertainty,
so uncertainty is unavailable—not zero. OpenNGC combines upstream sources;
field-level scientific use should consult its `Sources` column and full
documentation.

Derived preview/detail cells use a dependency-free equal-angle equatorial grid.
They are test fixtures, not HEALPix: cell solid angles are unequal and
distortion grows near the poles. A production sky-tile system needs a reviewed
spherical index.

## Editorial/reference layer

`lib/cosmos-data.ts` contains a broader, hand-curated educational layer. It is
not a bulk redistribution or reproducible mirror of every source it mentions:

The current content inventory contains 49 editorial exhibits, nine
source-registry entries, eight scale layers, 32 explorer-layer definitions,
eight learning articles with three explanation levels, 32 glossary entries,
and seven guided tours with 57 chapters. These counts describe this release,
not catalogue completeness.

| Source ID                | Reference                                                                                    | Use in this repository                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `nasa-solar-system`      | [NASA Solar System Exploration](https://science.nasa.gov/solar-system/) / NSSDCA fact sheets | selected mean values and explanatory context                                   |
| `jpl-horizons`           | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)                                           | identifiers and methodology; no bundled live state vectors                     |
| `gaia-dr3`               | [Gaia DR3 documentation](https://gea.esac.esa.int/archive/documentation/GDR3/)               | selected cross-identification/context; no bulk Gaia table                      |
| `nasa-exoplanet-archive` | [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/)                         | selected educational examples; not a live archive snapshot                     |
| `openngc`                | [OpenNGC](https://github.com/mattiaverga/OpenNGC)                                            | identifiers/context plus the separate reproducible four-record pipeline above  |
| `simbad`                 | [SIMBAD](https://simbad.cds.unistra.fr/simbad/)                                              | identifier/basic-property cross-checks; no service dump                        |
| `eht-results`            | [Event Horizon Telescope science](https://eventhorizontelescope.org/science)                 | paraphrased result context; no collaboration image or paper text redistributed |
| `planck-pr3`             | [Planck publications](https://www.cosmos.esa.int/web/planck/publications)                    | rounded cosmology context; no maps redistributed                               |
| `atlas-editorial`        | local authored explanations and diagram models                                               | synthesis and clearly labelled conceptual/illustrative content                 |

Each object fact and coordinate in that layer points to a source ID and carries
an evidence status. The object panel resolves that source ID to the narrowest
available authoritative object record, archive overview, ephemeris service,
published-result page, or local methodology entry. A dataset-context link is
labelled as such; it is not misrepresented as a redistributed source row.
Manual selection remains less reproducible than the checked raw-file pipeline
and must be reviewed against the cited live archive or primary publication
before precision scientific use.

Learning articles carry topic-specific source-ID lists. Guided-tour chapters
also carry their own source IDs rather than inheriting an undifferentiated
tour-level bibliography. Runtime and API validation reject missing or dangling
IDs.

Provider-specific citation instructions used by the registry include:

- [Gaia DR3 credit and citation instructions](https://gea.esac.esa.int/archive/documentation/GDR3/Miscellaneous/sec_credit_and_citation_instructions/);
- [NASA Exoplanet Archive acknowledgement and citation guidance](https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html);
- [Planck 2018 results I: overview and cosmological legacy](https://sci.esa.int/web/planck/-/60507-planck-collaboration-2018);
- [SIMBAD](https://simbad.cds.unistra.fr/simbad/), which requests citation of
  the original paper and the literature attached to each object; and
- [OpenNGC v20231203](https://github.com/mattiaverga/OpenNGC/tree/v20231203),
  paired with the exact sample checksum and CC BY-SA 4.0 attribution above.

Rights also differ by item. NASA-hosted material can contain third-party
content; an organisation name is not a blanket CC0 grant. Literature,
collaboration imagery, archive data, logos, and site text can have separate
terms. This repository deliberately links/paraphrases where it does not ship
the underlying asset. A release owner must verify the exact source and terms
for every new redistributed record or asset rather than relying on a general
summary in application copy. The repository currently has no general project
`LICENSE`, so the OpenNGC sample's CC BY-SA terms must not be treated as a
licence for unrelated project-authored code or content.

## Record classes

Every visual or search result must be classifiable as one of:

| Class                   | Meaning                                                    | May have a scientific catalogue ID?                          |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Catalogue-backed        | Traceable to a declared source or authoritative reference  | Yes, only the source identifier                              |
| Derived                 | Calculated from declared input with method and assumptions | Inherits source links; the result itself is labelled derived |
| Estimated/modelled      | Source or model provides a non-direct value                | Only with an explicit status and uncertainty where available |
| Procedural/illustrative | Generated for visual continuity or teaching                | No fabricated scientific identifier                          |
| Conceptual              | A useful model rather than an observed boundary/object     | No claim of direct observation                               |

Unknown fields stay unknown. The pipeline must not replace missing values with
plausible-looking numbers.

## Required source metadata

Before a new external data set can be distributed, its manifest must record:

- provider and dataset name;
- release/version and retrieval or publication date;
- stable source URL or publication reference;
- access method and integrity information when provided;
- licence and required attribution, verified from the provider;
- whether redistribution and derived redistribution are permitted;
- input frame, epoch, units, and null conventions;
- uncertainty and quality fields retained or intentionally omitted;
- transformations, filtering, and deduplication rules;
- validation results and known limitations; and
- maintainer and update cadence.

Do not infer a licence from an organisation being public, academic, or
governmental. Provider imagery, logos, textures, and 3D models require their own
asset provenance; a catalogue licence does not automatically cover them.

## Pipeline contract

The local pipeline under `pipelines/` is expected to:

1. read an explicitly supplied source or deterministic seed;
2. preserve source metadata separately from derived outputs;
3. validate types, ranges, units, and identifiers;
4. normalise without discarding unknown/uncertainty status;
5. reject malformed records with a useful report;
6. produce deterministic, browser-sized outputs and spatial previews;
7. hash or version the output manifest; and
8. leave raw inputs immutable.

Run the sample pipeline with:

```bash
npm run data:sample
```

Review the diff in data records and manifests. A generated file is not trusted
merely because generation succeeded.

## Runtime behaviour

The React application and `/api/v1` read/project catalogue, tour, and source
material from the deployed application bundle. The API is not an upstream
proxy. The release performs no hidden scrape and needs no API key. This makes a
particular release reproducible, but also means source corrections require a
new build.

Large upstream catalogues must not be copied into the bundle. A future remote
catalogue adapter should expose signed/versioned manifests, paginated or
spatially tiled results, schema validation, abortable requests, explicit cache
limits, and source attribution in every object response.

## Imagery and procedural content

The reference visualisation uses programmatic scene elements and repository
assets. Do not add downloaded astronomy imagery, textures, fonts, audio, or
models without an attribution entry containing its author/provider, source,
licence, modifications, and required credit.

Procedural stars and dust may establish context, but they must be toggleable
and visually identified as illustrative. They must never appear in catalogue
search results as observed objects.

## Scientific review checklist

- Does the source permit this use and redistribution?
- Are version and retrieval date explicit?
- Are frame, epoch, and units named?
- Are uncertainty, estimate, and unknown states preserved?
- Are significant figures defensible?
- Is an illustrative reconstruction labelled at the point of use?
- Can a reviewer trace the displayed value to a record and manifest?
- Does the transformation have deterministic tests?
- Does the UI avoid implying completeness?
