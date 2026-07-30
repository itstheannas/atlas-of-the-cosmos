import {
  type TourChapter,
  type TourDefinition,
  validateTourDefinition,
} from "../packages/tour-engine/src/schema.ts";
import type {
  DistanceUnit,
  EvidenceStatus as CanonicalEvidenceStatus,
} from "../packages/shared-types/src/index.ts";

/**
 * Editorial presentation projections for the immersive UI. Canonical catalogue
 * records and measurement types live in packages/shared-types; these exhibits
 * add human-facing copy, display strings, conceptual structures, and render
 * hints without pretending to be ingestion-pipeline records.
 */
export type EditorialEvidenceStatus =
  CanonicalEvidenceStatus | "conceptual" | "unknown";

export type CosmicReferenceFrame =
  | "object-local"
  | "heliocentric-ecliptic"
  | "local-interstellar"
  | "galactocentric"
  | "local-group-barycentric"
  | "comoving-cosmological";

export type RecordKind =
  | "catalogue-backed"
  | "derived-structure"
  | "conceptual-model"
  | "procedural-context";

export type DisplayUnit =
  | "km"
  | "au"
  | "light-year"
  | "parsec"
  | "kiloparsec"
  | "megaparsec"
  | "day"
  | "second"
  | "year"
  | "kelvin"
  | "earth-mass"
  | "jupiter-mass"
  | "solar-mass"
  | "earth-radius"
  | "solar-radius"
  | "apparent-magnitude"
  | "absolute-magnitude"
  | "degree"
  | "kilometre-per-second"
  | "redshift"
  | "billion-year"
  | "dimensionless";

export interface ScientificDisplayValue {
  readonly label: string;
  readonly value: number | readonly [number, number] | null;
  readonly unit: DisplayUnit;
  readonly display: string;
  readonly status: EditorialEvidenceStatus;
  readonly uncertainty?: string;
  readonly note?: string;
  readonly sourceId: string;
}

export interface CoordinateSnapshot {
  readonly frame: "ICRS" | "heliocentric-ecliptic" | "galactic";
  readonly epoch: "J2000.0" | "J2016.0" | "date-dependent";
  readonly longitudeDeg?: number;
  readonly latitudeDeg?: number;
  readonly rightAscension?: string;
  readonly declination?: string;
  readonly sourceId: string;
  readonly note: string;
}

export interface EditorialDataSource {
  readonly id: string;
  readonly provider: string;
  readonly dataset: string;
  readonly version: string;
  readonly publicationOrSnapshotDate: string;
  readonly accessMethod: string;
  readonly url: string;
  readonly licence: string;
  readonly attribution: string;
  readonly citation: string;
  readonly citationUrl: string;
  readonly updateStrategy: string;
  readonly coordinateSystem: string;
  readonly units: readonly string[];
  readonly uncertaintyFields: string;
  readonly validationRules: readonly string[];
  readonly transformations: readonly string[];
  readonly knownLimitations: readonly string[];
}

export interface ScientificSourceLink {
  readonly sourceId: string;
  readonly label: string;
  readonly url: string;
  readonly recordIdentifier: string | null;
  readonly scope:
    | "object-record"
    | "ephemeris-service"
    | "dataset-context"
    | "published-result"
    | "methodology";
}

export interface CosmosExhibit {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scientificName?: string;
  readonly aliases: readonly string[];
  readonly objectType: string;
  readonly scaleLayerId: string;
  readonly recordKind: RecordKind;
  readonly evidenceStatus: EditorialEvidenceStatus;
  readonly catalogueIds: readonly string[];
  readonly summary: string;
  readonly significance: string;
  readonly distance?: ScientificDisplayValue;
  readonly facts: readonly ScientificDisplayValue[];
  readonly coordinates?: CoordinateSnapshot;
  readonly parentId?: string;
  readonly relatedIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly provenance: {
    readonly sampleStatus: "curated-educational-sample";
    readonly retrievedOn: string;
    readonly transformations: readonly string[];
    readonly caveat: string;
  };
  readonly uncertaintySummary: string;
  readonly visual: {
    readonly colour: string;
    readonly glyph: string;
    readonly textureMode:
      "css-procedural" | "catalogue-point" | "diagrammatic" | "none";
  };
}

export interface CosmicScaleLayer {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly kicker: string;
  readonly range: {
    readonly minimumLog10Metres: number;
    readonly maximumLog10Metres: number;
    readonly display: string;
  };
  readonly referenceFrame: CosmicReferenceFrame;
  readonly coordinateStrategy: string;
  readonly representation: string;
  readonly featuredObjectIds: readonly string[];
}

export interface ExplorerLayer {
  readonly id: string;
  readonly label: string;
  readonly group:
    | "solar-system"
    | "stellar"
    | "deep-sky"
    | "galactic"
    | "cosmological"
    | "reference"
    | "education";
  readonly dataMode: "catalogue" | "procedural" | "mixed" | "model";
  readonly defaultVisible: boolean;
  readonly colour: string;
  readonly minimumScaleLayerId: string;
  readonly maximumScaleLayerId: string;
  readonly labelPolicy:
    "selected-only" | "priority" | "density-limited" | "none";
  readonly description: string;
}

export interface LearningArticle {
  readonly id: string;
  readonly title: string;
  readonly dek: string;
  readonly explanations: {
    readonly beginner: string;
    readonly student: string;
    readonly advanced: string;
  };
  readonly howWeKnow: string;
  readonly misconception: {
    readonly claim: string;
    readonly correction: string;
  };
  readonly uncertaintyNote: string;
  readonly explorerObjectIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly knowledgeCheck: KnowledgeCheck;
}

export interface KnowledgeCheck {
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctChoiceIndex: number;
  readonly explanation: string;
}

export interface GlossaryEntry {
  readonly term: string;
  readonly slug: string;
  readonly level: "beginner" | "student" | "advanced";
  readonly shortDefinition: string;
  readonly expandedDefinition: string;
  readonly relatedTerms: readonly string[];
}

export const catalogueNotice = {
  title: "A curated window, not a complete map",
  body: "This build ships a small, provenance-labelled educational reference sample. Catalogue-backed records are named and sourced; derived structures and conceptual models carry separate badges. Decorative background stars and dust are procedural, individually unlabelled, and can be switched off.",
  updatePolicy:
    "Live providers change. Values here are a dated snapshot chosen for interface demonstration, not a substitute for querying the cited archive or the primary literature.",
} as const;

export const dataSources: readonly EditorialDataSource[] = [
  {
    id: "nasa-solar-system",
    provider: "NASA Science / NASA Space Science Data Coordinated Archive",
    dataset: "Solar System exploration pages and planetary fact sheets",
    version: "Web edition",
    publicationOrSnapshotDate: "Snapshot 2026-07-29",
    accessMethod: "Curated manual extraction from official NASA pages",
    url: "https://science.nasa.gov/solar-system/",
    licence:
      "No blanket licence asserted for this hand-curated web reference; consult the notice attached to any upstream NASA data product before redistribution",
    attribution:
      "Source: NASA Science and NSSDCA; original source cited where shown",
    citation:
      "NASA Science, Solar System Exploration and referenced planetary fact sheets",
    citationUrl: "https://science.nasa.gov/solar-system/",
    updateStrategy:
      "Recheck each linked body page and its upstream fact sheet before changing a value; publish changes only in a newly dated Atlas content release",
    coordinateSystem:
      "No single coordinate table is redistributed; body positions are date-dependent and defer to an epoch-aware ephemeris",
    units: [
      "kilometres and astronomical units for distance and radius",
      "days for periods",
      "kelvin and body-relative mass units where stated",
    ],
    uncertaintyFields:
      "The curated pages do not expose a uniform uncertainty schema; variation and model dependence are retained as qualitative caveats",
    validationRules: [
      "Require finite values and explicit display units",
      "Reject a static position presented as a current ephemeris",
      "Label means, estimates, and inferred boundaries at the point of use",
    ],
    transformations: [
      "Converted selected values to consistent display units",
      "Rounded values for an educational interface",
      "Kept conceptual boundaries separate from measured bodies",
    ],
    knownLimitations: [
      "Mean planetary values suppress spatial and temporal variation",
      "Orbital elements are not an ephemeris and must not drive precision navigation",
      "The Oort Cloud extent is inferred rather than directly imaged",
    ],
  },
  {
    id: "jpl-horizons",
    provider: "NASA Jet Propulsion Laboratory",
    dataset: "JPL Horizons system",
    version: "Live service",
    publicationOrSnapshotDate: "Referenced 2026-07-29",
    accessMethod:
      "Identifiers and methodological reference; no bulk ephemeris bundled",
    url: "https://ssd.jpl.nasa.gov/horizons/",
    licence:
      "No blanket licence asserted; consult the Horizons documentation and notices attached to the requested product",
    attribution: "Ephemeris reference: NASA/JPL Horizons",
    citation: "NASA/JPL Solar System Dynamics, Horizons System",
    citationUrl: "https://ssd.jpl.nasa.gov/horizons/",
    updateStrategy:
      "Do not cache a state vector as timeless; any future import must pin target, centre, epoch, time scale, reference plane, output units, and retrieval date",
    coordinateSystem:
      "User-selected Horizons reference plane, origin, observer, epoch, and time scale; no state vectors are bundled in this release",
    units: [
      "request-selected position and velocity units",
      "NAIF numeric identifiers retained only as lookup keys",
    ],
    uncertaintyFields:
      "No Horizons result or covariance field is redistributed in this sample",
    validationRules: [
      "Require an explicit target identifier, centre, epoch, and reference plane for any future query",
      "Reject positions outside the documented validity interval of the selected solution",
      "Keep apparent, astrometric, and geometric quantities distinct",
    ],
    transformations: [
      "NAIF-style identifiers retained where useful",
      "No time-dependent state vectors redistributed in this sample",
    ],
    knownLimitations: [
      "Positions change with epoch and observer location",
      "This sample does not replace a Horizons query",
    ],
  },
  {
    id: "gaia-dr3",
    provider: "European Space Agency / Gaia DPAC",
    dataset: "Gaia Data Release 3",
    version: "Gaia DR3; documentation release 1.3",
    publicationOrSnapshotDate: "2023-07-10 documentation",
    accessMethod:
      "Curated cross-identification; no bulk Gaia table redistributed",
    url: "https://gea.esac.esa.int/archive/documentation/GDR3/",
    licence: "Open and free to use with credit to ESA/Gaia/DPAC",
    attribution:
      "This work has made use of data from the ESA mission Gaia, processed by the Gaia Data Processing and Analysis Consortium",
    citation:
      "Gaia Collaboration, Gaia mission paper and Gaia DR3 summary; follow the release-specific credit instructions",
    citationUrl:
      "https://gea.esac.esa.int/archive/documentation/GDR3/Miscellaneous/sec_credit_and_citation_instructions/",
    updateStrategy:
      "Pin a Gaia release and full source designation, retain the applied quality filters, and rebuild as a new immutable dataset version",
    coordinateSystem:
      "Gaia-CRF3/ICRS astrometry at reference epoch J2016.0 where a Gaia DR3 record is used; this editorial layer does not redistribute Gaia source rows",
    units: [
      "degrees for positions",
      "milliarcseconds for parallax",
      "milliarcseconds per Julian year for proper motion",
      "Gaia passband magnitudes",
    ],
    uncertaintyFields:
      "A future Gaia import must retain published errors and correlations; the current cross-identification layer uses qualitative caveats and rounded displays",
    validationRules: [
      "Require a release-qualified Gaia source designation before treating a row as a Gaia record",
      "Do not invert missing, negative, or low-signal parallax into an exact distance",
      "Apply documented quality and selection checks for the scientific use case",
    ],
    transformations: [
      "Distances displayed in light-years for general audiences",
      "Precision reduced to avoid implying more certainty than the sample supports",
    ],
    knownLimitations: [
      "Bright, binary, crowded, and high-proper-motion sources can require specialist quality filtering",
      "Simple inverse-parallax distances can be biased",
      "Gaia is a survey with a selection function, not a complete census of every star",
    ],
  },
  {
    id: "nasa-exoplanet-archive",
    provider: "NASA Exoplanet Science Institute, Caltech/IPAC",
    dataset: "Planetary Systems and Confirmed Planets tables",
    version: "Live archive snapshot",
    publicationOrSnapshotDate: "Snapshot 2026-07-29",
    accessMethod:
      "Curated educational subset from the documented archive tables",
    url: "https://exoplanetarchive.ipac.caltech.edu/",
    licence:
      "No blanket licence asserted; constituent datasets and literature retain their own terms and must be checked and cited",
    attribution:
      "This research has made use of the NASA Exoplanet Archive, operated by Caltech under contract with NASA",
    citation:
      "NASA Exoplanet Archive; Christiansen et al. (2025) and the literature reference for each selected parameter set",
    citationUrl:
      "https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html",
    updateStrategy:
      "Record the archive retrieval date and cited parameter-set reference; review changed confirmation status and solutions before each content release",
    coordinateSystem:
      "Host-system sky coordinates are archive fields; the curated planet exhibits use host-relative properties and do not bundle an astrometric solution",
    units: [
      "days for orbital period",
      "Earth or Jupiter units for radius and mass",
      "kelvin for equilibrium temperature where a source solution provides it",
      "parsecs in archive source tables and light-years in rounded Atlas displays",
    ],
    uncertaintyFields:
      "The archive can expose multiple asymmetric or literature-specific uncertainties; this sample preserves ranges or approximation labels rather than selecting false precision",
    validationRules: [
      "Require confirmed status for exhibits labelled confirmed",
      "Retain the literature reference associated with a selected parameter set",
      "Distinguish measured mass, minimum mass, and model-dependent mass",
    ],
    transformations: [
      "Selected representative confirmed planets by detection method",
      "Converted distances to light-years and periods to days",
      "Collapsed multiple published parameter sets into labelled approximate displays",
    ],
    knownLimitations: [
      "The archive is continuously updated and different publications can provide different parameter sets",
      "Masses can be minimum masses or model-dependent estimates",
      "Detection methods create strong selection effects",
    ],
  },
  {
    id: "openngc",
    provider: "OpenNGC contributors",
    dataset: "OpenNGC NGC/IC database",
    version: "v20231203 for the reproducible four-record sample",
    publicationOrSnapshotDate:
      "v20231203 release; editorial references reviewed 2026-07-29",
    accessMethod:
      "Pinned release-tag excerpt for the ETL sample; additional editorial identifiers link back to the declared catalogue",
    url: "https://github.com/mattiaverga/OpenNGC",
    licence: "CC BY-SA 4.0",
    attribution: "OpenNGC by Mattia Verga and contributors, CC BY-SA 4.0",
    citation: "Mattia Verga and OpenNGC contributors, OpenNGC v20231203",
    citationUrl: "https://github.com/mattiaverga/OpenNGC/tree/v20231203",
    updateStrategy:
      "Create a new immutable raw-version directory, update the checksum and source manifest, then rerun validation and tiling",
    coordinateSystem:
      "Source J2000 equatorial coordinates mapped operationally to ICRS at Julian epoch 2000.0 only to the published precision",
    units: [
      "sexagesimal right ascension and declination in source records",
      "decimal degrees in derived records",
      "V-band magnitude where present",
      "dimensionless heliocentric redshift where present",
    ],
    uncertaintyFields:
      "The selected OpenNGC columns have no coordinate or magnitude uncertainty values; uncertainty is unavailable, not zero",
    validationRules: [
      "Verify the pinned raw-file SHA-256 before transformation",
      "Require unique canonical identifiers and valid coordinate ranges",
      "Preserve source classification and reject malformed records",
    ],
    transformations: [
      "Object classes and identifiers normalised for the interface",
      "Coordinates displayed in sexagesimal notation",
      "Distances supplemented from cited literature rather than inferred from catalogue angular data",
    ],
    knownLimitations: [
      "OpenNGC merges several upstream databases with heterogeneous measurements",
      "Angular sizes and magnitudes can be wavelength-dependent",
      "Some common names are not formal catalogue identifiers",
    ],
  },
  {
    id: "simbad",
    provider: "Centre de Données astronomiques de Strasbourg",
    dataset: "SIMBAD astronomical database",
    version: "SIMBAD4 1.8",
    publicationOrSnapshotDate: "2026-07",
    accessMethod: "Identifier and basic-property cross-checks",
    url: "https://simbad.cds.unistra.fr/simbad/",
    licence: "Open Database License (ODbL)",
    attribution:
      "This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France",
    citation:
      "Wenger et al. (2000), The SIMBAD astronomical database, and the original literature linked from each object record",
    citationUrl: "https://simbad.cds.unistra.fr/simbad/",
    updateStrategy:
      "Recheck the live object record and its cited literature before revising editorial values; date every Atlas content snapshot",
    coordinateSystem:
      "Object-record coordinates are displayed as ICRS at J2000.0 where stated; individual measurements can use different epochs and frames",
    units: [
      "record-dependent astrometric, photometric, velocity, and physical units",
      "Atlas displays convert only explicitly identified values",
    ],
    uncertaintyFields:
      "Measurements are heterogeneous literature values; the Atlas retains available ranges or labels values approximate when a uniform error is unavailable",
    validationRules: [
      "Resolve the displayed identifier to a single SIMBAD object record",
      "Do not treat SIMBAD as a homogeneous survey catalogue",
      "Preserve the original literature context for precision use",
    ],
    transformations: [
      "Aliases deduplicated",
      "Selected heterogeneous measurements labelled as approximate",
    ],
    knownLimitations: [
      "SIMBAD is a literature meta-compilation, not a homogeneous survey catalogue",
      "Measurements come from different instruments, epochs, passbands, and publications",
      "The service is updated each working day",
    ],
  },
  {
    id: "eht-results",
    provider: "Event Horizon Telescope Collaboration",
    dataset: "M87* (2019) and Sagittarius A* (2022) result papers",
    version: "Published collaboration results",
    publicationOrSnapshotDate: "2019 / 2022",
    accessMethod:
      "Paraphrased educational summaries and cited numerical results",
    url: "https://eventhorizontelescope.org/science",
    licence:
      "Citation-only reference to published papers; no article text or image is redistributed",
    attribution: "Event Horizon Telescope Collaboration",
    citation:
      "Event Horizon Telescope Collaboration M87* (2019) and Sagittarius A* (2022) result-paper series",
    citationUrl: "https://eventhorizontelescope.org/science",
    updateStrategy:
      "Add a result only with its collaboration paper, publication year, object, and stated uncertainty; never replace papers silently",
    coordinateSystem:
      "Horizon-scale interferometric results use source-specific sky coordinates and angular scales; no visibility data or reconstructed image is bundled",
    units: [
      "angular scale in microarcseconds in the publications",
      "solar masses and distance units in paraphrased result context",
    ],
    uncertaintyFields:
      "Published collaboration intervals and modelling assumptions must be consulted in the cited papers; rounded Atlas values are not substitutes",
    validationRules: [
      "Link a numerical claim to the relevant collaboration result",
      "Distinguish measured interferometric signals, reconstructed emission, and physical inference",
      "Never describe the event horizon as a photographed material surface",
    ],
    transformations: [
      "Results paraphrased for three learning levels",
      "Angular-scale imaging described as an inference pipeline, not a literal photograph of an event horizon",
    ],
    knownLimitations: [
      "Images are interferometric reconstructions with calibration and modelling choices",
      "The bright ring is emission around the shadow region, not the event horizon surface",
    ],
  },
  {
    id: "planck-pr3",
    provider: "European Space Agency / Planck Collaboration",
    dataset: "Planck 2018 results / Public Data Release 3",
    version: "PR3",
    publicationOrSnapshotDate: "2018 results, final papers updated 2020",
    accessMethod: "Educational context only; no Planck maps bundled",
    url: "https://www.cosmos.esa.int/web/planck/publications",
    licence:
      "No blanket licence asserted in this sample; consult ESA terms and the notice for the specific Planck product, and cite the relevant paper",
    attribution: "ESA/Planck Collaboration",
    citation:
      "Planck Collaboration (2020), Planck 2018 results I: Overview and the cosmological legacy of Planck",
    citationUrl:
      "https://sci.esa.int/web/planck/-/60507-planck-collaboration-2018",
    updateStrategy:
      "Pin the specific Planck release and result paper for any imported parameter or product; rebuild the educational projection as a dated release",
    coordinateSystem:
      "All-sky products use documented celestial or Galactic coordinates; Atlas cosmological diagrams use an explicitly model-dependent comoving frame",
    units: [
      "dimensionless cosmological parameters",
      "kelvin or thermodynamic-temperature units for CMB products",
      "megaparsecs and billion years for rounded educational displays",
    ],
    uncertaintyFields:
      "Parameter intervals depend on the selected data combination and cosmological model; the Atlas does not bundle likelihood chains",
    validationRules: [
      "Name the fitted cosmological model for any parameter claim",
      "Keep lookback time, light-travel distance, and comoving distance distinct",
      "Do not present the surface of last scattering as a material edge of space",
    ],
    transformations: [
      "Cosmological parameters rounded",
      "Comoving distance and light-travel time explicitly distinguished",
    ],
    knownLimitations: [
      "Parameters depend on the fitted cosmological model",
      "The cosmic microwave background is a surface of last scattering, not an edge in space",
      "Foreground subtraction and instrument systematics enter the inference",
    ],
  },
  {
    id: "atlas-editorial",
    provider: "Annas M. Ishtiaq / Atlas of the Cosmos",
    dataset: "Editorial models, scale diagrams, and tour narration",
    version: "Sample content 1.0",
    publicationOrSnapshotDate: "2026-07-29",
    accessMethod: "Project-authored explanatory content",
    url: "/methodology",
    licence:
      "Copyright © 2026 Annas M. Ishtiaq. All rights reserved; repository terms apply",
    attribution: "Project-authored content by Annas M. Ishtiaq",
    citation: "Annas M. Ishtiaq, Atlas of the Cosmos methodology",
    citationUrl: "/methodology",
    updateStrategy:
      "Review source synthesis, evidence labels, and links as one versioned editorial change before release",
    coordinateSystem:
      "Multiple scale-local frames are declared in each exhibit; diagrammatic positions are not astrometric records",
    units: [
      "explicit display units defined by each educational datum",
      "dimensionless values only for named categorical or model quantities",
    ],
    uncertaintyFields:
      "Qualitative caveats, ranges, unknown states, and evidence labels are required when no defensible numerical uncertainty is available",
    validationRules: [
      "Require every fact and coordinate to reference a declared source ID",
      "Reject scientific identifiers on procedural context",
      "Require modelled and conceptual geometry to be labelled at the point of use",
    ],
    transformations: [
      "Source facts synthesised into plain-language explanations",
      "Non-observed geometry labelled conceptual or illustrative",
    ],
    knownLimitations: [
      "Diagrammatic spatial layouts are not precision astrometric solutions",
      "Procedural background objects must never receive scientific identifiers",
      "The catalogue sample is intentionally small and non-exhaustive",
    ],
  },
] as const;

export const cosmicScaleLayers: readonly CosmicScaleLayer[] = [
  {
    id: "planetary",
    order: 1,
    title: "Worlds",
    kicker: "Kilometres to millions of kilometres",
    range: {
      minimumLog10Metres: 3,
      maximumLog10Metres: 9,
      display: "1 km–1 million km",
    },
    referenceFrame: "object-local",
    coordinateStrategy:
      "Body-fixed local frames with camera-relative rendering",
    representation:
      "Terrain, atmosphere, limb light, and scale-aware orbit cues",
    featuredObjectIds: ["earth", "moon", "mars", "jupiter"],
  },
  {
    id: "solar-system",
    order: 2,
    title: "Solar System",
    kicker: "Astronomical units",
    range: {
      minimumLog10Metres: 9,
      maximumLog10Metres: 14,
      display: "0.01–1,000 au",
    },
    referenceFrame: "heliocentric-ecliptic",
    coordinateStrategy:
      "Hierarchical heliocentric frames; time-dependent ephemerides when available",
    representation: "Scaled bodies, orbit paths, belts as density fields",
    featuredObjectIds: ["sun", "earth", "jupiter", "pluto", "heliosphere"],
  },
  {
    id: "stellar-neighbourhood",
    order: 3,
    title: "Stellar Neighbourhood",
    kicker: "Light-years",
    range: {
      minimumLog10Metres: 14,
      maximumLog10Metres: 18,
      display: "0.01–100 light-years",
    },
    referenceFrame: "local-interstellar",
    coordinateStrategy:
      "Parsec-scale local origin rebased around the selected star",
    representation:
      "Catalogue point sprites with magnitude and temperature cues",
    featuredObjectIds: ["sun", "proxima-centauri", "sirius-a", "trappist-1e"],
  },
  {
    id: "stellar-evolution",
    order: 4,
    title: "Stars & Nebulae",
    kicker: "Hundreds to thousands of light-years",
    range: {
      minimumLog10Metres: 18,
      maximumLog10Metres: 20,
      display: "100–30,000 light-years",
    },
    referenceFrame: "galactocentric",
    coordinateStrategy: "Galactocentric tiles with object-local cutaways",
    representation:
      "Catalogue anchors plus clearly labelled volumetric approximations",
    featuredObjectIds: [
      "orion-nebula",
      "pleiades",
      "crab-nebula",
      "betelgeuse",
    ],
  },
  {
    id: "galactic",
    order: 5,
    title: "Milky Way",
    kicker: "Kiloparsecs",
    range: {
      minimumLog10Metres: 19,
      maximumLog10Metres: 22,
      display: "1–300 kiloparsecs",
    },
    referenceFrame: "galactocentric",
    coordinateStrategy:
      "Galactocentric floating origin with tiled density volumes",
    representation:
      "Observed star fields combined with an explicitly illustrative structural model",
    featuredObjectIds: [
      "milky-way",
      "sagittarius-a-star",
      "omega-centauri",
      "large-magellanic-cloud",
    ],
  },
  {
    id: "local-group",
    order: 6,
    title: "Local Group",
    kicker: "Megaparsec neighbourhood",
    range: {
      minimumLog10Metres: 21,
      maximumLog10Metres: 23,
      display: "0.1–10 megaparsecs",
    },
    referenceFrame: "local-group-barycentric",
    coordinateStrategy:
      "Group-local frames and distance-modulus-based placement",
    representation: "Galaxy sprites, halo extents, and uncertainty-aware depth",
    featuredObjectIds: [
      "milky-way",
      "andromeda-galaxy",
      "triangulum-galaxy",
      "local-group",
    ],
  },
  {
    id: "extragalactic",
    order: 7,
    title: "Clusters & Cosmic Web",
    kicker: "Tens to hundreds of megaparsecs",
    range: {
      minimumLog10Metres: 22,
      maximumLog10Metres: 25,
      display: "10–1,000 megaparsecs",
    },
    referenceFrame: "comoving-cosmological",
    coordinateStrategy:
      "Comoving coordinates under a declared cosmological model",
    representation:
      "Catalogue galaxies at close range; density fields and modelled filaments at distance",
    featuredObjectIds: [
      "virgo-cluster",
      "m87",
      "antennae-galaxies",
      "cosmic-web",
    ],
  },
  {
    id: "observable-universe",
    order: 8,
    title: "Observable Universe",
    kicker: "Cosmic lookback time",
    range: {
      minimumLog10Metres: 24,
      maximumLog10Metres: 27,
      display: "1–46.5 billion light-years comoving radius",
    },
    referenceFrame: "comoving-cosmological",
    coordinateStrategy:
      "Logarithmic radial scale; comoving distance kept distinct from lookback time",
    representation:
      "Statistical context, survey footprints, and CMB shell—not individual invented objects",
    featuredObjectIds: ["cosmic-web", "cmb-surface", "observable-universe"],
  },
] as const;

const layer = (
  id: string,
  label: string,
  group: ExplorerLayer["group"],
  dataMode: ExplorerLayer["dataMode"],
  defaultVisible: boolean,
  colour: string,
  minimumScaleLayerId: string,
  maximumScaleLayerId: string,
  labelPolicy: ExplorerLayer["labelPolicy"],
  description: string,
): ExplorerLayer => ({
  id,
  label,
  group,
  dataMode,
  defaultVisible,
  colour,
  minimumScaleLayerId,
  maximumScaleLayerId,
  labelPolicy,
  description,
});

export const explorerLayers: readonly ExplorerLayer[] = [
  layer(
    "planets",
    "Planets",
    "solar-system",
    "catalogue",
    true,
    "#7fc8ff",
    "planetary",
    "solar-system",
    "priority",
    "Recognised planets; positions require an epoch-aware ephemeris.",
  ),
  layer(
    "moons",
    "Moons",
    "solar-system",
    "catalogue",
    true,
    "#d8dde7",
    "planetary",
    "solar-system",
    "selected-only",
    "Named natural satellites in the loaded sample.",
  ),
  layer(
    "dwarf-planets",
    "Dwarf planets",
    "solar-system",
    "catalogue",
    true,
    "#c7a87a",
    "planetary",
    "solar-system",
    "priority",
    "IAU-recognised dwarf planets and selected candidates when explicitly labelled.",
  ),
  layer(
    "asteroids",
    "Asteroids",
    "solar-system",
    "mixed",
    false,
    "#d58d5f",
    "planetary",
    "solar-system",
    "density-limited",
    "Catalogue examples plus an unlabelled density field for belt context.",
  ),
  layer(
    "comets",
    "Comets",
    "solar-system",
    "catalogue",
    false,
    "#9edff4",
    "planetary",
    "solar-system",
    "selected-only",
    "Selected catalogued comets; tails are illustrative renderings.",
  ),
  layer(
    "spacecraft",
    "Spacecraft",
    "solar-system",
    "catalogue",
    false,
    "#f2d675",
    "planetary",
    "solar-system",
    "selected-only",
    "Selected missions with time-dependent trajectories when data are available.",
  ),
  layer(
    "nearby-stars",
    "Nearby stars",
    "stellar",
    "catalogue",
    true,
    "#fff2ce",
    "stellar-neighbourhood",
    "stellar-neighbourhood",
    "density-limited",
    "A Gaia-backed subset; not every star in the neighbourhood.",
  ),
  layer(
    "named-stars",
    "Named stars",
    "stellar",
    "catalogue",
    true,
    "#ffd19a",
    "stellar-neighbourhood",
    "galactic",
    "priority",
    "Stars with recognised common or catalogue names.",
  ),
  layer(
    "exoplanets",
    "Exoplanets",
    "stellar",
    "catalogue",
    true,
    "#72d8ca",
    "stellar-neighbourhood",
    "stellar-evolution",
    "selected-only",
    "A representative confirmed-planet sample from the NASA Exoplanet Archive.",
  ),
  layer(
    "constellation-lines",
    "Constellation lines",
    "reference",
    "model",
    false,
    "#7184b7",
    "stellar-neighbourhood",
    "stellar-evolution",
    "none",
    "Cultural line figures are conventions, not physical structures.",
  ),
  layer(
    "constellation-boundaries",
    "Constellation boundaries",
    "reference",
    "model",
    false,
    "#596b91",
    "stellar-neighbourhood",
    "stellar-evolution",
    "none",
    "IAU sky-region boundaries projected from Earth.",
  ),
  layer(
    "nebulae",
    "Nebulae",
    "deep-sky",
    "mixed",
    true,
    "#d26b9a",
    "stellar-evolution",
    "galactic",
    "priority",
    "Catalogue anchors with clearly illustrative gas volumes.",
  ),
  layer(
    "open-clusters",
    "Open clusters",
    "deep-sky",
    "catalogue",
    true,
    "#86b9ff",
    "stellar-evolution",
    "galactic",
    "priority",
    "Gravitationally related young-to-intermediate stellar groupings.",
  ),
  layer(
    "globular-clusters",
    "Globular clusters",
    "deep-sky",
    "catalogue",
    true,
    "#f1d29c",
    "stellar-evolution",
    "galactic",
    "priority",
    "Dense old clusters, many orbiting in the Galactic halo.",
  ),
  layer(
    "supernova-remnants",
    "Supernova remnants",
    "deep-sky",
    "mixed",
    true,
    "#ff7b69",
    "stellar-evolution",
    "galactic",
    "priority",
    "Catalogue positions with illustrative expanding-shell geometry.",
  ),
  layer(
    "pulsars",
    "Pulsars",
    "stellar",
    "catalogue",
    false,
    "#aa8cff",
    "stellar-evolution",
    "galactic",
    "selected-only",
    "Rotating neutron stars inferred through pulsed emission.",
  ),
  layer(
    "magnetars",
    "Magnetars",
    "stellar",
    "catalogue",
    false,
    "#bc70ff",
    "stellar-evolution",
    "galactic",
    "selected-only",
    "Neutron stars with exceptionally strong inferred magnetic fields.",
  ),
  layer(
    "stellar-black-holes",
    "Stellar black-hole candidates",
    "stellar",
    "catalogue",
    false,
    "#d4a8ff",
    "stellar-evolution",
    "galactic",
    "selected-only",
    "Compact-object systems classified from dynamical and high-energy evidence.",
  ),
  layer(
    "galactic-centre",
    "Galactic Centre",
    "galactic",
    "mixed",
    true,
    "#ffd75e",
    "galactic",
    "galactic",
    "priority",
    "Observed sources around Sagittarius A* over an illustrative central density field.",
  ),
  layer(
    "milky-way-structure",
    "Milky Way structure",
    "galactic",
    "model",
    true,
    "#5f8dc4",
    "galactic",
    "local-group",
    "none",
    "A synthesis of observations; far-side spiral structure is incompletely mapped.",
  ),
  layer(
    "satellite-galaxies",
    "Satellite galaxies",
    "galactic",
    "catalogue",
    true,
    "#70a8cf",
    "galactic",
    "local-group",
    "priority",
    "Selected gravitational companions of the Milky Way.",
  ),
  layer(
    "galaxies",
    "Galaxies",
    "deep-sky",
    "catalogue",
    true,
    "#89a6ff",
    "local-group",
    "extragalactic",
    "density-limited",
    "A small catalogue subset; distant background density is procedural.",
  ),
  layer(
    "galaxy-clusters",
    "Galaxy clusters",
    "cosmological",
    "catalogue",
    true,
    "#9e88ff",
    "extragalactic",
    "observable-universe",
    "priority",
    "Selected gravitationally bound galaxy systems.",
  ),
  layer(
    "cosmic-filaments",
    "Cosmic filaments",
    "cosmological",
    "model",
    true,
    "#6f61a8",
    "extragalactic",
    "observable-universe",
    "none",
    "Statistical reconstruction of large-scale structure, never individual fabricated galaxies.",
  ),
  layer(
    "cmb-context",
    "CMB context",
    "cosmological",
    "model",
    false,
    "#ef9f63",
    "observable-universe",
    "observable-universe",
    "none",
    "Diagrammatic surface of last scattering based on published cosmology.",
  ),
  layer(
    "coordinate-grids",
    "Coordinate grids",
    "reference",
    "model",
    false,
    "#63718f",
    "planetary",
    "observable-universe",
    "none",
    "Scale-appropriate grids with the active frame and epoch always shown.",
  ),
  layer(
    "orbital-paths",
    "Orbital paths",
    "reference",
    "model",
    true,
    "#5e7089",
    "planetary",
    "solar-system",
    "none",
    "Epoch-limited trajectories; not valid indefinitely.",
  ),
  layer(
    "habitable-zones",
    "Habitable-zone indicators",
    "education",
    "model",
    false,
    "#63c6a7",
    "solar-system",
    "stellar-neighbourhood",
    "none",
    "Model-dependent liquid-water energy zones, not labels of habitability or life.",
  ),
  layer(
    "uncertainty-overlays",
    "Catalogue uncertainty",
    "reference",
    "catalogue",
    false,
    "#ffb665",
    "planetary",
    "observable-universe",
    "none",
    "Error bars, intervals, and qualitative caveats supplied by each record.",
  ),
  layer(
    "procedural-background",
    "Procedural background",
    "reference",
    "procedural",
    true,
    "#8792aa",
    "stellar-neighbourhood",
    "observable-universe",
    "none",
    "Uncatalogued atmosphere, dust, and distant points used only for visual continuity.",
  ),
  layer(
    "educational-labels",
    "Educational labels",
    "education",
    "model",
    true,
    "#e9edf7",
    "planetary",
    "observable-universe",
    "priority",
    "Plain-language annotations and scale comparisons.",
  ),
  layer(
    "scientific-labels",
    "Scientific labels",
    "education",
    "catalogue",
    false,
    "#b9c7de",
    "planetary",
    "observable-universe",
    "density-limited",
    "Identifiers, coordinates, units, evidence status, and source badges.",
  ),
] as const;

const datum = (
  label: string,
  value: ScientificDisplayValue["value"],
  unit: DisplayUnit,
  display: string,
  status: EditorialEvidenceStatus,
  sourceId: string,
  uncertainty?: string,
  note?: string,
): ScientificDisplayValue => ({
  label,
  value,
  unit,
  display,
  status,
  sourceId,
  ...(uncertainty ? { uncertainty } : {}),
  ...(note ? { note } : {}),
});

const provenance = (
  transformations: readonly string[],
  caveat: string,
): CosmosExhibit["provenance"] => ({
  sampleStatus: "curated-educational-sample",
  retrievedOn: "2026-07-29",
  transformations,
  caveat,
});

export const cosmosCatalogue: readonly CosmosExhibit[] = [
  {
    id: "earth",
    slug: "earth",
    name: "Earth",
    scientificName: "Earth",
    aliases: ["Terra", "the Blue Planet"],
    objectType: "terrestrial planet",
    scaleLayerId: "planetary",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 399"],
    summary:
      "A rocky, ocean-bearing planet and the origin of every human astronomical measurement.",
    significance:
      "Earth is both a world to study and the moving reference point from which most sky coordinates begin.",
    distance: datum(
      "Mean distance from Sun",
      1,
      "au",
      "1.000 au",
      "derived",
      "nasa-solar-system",
      "Varies over an eccentric orbit",
    ),
    facts: [
      datum(
        "Mean radius",
        6371,
        "km",
        "6,371 km",
        "derived",
        "nasa-solar-system",
        "Oblate spheroid; local radius varies",
      ),
      datum(
        "Mass",
        1,
        "earth-mass",
        "1 Earth mass",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Sidereal orbital period",
        365.256,
        "day",
        "365.256 days",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mean surface temperature",
        288,
        "kelvin",
        "≈288 K",
        "estimated",
        "nasa-solar-system",
        "Strong spatial and seasonal variation",
      ),
    ],
    coordinates: {
      frame: "heliocentric-ecliptic",
      epoch: "date-dependent",
      sourceId: "jpl-horizons",
      note: "A time-specific ephemeris is required; no fixed display coordinate is scientifically meaningful.",
    },
    parentId: "solar-system",
    relatedIds: ["moon", "sun", "mars"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded mean physical properties", "No live ephemeris state bundled"],
      "The rendered globe and cloud field are illustrative; shape and orbital values are catalogue-backed.",
    ),
    uncertaintySummary:
      "Bulk properties are well constrained, but mean values hide topography, weather, and orbital variation.",
    visual: { colour: "#66b7e8", glyph: "◉", textureMode: "css-procedural" },
  },
  {
    id: "moon",
    slug: "moon",
    name: "The Moon",
    scientificName: "Earth I",
    aliases: ["Luna"],
    objectType: "natural satellite",
    scaleLayerId: "planetary",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 301"],
    summary:
      "Earth’s only natural satellite, with a cratered surface that preserves deep Solar System history.",
    significance:
      "Its orbit drives phases and tides, and its samples anchor the chronology of rocky worlds.",
    distance: datum(
      "Mean distance from Earth",
      384400,
      "km",
      "384,400 km",
      "derived",
      "nasa-solar-system",
      "Centre-to-centre distance varies",
    ),
    facts: [
      datum(
        "Mean radius",
        1737.4,
        "km",
        "1,737.4 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        0.0123,
        "earth-mass",
        "0.0123 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Sidereal orbital period",
        27.322,
        "day",
        "27.322 days",
        "derived",
        "nasa-solar-system",
      ),
    ],
    coordinates: {
      frame: "heliocentric-ecliptic",
      epoch: "date-dependent",
      sourceId: "jpl-horizons",
      note: "Topocentric apparent position also depends on the observer’s location on Earth.",
    },
    parentId: "earth",
    relatedIds: ["earth", "sun"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded mean values"],
      "Surface shading is illustrative; orbital position requires an ephemeris.",
    ),
    uncertaintySummary:
      "Mean dimensions are precise at this scale; apparent position and illumination are time-dependent.",
    visual: { colour: "#c9ccd1", glyph: "◐", textureMode: "css-procedural" },
  },
  {
    id: "sun",
    slug: "sun",
    name: "The Sun",
    scientificName: "Sol",
    aliases: ["Sol"],
    objectType: "G-type main-sequence star",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 10"],
    summary: "The star whose light and gravity dominate the Solar System.",
    significance:
      "The Sun is our nearest laboratory for stellar physics and the energy source for most life on Earth.",
    distance: datum(
      "Mean distance from Earth",
      1,
      "au",
      "1 au / 8.3 light-minutes",
      "derived",
      "nasa-solar-system",
      "Earth–Sun distance varies",
    ),
    facts: [
      datum(
        "Nominal radius",
        696340,
        "km",
        "≈696,340 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        1,
        "solar-mass",
        "1 solar mass",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Effective temperature",
        5772,
        "kelvin",
        "≈5,772 K",
        "derived",
        "nasa-solar-system",
        "Photospheric effective temperature",
      ),
      datum(
        "Age",
        4.57,
        "billion-year",
        "≈4.57 billion years",
        "estimated",
        "nasa-solar-system",
        "Model and meteoritic chronology",
      ),
    ],
    coordinates: {
      frame: "heliocentric-ecliptic",
      epoch: "date-dependent",
      sourceId: "nasa-solar-system",
      longitudeDeg: 0,
      latitudeDeg: 0,
      note: "The Sun is the origin of the heliocentric frame; apparent sky position is observer- and time-dependent.",
    },
    parentId: "milky-way",
    relatedIds: ["earth", "heliosphere", "proxima-centauri"],
    sourceIds: ["nasa-solar-system", "simbad"],
    provenance: provenance(
      ["Rounded recommended values"],
      "Granulation and corona are visual approximations, not a live solar observation.",
    ),
    uncertaintySummary:
      "Nominal values are conventional standards; the visible atmosphere is dynamic.",
    visual: { colour: "#ffd56b", glyph: "☉", textureMode: "css-procedural" },
  },
  {
    id: "mercury",
    slug: "mercury",
    name: "Mercury",
    aliases: [],
    objectType: "terrestrial planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 199"],
    summary: "The smallest planet and the closest to the Sun.",
    significance:
      "Mercury’s oversized core and extreme thermal environment test models of rocky-planet formation.",
    distance: datum(
      "Semimajor axis",
      0.387,
      "au",
      "0.387 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Mean radius",
        2439.7,
        "km",
        "2,439.7 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        0.0553,
        "earth-mass",
        "0.0553 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        87.969,
        "day",
        "87.97 days",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["sun", "venus", "earth"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Mean values rounded"],
      "The displayed orbit is a teaching cue, not a precision state vector.",
    ),
    uncertaintySummary:
      "Bulk values are well measured; temperature varies enormously across location and local time.",
    visual: { colour: "#a89f91", glyph: "●", textureMode: "css-procedural" },
  },
  {
    id: "venus",
    slug: "venus",
    name: "Venus",
    aliases: [],
    objectType: "terrestrial planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 299"],
    summary:
      "An Earth-sized world wrapped in a dense carbon-dioxide atmosphere and sulfuric-acid clouds.",
    significance:
      "Venus shows that similar planetary size does not guarantee a similar climate.",
    distance: datum(
      "Semimajor axis",
      0.723,
      "au",
      "0.723 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Mean radius",
        6051.8,
        "km",
        "6,051.8 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        0.815,
        "earth-mass",
        "0.815 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mean surface temperature",
        737,
        "kelvin",
        "≈737 K",
        "estimated",
        "nasa-solar-system",
        "Global mean",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["mercury", "earth", "mars"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Mean values rounded"],
      "Cloud texture is procedural and does not represent current weather.",
    ),
    uncertaintySummary:
      "Bulk properties are well constrained; deep-atmosphere circulation and surface activity remain active research topics.",
    visual: { colour: "#dfbd7f", glyph: "●", textureMode: "css-procedural" },
  },
  {
    id: "mars",
    slug: "mars",
    name: "Mars",
    aliases: ["the Red Planet"],
    objectType: "terrestrial planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 499"],
    summary:
      "A cold desert world with ancient river valleys, polar ice, and two small moons.",
    significance:
      "Mars preserves evidence that its early surface environment was wetter than today.",
    distance: datum(
      "Semimajor axis",
      1.524,
      "au",
      "1.524 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Mean radius",
        3389.5,
        "km",
        "3,389.5 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        0.107,
        "earth-mass",
        "0.107 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        686.98,
        "day",
        "686.98 days",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["earth", "ceres", "jupiter"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Mean values rounded"],
      "The global colour and dust are illustrative composites.",
    ),
    uncertaintySummary:
      "Orbital and bulk properties are precise; past climate and subsurface water inventories are inferred from multiple datasets.",
    visual: { colour: "#c96d4c", glyph: "●", textureMode: "css-procedural" },
  },
  {
    id: "ceres",
    slug: "ceres",
    name: "Ceres",
    aliases: ["1 Ceres"],
    objectType: "dwarf planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["1 Ceres", "NAIF 2000001"],
    summary:
      "The largest body in the main asteroid belt and the only dwarf planet inside Neptune’s orbit.",
    significance:
      "Ceres bridges rocky asteroids and ice-rich planetary bodies.",
    distance: datum(
      "Semimajor axis",
      2.77,
      "au",
      "≈2.77 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Mean radius",
        469.7,
        "km",
        "≈469.7 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        4.61,
        "year",
        "≈4.61 years",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["mars", "jupiter", "pluto"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded values"],
      "Asteroid-belt density around Ceres is procedural and unlabelled.",
    ),
    uncertaintySummary:
      "Mean physical and orbital properties are well constrained; subsurface composition is model-dependent.",
    visual: { colour: "#9b8f82", glyph: "◆", textureMode: "css-procedural" },
  },
  {
    id: "jupiter",
    slug: "jupiter",
    name: "Jupiter",
    aliases: [],
    objectType: "gas giant planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 599"],
    summary:
      "The Solar System’s largest planet, encircled by rings and a large family of moons.",
    significance:
      "Its mass reshapes small-body orbits and offers a nearby laboratory for giant-planet atmospheres.",
    distance: datum(
      "Semimajor axis",
      5.203,
      "au",
      "5.203 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Equatorial radius",
        71492,
        "km",
        "71,492 km",
        "derived",
        "nasa-solar-system",
        "Jupiter is visibly oblate",
      ),
      datum(
        "Mass",
        317.8,
        "earth-mass",
        "317.8 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        11.86,
        "year",
        "11.86 years",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["europa", "saturn", "ceres"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded reference values"],
      "Bands and storms are stylised and not a current observation.",
    ),
    uncertaintySummary:
      "Bulk properties are precise; cloud features and atmospheric depths are dynamic or model-dependent.",
    visual: { colour: "#d9b28b", glyph: "◉", textureMode: "css-procedural" },
  },
  {
    id: "europa",
    slug: "europa",
    name: "Europa",
    scientificName: "Jupiter II",
    aliases: [],
    objectType: "natural satellite",
    scaleLayerId: "planetary",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 502", "Jupiter II"],
    summary:
      "An ice-covered Jovian moon with strong evidence for a global subsurface ocean.",
    significance:
      "Europa is a prime target for studying potentially habitable environments beyond Earth.",
    distance: datum(
      "Mean orbital radius from Jupiter",
      671100,
      "km",
      "≈671,100 km",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Mean radius",
        1560.8,
        "km",
        "1,560.8 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        3.551,
        "day",
        "3.551 days",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "jupiter",
    relatedIds: ["jupiter", "earth", "titan"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded reference values"],
      "Ocean depth and composition are inferred, not directly sampled.",
    ),
    uncertaintySummary:
      "The ocean inference is strong, but its thickness, salinity, and seafloor conditions remain uncertain.",
    visual: { colour: "#d9c8a8", glyph: "◐", textureMode: "css-procedural" },
  },
  {
    id: "saturn",
    slug: "saturn",
    name: "Saturn",
    aliases: [],
    objectType: "gas giant planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 699"],
    summary:
      "A low-density gas giant surrounded by an intricate, evolving ring system.",
    significance:
      "Saturn’s rings make orbital dynamics visible, while its moons host diverse environments.",
    distance: datum(
      "Semimajor axis",
      9.58,
      "au",
      "≈9.58 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Equatorial radius",
        60268,
        "km",
        "60,268 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        95.16,
        "earth-mass",
        "95.16 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        29.45,
        "year",
        "29.45 years",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["jupiter", "titan", "uranus"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded reference values"],
      "Ring particle detail is a density-field illustration.",
    ),
    uncertaintySummary:
      "Bulk values are precise; ring age and long-term evolution remain debated.",
    visual: { colour: "#e6ca91", glyph: "◎", textureMode: "css-procedural" },
  },
  {
    id: "titan",
    slug: "titan",
    name: "Titan",
    scientificName: "Saturn VI",
    aliases: [],
    objectType: "natural satellite",
    scaleLayerId: "planetary",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 606", "Saturn VI"],
    summary:
      "Saturn’s largest moon, with a nitrogen atmosphere and lakes of liquid hydrocarbons.",
    significance:
      "Titan couples complex organic chemistry, weather, and surface liquids in a world colder than Earth.",
    distance: datum(
      "Mean orbital radius from Saturn",
      1221870,
      "km",
      "≈1.22 million km",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Mean radius",
        2574.7,
        "km",
        "2,574.7 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        15.945,
        "day",
        "15.945 days",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "saturn",
    relatedIds: ["saturn", "europa", "earth"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded values"],
      "Haze appearance is illustrative; surface visibility varies by wavelength.",
    ),
    uncertaintySummary:
      "Atmosphere and surface liquids are observed; subsurface ocean properties are inferred.",
    visual: { colour: "#d6a452", glyph: "◐", textureMode: "css-procedural" },
  },
  {
    id: "uranus",
    slug: "uranus",
    name: "Uranus",
    aliases: [],
    objectType: "ice giant planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 799"],
    summary: "An ice giant rotating with an extreme axial tilt.",
    significance:
      "Uranus tests models of volatile-rich giant planets and unusual seasonal forcing.",
    distance: datum(
      "Semimajor axis",
      19.2,
      "au",
      "≈19.2 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Equatorial radius",
        25559,
        "km",
        "25,559 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        14.54,
        "earth-mass",
        "14.54 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        84.02,
        "year",
        "84.02 years",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["saturn", "neptune"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded values"],
      "Atmosphere and ring system are simplified.",
    ),
    uncertaintySummary:
      "Bulk properties are measured; internal composition and heat transport are model-dependent.",
    visual: { colour: "#9dd7dc", glyph: "◉", textureMode: "css-procedural" },
  },
  {
    id: "neptune",
    slug: "neptune",
    name: "Neptune",
    aliases: [],
    objectType: "ice giant planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NAIF 899"],
    summary:
      "The outermost recognised planet, with a dynamic atmosphere and fast winds.",
    significance:
      "Neptune’s discovery from gravitational prediction was a landmark in celestial mechanics.",
    distance: datum(
      "Semimajor axis",
      30.05,
      "au",
      "≈30.05 au",
      "derived",
      "nasa-solar-system",
    ),
    facts: [
      datum(
        "Equatorial radius",
        24764,
        "km",
        "24,764 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Mass",
        17.15,
        "earth-mass",
        "17.15 Earth masses",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        164.8,
        "year",
        "≈164.8 years",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["uranus", "pluto", "kuiper-belt"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded values"],
      "Cloud patterns are illustrative rather than real-time.",
    ),
    uncertaintySummary:
      "Bulk and orbital properties are well constrained; deep interior structure is inferred.",
    visual: { colour: "#547be3", glyph: "◉", textureMode: "css-procedural" },
  },
  {
    id: "pluto",
    slug: "pluto",
    name: "Pluto",
    aliases: ["134340 Pluto"],
    objectType: "dwarf planet",
    scaleLayerId: "solar-system",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["134340 Pluto", "NAIF 999"],
    summary:
      "A geologically varied dwarf planet in the Kuiper Belt, orbited by Charon and smaller moons.",
    significance:
      "Pluto revealed that small, cold worlds can be unexpectedly active and complex.",
    distance: datum(
      "Semimajor axis",
      39.48,
      "au",
      "≈39.48 au",
      "derived",
      "nasa-solar-system",
      "Highly eccentric orbit",
    ),
    facts: [
      datum(
        "Mean radius",
        1188.3,
        "km",
        "1,188.3 km",
        "derived",
        "nasa-solar-system",
      ),
      datum(
        "Orbital period",
        247.94,
        "year",
        "≈247.94 years",
        "derived",
        "nasa-solar-system",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["neptune", "kuiper-belt", "ceres"],
    sourceIds: ["nasa-solar-system", "jpl-horizons"],
    provenance: provenance(
      ["Rounded values"],
      "Surface detail is a stylised educational treatment.",
    ),
    uncertaintySummary:
      "Dimensions and orbit are well measured; atmosphere and seasonal volatile transport change with time.",
    visual: { colour: "#bba58f", glyph: "◆", textureMode: "css-procedural" },
  },
  {
    id: "kuiper-belt",
    slug: "kuiper-belt",
    name: "Kuiper Belt",
    aliases: ["trans-Neptunian region"],
    objectType: "small-body population",
    scaleLayerId: "solar-system",
    recordKind: "derived-structure",
    evidenceStatus: "derived",
    catalogueIds: [],
    summary:
      "A broad population of icy bodies beyond Neptune, traced through many individually catalogued objects.",
    significance:
      "Its orbital families preserve evidence of giant-planet migration.",
    distance: datum(
      "Representative heliocentric span",
      [30, 50],
      "au",
      "roughly 30–50 au",
      "estimated",
      "nasa-solar-system",
      "No sharp outer edge",
    ),
    facts: [
      datum(
        "Representation",
        null,
        "dimensionless",
        "density field + selected catalogue objects",
        "modelled",
        "atlas-editorial",
        undefined,
        "Procedural points are never given identifiers",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["neptune", "pluto", "oort-cloud-model"],
    sourceIds: ["nasa-solar-system", "atlas-editorial"],
    provenance: provenance(
      ["Population shown statistically"],
      "The visible band is a model, not a literal map of every body.",
    ),
    uncertaintySummary:
      "Population size and distant boundary depend on survey sensitivity and classification choices.",
    visual: { colour: "#7c91a8", glyph: "⋯", textureMode: "diagrammatic" },
  },
  {
    id: "heliosphere",
    slug: "heliosphere",
    name: "Heliosphere",
    aliases: [],
    objectType: "stellar-wind bubble",
    scaleLayerId: "solar-system",
    recordKind: "derived-structure",
    evidenceStatus: "modelled",
    catalogueIds: [],
    summary:
      "The vast region where the solar wind interacts with the local interstellar medium.",
    significance:
      "It is a changing boundary between our star’s plasma environment and interstellar space.",
    distance: datum(
      "Voyager 1 heliopause crossing",
      121.6,
      "au",
      "≈121.6 au from the Sun",
      "observed",
      "nasa-solar-system",
      "One direction and one epoch",
    ),
    facts: [
      datum(
        "Global shape",
        null,
        "dimensionless",
        "asymmetric and time-variable",
        "modelled",
        "nasa-solar-system",
        undefined,
        "Not a rigid shell",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["sun", "kuiper-belt", "oort-cloud-model"],
    sourceIds: ["nasa-solar-system", "atlas-editorial"],
    provenance: provenance(
      [
        "Crossing distance used as one anchor",
        "Global outline drawn diagrammatically",
      ],
      "The boundary is not spherical and the displayed shape is illustrative.",
    ),
    uncertaintySummary:
      "Spacecraft crossings are direct; the three-dimensional global shape is inferred from sparse measurements and models.",
    visual: { colour: "#5cb2d8", glyph: "◌", textureMode: "diagrammatic" },
  },
  {
    id: "oort-cloud-model",
    slug: "oort-cloud",
    name: "Oort Cloud",
    aliases: [],
    objectType: "hypothesised comet reservoir",
    scaleLayerId: "solar-system",
    recordKind: "conceptual-model",
    evidenceStatus: "conceptual",
    catalogueIds: [],
    summary:
      "A hypothesised, distant reservoir invoked to explain long-period comet orbits.",
    significance:
      "It marks the conceptual gravitational outskirts of the Solar System, not an imaged shell.",
    distance: datum(
      "Modelled extent",
      [2000, 100000],
      "au",
      "possibly ~2,000–100,000 au",
      "modelled",
      "nasa-solar-system",
      "Order-of-magnitude range",
    ),
    facts: [
      datum(
        "Directly imaged",
        null,
        "dimensionless",
        "No",
        "observed",
        "nasa-solar-system",
        undefined,
        "Evidence is indirect",
      ),
    ],
    parentId: "solar-system",
    relatedIds: ["kuiper-belt", "heliosphere", "proxima-centauri"],
    sourceIds: ["nasa-solar-system", "atlas-editorial"],
    provenance: provenance(
      [
        "Extent encoded as a broad range",
        "Rendered as a sparse conceptual shell",
      ],
      "Do not interpret individual points as observed comets.",
    ),
    uncertaintySummary:
      "Existence and scale are inferred from comet dynamics; membership and detailed structure are not directly catalogued.",
    visual: { colour: "#52697f", glyph: "◌", textureMode: "diagrammatic" },
  },
  {
    id: "solar-system",
    slug: "solar-system",
    name: "Solar System",
    aliases: ["Sol system"],
    objectType: "planetary system",
    scaleLayerId: "solar-system",
    recordKind: "derived-structure",
    evidenceStatus: "derived",
    catalogueIds: [],
    summary:
      "The Sun, its planets and small bodies, and the plasma and gravitational environment they inhabit.",
    significance:
      "It is the only planetary system currently explored in situ by spacecraft.",
    distance: datum(
      "Reference origin",
      0,
      "au",
      "Sun-centred",
      "conceptual",
      "atlas-editorial",
    ),
    facts: [
      datum(
        "Known planets",
        8,
        "dimensionless",
        "8 recognised planets",
        "observed",
        "nasa-solar-system",
      ),
      datum(
        "Outer conceptual context",
        [2000, 100000],
        "au",
        "Oort Cloud model: ~2,000–100,000 au",
        "modelled",
        "nasa-solar-system",
      ),
    ],
    parentId: "milky-way",
    relatedIds: ["sun", "earth", "heliosphere", "kuiper-belt"],
    sourceIds: ["nasa-solar-system", "jpl-horizons", "atlas-editorial"],
    provenance: provenance(
      ["Bodies grouped by gravitational hierarchy"],
      "Boundaries depend on whether one means planets, heliosphere, or long-period comet reservoir.",
    ),
    uncertaintySummary:
      "Major bodies are well inventoried; small-body populations and the distant outer reservoir are incomplete.",
    visual: { colour: "#e6c46e", glyph: "⊙", textureMode: "diagrammatic" },
  },
  {
    id: "proxima-centauri",
    slug: "proxima-centauri",
    name: "Proxima Centauri",
    scientificName: "Alpha Centauri C",
    aliases: ["HIP 70890", "GJ 551"],
    objectType: "M-type red dwarf star",
    scaleLayerId: "stellar-neighbourhood",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["HIP 70890", "GJ 551"],
    summary:
      "The nearest known star to the Sun, a faint red dwarf in the Alpha Centauri system.",
    significance:
      "Its proximity makes it a benchmark for stellar astrometry and nearby exoplanet studies.",
    distance: datum(
      "Distance from Sun",
      4.2465,
      "light-year",
      "≈4.2465 light-years",
      "derived",
      "gaia-dr3",
      "Parallax-based distance",
    ),
    facts: [
      datum(
        "Mass",
        0.122,
        "solar-mass",
        "≈0.122 solar masses",
        "estimated",
        "simbad",
        "Literature synthesis",
      ),
      datum(
        "Effective temperature",
        3000,
        "kelvin",
        "≈3,000 K",
        "estimated",
        "simbad",
        "Model-dependent",
      ),
      datum(
        "Apparent visual magnitude",
        11.13,
        "apparent-magnitude",
        "V ≈ 11.13",
        "observed",
        "simbad",
        "Passband-specific",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "14h 29m 42.9s",
      declination: "−62° 40′ 46″",
      note: "High proper motion means displayed coordinates require epoch propagation for precision use.",
    },
    parentId: "milky-way",
    relatedIds: ["sun", "trappist-1e", "sirius-a"],
    sourceIds: ["gaia-dr3", "simbad"],
    provenance: provenance(
      ["Distance rounded", "Astrophysical parameters labelled approximate"],
      "The star colour is temperature-inspired, not a calibrated visual observation.",
    ),
    uncertaintySummary:
      "Distance is tightly constrained; mass and temperature depend on stellar models and adopted literature values.",
    visual: { colour: "#e8896f", glyph: "✦", textureMode: "catalogue-point" },
  },
  {
    id: "sirius-a",
    slug: "sirius-a",
    name: "Sirius A",
    scientificName: "Alpha Canis Majoris A",
    aliases: ["HIP 32349", "Dog Star"],
    objectType: "A-type main-sequence star",
    scaleLayerId: "stellar-neighbourhood",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["HIP 32349", "Alpha CMa A"],
    summary:
      "The brightest star in Earth’s night sky and the primary of a nearby binary.",
    significance:
      "Its white-dwarf companion lets astronomers test stellar evolution and dynamical mass estimates.",
    distance: datum(
      "Distance from Sun",
      8.6,
      "light-year",
      "≈8.60 light-years",
      "derived",
      "gaia-dr3",
      "Parallax-based",
    ),
    facts: [
      datum(
        "Apparent visual magnitude",
        -1.46,
        "apparent-magnitude",
        "V ≈ −1.46",
        "observed",
        "simbad",
      ),
      datum(
        "Mass",
        2.06,
        "solar-mass",
        "≈2.06 solar masses",
        "estimated",
        "simbad",
      ),
      datum(
        "Effective temperature",
        9900,
        "kelvin",
        "≈9,900 K",
        "estimated",
        "simbad",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "06h 45m 08.9s",
      declination: "−16° 42′ 58″",
      note: "Binary orbital motion and proper motion matter for precision astrometry.",
    },
    parentId: "milky-way",
    relatedIds: ["sirius-b", "sun", "proxima-centauri"],
    sourceIds: ["gaia-dr3", "simbad"],
    provenance: provenance(
      ["Representative literature values rounded"],
      "Brightness is rendered relative, not photometrically calibrated on every display.",
    ),
    uncertaintySummary:
      "Distance and brightness are well constrained; model-derived temperature and mass vary slightly by analysis.",
    visual: { colour: "#dbe8ff", glyph: "✦", textureMode: "catalogue-point" },
  },
  {
    id: "sirius-b",
    slug: "sirius-b",
    name: "Sirius B",
    scientificName: "Alpha Canis Majoris B",
    aliases: ["the Pup"],
    objectType: "white dwarf star",
    scaleLayerId: "stellar-neighbourhood",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["Alpha CMa B"],
    summary:
      "A stellar remnant with roughly a solar mass compressed into an Earth-sized body.",
    significance:
      "Sirius B provided early evidence for the extraordinary density of white dwarfs.",
    distance: datum(
      "Distance from Sun",
      8.6,
      "light-year",
      "≈8.60 light-years",
      "derived",
      "gaia-dr3",
      "Shared binary-system distance",
    ),
    facts: [
      datum(
        "Mass",
        1.02,
        "solar-mass",
        "≈1.02 solar masses",
        "derived",
        "simbad",
        "Dynamical model",
      ),
      datum(
        "Radius",
        0.0084,
        "solar-radius",
        "≈0.0084 solar radii",
        "estimated",
        "simbad",
        "Model and flux fit",
      ),
      datum(
        "Effective temperature",
        25000,
        "kelvin",
        "≈25,000 K",
        "estimated",
        "simbad",
      ),
    ],
    parentId: "sirius-a",
    relatedIds: ["sirius-a", "ring-nebula", "sun"],
    sourceIds: ["gaia-dr3", "simbad"],
    provenance: provenance(
      ["Representative parameters rounded"],
      "Size comparison is true-scale only when the interface explicitly says so.",
    ),
    uncertaintySummary:
      "Dynamical mass is strong; atmosphere models enter the radius and temperature estimates.",
    visual: { colour: "#ecf3ff", glyph: "·", textureMode: "catalogue-point" },
  },
  {
    id: "betelgeuse",
    slug: "betelgeuse",
    name: "Betelgeuse",
    scientificName: "Alpha Orionis",
    aliases: ["HIP 27989"],
    objectType: "red supergiant star",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["HIP 27989", "Alpha Ori"],
    summary:
      "A nearby red supergiant whose pulsation, surface structure, and surrounding dust complicate simple measurements.",
    significance:
      "It illustrates both late-stage massive-star evolution and the honest limits of stellar distances and radii.",
    distance: datum(
      "Distance from Sun",
      [500, 700],
      "light-year",
      "roughly 500–700 light-years",
      "estimated",
      "simbad",
      "Published estimates differ",
    ),
    facts: [
      datum(
        "Effective temperature",
        3600,
        "kelvin",
        "≈3,600 K",
        "estimated",
        "simbad",
        "Varies with method and epoch",
      ),
      datum(
        "Radius",
        [700, 1000],
        "solar-radius",
        "roughly 700–1,000 solar radii",
        "estimated",
        "simbad",
        "Atmosphere has no sharp edge",
      ),
      datum(
        "Future supernova timing",
        null,
        "year",
        "Unknown",
        "unknown",
        "atlas-editorial",
        undefined,
        "Could remain a supergiant far longer than a human lifetime",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "05h 55m 10.3s",
      declination: "+07° 24′ 25″",
      note: "Coordinate precision exceeds the distance precision; the extended photosphere is variable.",
    },
    parentId: "milky-way",
    relatedIds: ["orion-nebula", "eta-carinae", "crab-nebula"],
    sourceIds: ["simbad", "gaia-dr3", "atlas-editorial"],
    provenance: provenance(
      ["Distance and radius represented as ranges"],
      "No countdown to a supernova is scientifically justified.",
    ),
    uncertaintySummary:
      "Distance, radius, and surface temperature are unusually difficult because the star is bright, extended, variable, and dusty.",
    visual: { colour: "#ed7258", glyph: "✹", textureMode: "catalogue-point" },
  },
  {
    id: "trappist-1e",
    slug: "trappist-1-e",
    name: "TRAPPIST-1 e",
    aliases: ["2MASS J23062928−0502285 e"],
    objectType: "confirmed terrestrial exoplanet",
    scaleLayerId: "stellar-neighbourhood",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["TRAPPIST-1 e"],
    summary:
      "A roughly Earth-sized planet in a compact seven-planet system around an ultracool dwarf.",
    significance:
      "Repeated transits let astronomers compare several small planets formed around the same star.",
    distance: datum(
      "System distance from Sun",
      40.7,
      "light-year",
      "≈40.7 light-years",
      "derived",
      "nasa-exoplanet-archive",
      "Host-star distance",
    ),
    facts: [
      datum(
        "Orbital period",
        6.1,
        "day",
        "≈6.10 days",
        "derived",
        "nasa-exoplanet-archive",
      ),
      datum(
        "Radius",
        0.92,
        "earth-radius",
        "≈0.92 Earth radii",
        "derived",
        "nasa-exoplanet-archive",
        "Transit-model dependent",
      ),
      datum(
        "Discovery method",
        null,
        "dimensionless",
        "Transit",
        "observed",
        "nasa-exoplanet-archive",
      ),
    ],
    parentId: "milky-way",
    relatedIds: ["proxima-centauri", "51-pegasi-b", "hr-8799-e"],
    sourceIds: ["nasa-exoplanet-archive"],
    provenance: provenance(
      ["Representative archive solution rounded"],
      "Any surface depiction is an illustration; no resolved image exists.",
    ),
    uncertaintySummary:
      "Radius and orbit are constrained from transits; atmosphere, surface conditions, and habitability remain unknown.",
    visual: { colour: "#5fc7ad", glyph: "●", textureMode: "diagrammatic" },
  },
  {
    id: "51-pegasi-b",
    slug: "51-pegasi-b",
    name: "51 Pegasi b",
    aliases: ["Dimidium"],
    objectType: "confirmed giant exoplanet",
    scaleLayerId: "stellar-neighbourhood",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["51 Peg b"],
    summary:
      "The first exoplanet found around a Sun-like star by the radial-velocity method.",
    significance:
      "Its short orbit overturned expectations that giant planets must resemble Jupiter’s wide orbit.",
    distance: datum(
      "System distance from Sun",
      50.5,
      "light-year",
      "≈50.5 light-years",
      "derived",
      "nasa-exoplanet-archive",
    ),
    facts: [
      datum(
        "Orbital period",
        4.231,
        "day",
        "≈4.23 days",
        "derived",
        "nasa-exoplanet-archive",
      ),
      datum(
        "Minimum mass",
        0.46,
        "jupiter-mass",
        "≈0.46 Jupiter masses (m sin i)",
        "derived",
        "nasa-exoplanet-archive",
        "Radial velocity gives a minimum without inclination",
      ),
      datum(
        "Discovery method",
        null,
        "dimensionless",
        "Radial velocity",
        "observed",
        "nasa-exoplanet-archive",
      ),
    ],
    parentId: "milky-way",
    relatedIds: ["trappist-1e", "hr-8799-e", "ogle-2016-blg-1195-lb"],
    sourceIds: ["nasa-exoplanet-archive"],
    provenance: provenance(
      ["Default archive solution simplified"],
      "Planet size and appearance are not directly resolved.",
    ),
    uncertaintySummary:
      "The orbit is well characterised; quoted mass depends on orbital inclination and the adopted stellar mass.",
    visual: { colour: "#d89e65", glyph: "●", textureMode: "diagrammatic" },
  },
  {
    id: "hr-8799-e",
    slug: "hr-8799-e",
    name: "HR 8799 e",
    aliases: [],
    objectType: "directly imaged giant exoplanet",
    scaleLayerId: "stellar-neighbourhood",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["HR 8799 e"],
    summary: "One of four young giant planets directly imaged around HR 8799.",
    significance:
      "It shows what direct imaging can reveal—and how heavily mass estimates depend on cooling models and age.",
    distance: datum(
      "System distance from Sun",
      133,
      "light-year",
      "≈133 light-years",
      "derived",
      "nasa-exoplanet-archive",
    ),
    facts: [
      datum(
        "Approximate separation",
        16,
        "au",
        "≈16 au",
        "derived",
        "nasa-exoplanet-archive",
        "Orbit-fit dependent",
      ),
      datum(
        "Estimated mass",
        [7, 10],
        "jupiter-mass",
        "roughly 7–10 Jupiter masses",
        "estimated",
        "nasa-exoplanet-archive",
        "Evolutionary-model dependent",
      ),
      datum(
        "Discovery method",
        null,
        "dimensionless",
        "Direct imaging",
        "observed",
        "nasa-exoplanet-archive",
      ),
    ],
    parentId: "milky-way",
    relatedIds: ["51-pegasi-b", "trappist-1e", "ogle-2016-blg-1195-lb"],
    sourceIds: ["nasa-exoplanet-archive"],
    provenance: provenance(
      ["Archive and literature ranges rounded"],
      "Displayed colour is illustrative and not a true-colour resolved globe.",
    ),
    uncertaintySummary:
      "The planet is detected in images, but mass and atmosphere depend on system age and evolutionary models.",
    visual: { colour: "#d16c4d", glyph: "●", textureMode: "diagrammatic" },
  },
  {
    id: "ogle-2016-blg-1195-lb",
    slug: "ogle-2016-blg-1195-lb",
    name: "OGLE-2016-BLG-1195 Lb",
    aliases: [],
    objectType: "confirmed microlensing exoplanet",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["OGLE-2016-BLG-1195 L b"],
    summary:
      "A low-mass planet detected when its system briefly magnified a more distant background star.",
    significance:
      "Microlensing can reveal cold planets far from the Sun that other methods seldom reach.",
    distance: datum(
      "Lens-system distance",
      null,
      "light-year",
      "Distance is model-dependent",
      "estimated",
      "nasa-exoplanet-archive",
      "Microlensing geometry can have degeneracies",
    ),
    facts: [
      datum(
        "Discovery method",
        null,
        "dimensionless",
        "Gravitational microlensing",
        "observed",
        "nasa-exoplanet-archive",
      ),
      datum(
        "Repeat observation",
        null,
        "dimensionless",
        "Usually not repeatable",
        "derived",
        "atlas-editorial",
        undefined,
        "The alignment is transient",
      ),
    ],
    parentId: "milky-way",
    relatedIds: ["hr-8799-e", "51-pegasi-b", "trappist-1e"],
    sourceIds: ["nasa-exoplanet-archive", "atlas-editorial"],
    provenance: provenance(
      ["Used as a method example; uncertain values intentionally omitted"],
      "No literal planet image or stable sky marker is implied.",
    ),
    uncertaintySummary:
      "Microlensing parameters depend on lens geometry, source distance, and model degeneracies; missing values are not filled in.",
    visual: { colour: "#b279df", glyph: "◌", textureMode: "diagrammatic" },
  },
  {
    id: "orion-molecular-cloud",
    slug: "orion-molecular-cloud",
    name: "Orion Molecular Cloud Complex",
    aliases: ["Orion A and Orion B"],
    objectType: "molecular cloud complex",
    scaleLayerId: "stellar-evolution",
    recordKind: "derived-structure",
    evidenceStatus: "derived",
    catalogueIds: [],
    summary:
      "A nearby complex of cold gas, dust, young stars, and active star-forming regions.",
    significance:
      "It connects diffuse molecular material, collapsing cores, protostars, and exposed young clusters.",
    distance: datum(
      "Representative distance",
      [1250, 1450],
      "light-year",
      "roughly 1,250–1,450 light-years",
      "estimated",
      "simbad",
      "Different subregions lie at different distances",
    ),
    facts: [
      datum(
        "Geometry",
        null,
        "dimensionless",
        "three-dimensional and filamentary",
        "modelled",
        "atlas-editorial",
      ),
    ],
    parentId: "milky-way",
    relatedIds: ["orion-nebula", "betelgeuse", "pleiades"],
    sourceIds: ["simbad", "atlas-editorial"],
    provenance: provenance(
      [
        "Subregions grouped for teaching",
        "Volume is an illustrative reconstruction",
      ],
      "The cloud is not one sharply bounded catalogue object.",
    ),
    uncertaintySummary:
      "Distances and boundaries vary across the complex; hidden structure depends on wavelength and tracer.",
    visual: { colour: "#b35a8b", glyph: "☁", textureMode: "diagrammatic" },
  },
  {
    id: "orion-nebula",
    slug: "orion-nebula",
    name: "Orion Nebula",
    scientificName: "Messier 42",
    aliases: ["M42", "NGC 1976"],
    objectType: "H II region and stellar nursery",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 42", "NGC 1976"],
    summary:
      "A luminous nearby star-forming region where young massive stars ionise surrounding gas.",
    significance:
      "Its proximity allows unusually detailed study of discs, jets, and newborn stellar populations.",
    distance: datum(
      "Distance from Sun",
      1340,
      "light-year",
      "≈1,340 light-years",
      "estimated",
      "simbad",
      "Substructures span a range",
    ),
    facts: [
      datum(
        "Apparent visual magnitude",
        4,
        "apparent-magnitude",
        "V ≈ 4",
        "observed",
        "openngc",
        "Extended-object magnitude is aperture-dependent",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "05h 35m 17.3s",
      declination: "−05° 23′ 28″",
      note: "Coordinate is a representative centre for an extended region.",
    },
    parentId: "orion-molecular-cloud",
    relatedIds: ["orion-molecular-cloud", "pleiades", "betelgeuse"],
    sourceIds: ["openngc", "simbad"],
    provenance: provenance(
      ["Identifier and coordinate normalised", "Distance rounded"],
      "Nebular volume and colour are wavelength-inspired approximations.",
    ),
    uncertaintySummary:
      "The object is observed across many wavelengths; its three-dimensional shape and exact boundary are model-dependent.",
    visual: { colour: "#c75b99", glyph: "✧", textureMode: "diagrammatic" },
  },
  {
    id: "pleiades",
    slug: "pleiades",
    name: "Pleiades",
    scientificName: "Messier 45",
    aliases: ["M45", "Seven Sisters"],
    objectType: "open star cluster",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 45"],
    summary:
      "A nearby young open cluster whose bright blue stars illuminate passing dust.",
    significance:
      "Shared age and composition make cluster stars powerful tests of stellar evolution.",
    distance: datum(
      "Distance from Sun",
      444,
      "light-year",
      "≈444 light-years",
      "derived",
      "gaia-dr3",
      "Cluster-depth and membership dependent",
    ),
    facts: [
      datum(
        "Age",
        0.125,
        "billion-year",
        "≈125 million years",
        "estimated",
        "simbad",
        "Model-dependent cluster age",
      ),
      datum(
        "Apparent visual magnitude",
        1.6,
        "apparent-magnitude",
        "V ≈ 1.6",
        "observed",
        "openngc",
        "Integrated value",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "03h 47m 24s",
      declination: "+24° 07′",
      note: "Representative cluster centre; members occupy a volume and share related motion.",
    },
    parentId: "milky-way",
    relatedIds: ["orion-nebula", "orion-molecular-cloud", "omega-centauri"],
    sourceIds: ["gaia-dr3", "openngc", "simbad"],
    provenance: provenance(
      ["Cluster distance and age rounded"],
      "Dust glow is illustrative; not every rendered point is a member.",
    ),
    uncertaintySummary:
      "Membership, distance, and age depend on selection and stellar models; bright core stars are securely identified.",
    visual: { colour: "#9fc7ff", glyph: "⁙", textureMode: "catalogue-point" },
  },
  {
    id: "ring-nebula",
    slug: "ring-nebula",
    name: "Ring Nebula",
    scientificName: "Messier 57",
    aliases: ["M57", "NGC 6720"],
    objectType: "planetary nebula",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 57", "NGC 6720"],
    summary:
      "Glowing gas expelled by a dying low-to-intermediate-mass star, seen around its hot remnant.",
    significance:
      "It shows that a planetary nebula is a phase of stellar death, unrelated to planet formation.",
    distance: datum(
      "Distance from Sun",
      [2000, 2600],
      "light-year",
      "roughly 2,000–2,600 light-years",
      "estimated",
      "simbad",
      "Published estimates differ",
    ),
    facts: [
      datum(
        "Physical interpretation",
        null,
        "dimensionless",
        "ionised ejected envelope",
        "derived",
        "simbad",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "18h 53m 35s",
      declination: "+33° 01′ 45″",
      note: "Representative central coordinate for an extended nebula.",
    },
    parentId: "milky-way",
    relatedIds: ["sirius-b", "orion-nebula", "crab-nebula"],
    sourceIds: ["openngc", "simbad"],
    provenance: provenance(
      ["Distance shown as a range", "Morphology simplified"],
      "The familiar ring is a projection of a three-dimensional structure.",
    ),
    uncertaintySummary:
      "Angular structure is observed; distance and full 3D geometry remain less certain.",
    visual: { colour: "#58c59a", glyph: "◌", textureMode: "diagrammatic" },
  },
  {
    id: "eta-carinae",
    slug: "eta-carinae",
    name: "Eta Carinae",
    aliases: ["HIP 52419"],
    objectType: "massive luminous binary system",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["Eta Car", "HIP 52419"],
    summary:
      "An unstable, very massive binary surrounded by ejecta from nineteenth-century eruptions.",
    significance:
      "It demonstrates that massive stars can lose enormous amounts of mass before core collapse.",
    distance: datum(
      "Distance from Sun",
      7500,
      "light-year",
      "≈7,500 light-years",
      "estimated",
      "simbad",
      "Cluster and nebular context",
    ),
    facts: [
      datum(
        "System nature",
        null,
        "dimensionless",
        "massive binary",
        "derived",
        "simbad",
      ),
      datum(
        "Future outcome",
        null,
        "year",
        "Timing unknown",
        "unknown",
        "atlas-editorial",
        undefined,
        "A supernova is expected eventually, not predictably soon",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "10h 45m 03.6s",
      declination: "−59° 41′ 04″",
      note: "The source is embedded in bright, structured nebulosity.",
    },
    parentId: "milky-way",
    relatedIds: ["betelgeuse", "crab-nebula", "cygnus-x1"],
    sourceIds: ["simbad", "atlas-editorial"],
    provenance: provenance(
      ["Representative distance rounded"],
      "Nebular lobes and stellar components are not shown at one literal scale.",
    ),
    uncertaintySummary:
      "The binary and eruptions are observed; component masses, wind interactions, and future timing are model-dependent.",
    visual: { colour: "#ffc15b", glyph: "✹", textureMode: "diagrammatic" },
  },
  {
    id: "crab-nebula",
    slug: "crab-nebula",
    name: "Crab Nebula",
    scientificName: "Messier 1",
    aliases: ["M1", "NGC 1952"],
    objectType: "supernova remnant",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 1", "NGC 1952"],
    summary:
      "An expanding supernova remnant powered from within by a rapidly rotating neutron star.",
    significance:
      "Its association with the guest star recorded in 1054 links historical observation to modern high-energy astrophysics.",
    distance: datum(
      "Distance from Sun",
      6500,
      "light-year",
      "≈6,500 light-years",
      "estimated",
      "simbad",
      "Literature estimates vary",
    ),
    facts: [
      datum(
        "Historical event",
        1054,
        "year",
        "Supernova observed in 1054 CE",
        "observed",
        "atlas-editorial",
      ),
      datum(
        "Apparent visual magnitude",
        8.4,
        "apparent-magnitude",
        "V ≈ 8.4",
        "observed",
        "openngc",
        "Integrated extended source",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "05h 34m 31.9s",
      declination: "+22° 00′ 52″",
      note: "Representative remnant centre; filaments expand measurably.",
    },
    parentId: "milky-way",
    relatedIds: ["crab-pulsar", "eta-carinae", "ring-nebula"],
    sourceIds: ["openngc", "simbad", "atlas-editorial"],
    provenance: provenance(
      ["Identifiers and coordinate normalised", "Distance rounded"],
      "Expansion animation is scaled for visibility and not real-time.",
    ),
    uncertaintySummary:
      "Expansion and multi-wavelength emission are observed; distance and ejecta geometry carry model dependence.",
    visual: { colour: "#eb725d", glyph: "✺", textureMode: "diagrammatic" },
  },
  {
    id: "crab-pulsar",
    slug: "crab-pulsar",
    name: "Crab Pulsar",
    scientificName: "PSR B0531+21",
    aliases: ["PSR J0534+2200"],
    objectType: "young pulsar / neutron star",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["PSR B0531+21", "PSR J0534+2200"],
    summary:
      "A magnetised neutron star whose roughly 30 pulses per second energise the Crab Nebula.",
    significance:
      "It turns rotation into a precise clock and makes the compact remnant of a supernova directly traceable.",
    distance: datum(
      "Distance from Sun",
      6500,
      "light-year",
      "≈6,500 light-years",
      "estimated",
      "simbad",
      "Inherited remnant distance",
    ),
    facts: [
      datum(
        "Rotation period",
        0.033,
        "second",
        "≈33 milliseconds",
        "observed",
        "simbad",
      ),
      datum(
        "Object radius",
        null,
        "km",
        "about 10–15 km (model scale)",
        "estimated",
        "atlas-editorial",
        "Equation-of-state dependent",
      ),
    ],
    parentId: "crab-nebula",
    relatedIds: ["crab-nebula", "cygnus-x1", "sagittarius-a-star"],
    sourceIds: ["simbad", "atlas-editorial"],
    provenance: provenance(
      ["Period paraphrased at UI precision"],
      "Beam cones are a teaching model; they are not directly photographed searchlights.",
    ),
    uncertaintySummary:
      "Pulse period is extraordinarily precise; radius and internal composition depend on neutron-star physics.",
    visual: { colour: "#a683ff", glyph: "✧", textureMode: "diagrammatic" },
  },
  {
    id: "cygnus-x1",
    slug: "cygnus-x-1",
    name: "Cygnus X-1",
    aliases: ["Cyg X-1", "HDE 226868"],
    objectType: "stellar-mass black-hole binary",
    scaleLayerId: "stellar-evolution",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["Cyg X-1", "HDE 226868"],
    summary:
      "An X-ray binary containing a massive unseen compact object dynamically identified as a black hole.",
    significance:
      "It is a classic example of learning about a black hole through the motion and emission of nearby matter.",
    distance: datum(
      "Distance from Sun",
      7200,
      "light-year",
      "≈7,200 light-years",
      "derived",
      "simbad",
      "Astrometric and literature synthesis",
    ),
    facts: [
      datum(
        "Black-hole mass",
        21,
        "solar-mass",
        "≈21 solar masses",
        "estimated",
        "simbad",
        "Binary-orbit model dependent",
      ),
      datum(
        "Evidence",
        null,
        "dimensionless",
        "dynamics + X-ray emission",
        "derived",
        "atlas-editorial",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "19h 58m 21.7s",
      declination: "+35° 12′ 06″",
      note: "Coordinate identifies the binary system, not a visible black-hole surface.",
    },
    parentId: "milky-way",
    relatedIds: ["crab-pulsar", "sagittarius-a-star", "m87-star"],
    sourceIds: ["simbad", "atlas-editorial"],
    provenance: provenance(
      ["Representative dynamical mass rounded"],
      "Accretion disc, jet, and lensing visuals are illustrative.",
    ),
    uncertaintySummary:
      "The compact-object interpretation is strongly supported; mass depends on distance, inclination, and stellar modelling.",
    visual: { colour: "#bca4e8", glyph: "◉", textureMode: "diagrammatic" },
  },
  {
    id: "milky-way",
    slug: "milky-way",
    name: "Milky Way",
    aliases: ["the Galaxy"],
    objectType: "barred spiral galaxy",
    scaleLayerId: "galactic",
    recordKind: "derived-structure",
    evidenceStatus: "modelled",
    catalogueIds: [],
    summary:
      "Our barred spiral galaxy, mapped from inside its dusty disc through many complementary surveys.",
    significance:
      "Every unaided-eye star belongs to it, yet its far side and detailed spiral structure remain difficult to reconstruct.",
    distance: datum(
      "Sun to Galactic Centre",
      8.2,
      "kiloparsec",
      "≈8.2 kpc / 26,700 light-years",
      "estimated",
      "simbad",
      "Adopted Galactic constants vary",
    ),
    facts: [
      datum(
        "Stellar disc diameter",
        [100000, 120000],
        "light-year",
        "roughly 100,000–120,000 light-years",
        "modelled",
        "atlas-editorial",
        "Boundary depends on tracer",
      ),
      datum(
        "Star count",
        [100000000000, 400000000000],
        "dimensionless",
        "order of 100–400 billion stars",
        "estimated",
        "atlas-editorial",
        "Population-model dependent",
      ),
      datum(
        "Morphology",
        null,
        "dimensionless",
        "barred spiral",
        "derived",
        "atlas-editorial",
      ),
    ],
    coordinates: {
      frame: "galactic",
      epoch: "J2000.0",
      sourceId: "atlas-editorial",
      longitudeDeg: 0,
      latitudeDeg: 0,
      note: "The Galactic coordinate origin points toward the centre; the physical centre is represented by Sagittarius A*.",
    },
    parentId: "local-group",
    relatedIds: [
      "sagittarius-a-star",
      "large-magellanic-cloud",
      "andromeda-galaxy",
      "omega-centauri",
    ],
    sourceIds: ["gaia-dr3", "simbad", "atlas-editorial"],
    provenance: provenance(
      [
        "Multiple observational ideas synthesised into a teaching model",
        "Far-side arms shown as an illustrative reconstruction",
      ],
      "The rendered galaxy is not a photograph of the Milky Way from outside.",
    ),
    uncertaintySummary:
      "Local stellar data are rich, but extinction, distance errors, and our embedded viewpoint limit the global map.",
    visual: { colour: "#759ac5", glyph: "⌁", textureMode: "diagrammatic" },
  },
  {
    id: "sagittarius-a-star",
    slug: "sagittarius-a-star",
    name: "Sagittarius A*",
    aliases: ["Sgr A*"],
    objectType: "supermassive black hole",
    scaleLayerId: "galactic",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["Sgr A*"],
    summary:
      "The compact radio source associated with the Milky Way’s central supermassive black hole.",
    significance:
      "Orbits of nearby stars provide a precise gravitational mass measurement, while EHT observations resolve horizon-scale emission.",
    distance: datum(
      "Distance from Sun",
      8.2,
      "kiloparsec",
      "≈8.2 kpc / 26,700 light-years",
      "estimated",
      "simbad",
      "Adopted Galactic-centre distance",
    ),
    facts: [
      datum(
        "Mass",
        4300000,
        "solar-mass",
        "≈4.3 million solar masses",
        "derived",
        "eht-results",
        "Method-dependent interval",
        "Mass from stellar orbits",
      ),
      datum(
        "Evidence",
        null,
        "dimensionless",
        "stellar orbits + radio/submillimetre imaging",
        "derived",
        "eht-results",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "17h 45m 40.0s",
      declination: "−29° 00′ 28″",
      note: "The coordinate marks the compact radio source; no material surface is visible.",
    },
    parentId: "milky-way",
    relatedIds: ["milky-way", "cygnus-x1", "m87-star"],
    sourceIds: ["simbad", "eht-results"],
    provenance: provenance(
      ["Mass rounded", "Evidence channels labelled"],
      "The visible ring is a model-inspired educational rendering, not a literal event-horizon surface.",
    ),
    uncertaintySummary:
      "Mass and distance are strongly constrained but covary; horizon-scale images are interferometric reconstructions.",
    visual: { colour: "#f0ae55", glyph: "◉", textureMode: "diagrammatic" },
  },
  {
    id: "omega-centauri",
    slug: "omega-centauri",
    name: "Omega Centauri",
    scientificName: "NGC 5139",
    aliases: ["ω Centauri", "Caldwell 80"],
    objectType: "globular cluster",
    scaleLayerId: "galactic",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NGC 5139", "C 80"],
    summary:
      "The Milky Way’s most massive known globular cluster, with multiple stellar populations.",
    significance:
      "Its complexity has prompted ideas that it may be the remnant nucleus of an accreted dwarf galaxy.",
    distance: datum(
      "Distance from Sun",
      15800,
      "light-year",
      "≈15,800 light-years",
      "estimated",
      "simbad",
    ),
    facts: [
      datum(
        "Apparent visual magnitude",
        3.7,
        "apparent-magnitude",
        "V ≈ 3.7",
        "observed",
        "openngc",
        "Integrated value",
      ),
      datum(
        "Central black hole",
        null,
        "solar-mass",
        "Intermediate-mass candidate; no consensus",
        "unknown",
        "atlas-editorial",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "13h 26m 47s",
      declination: "−47° 28′ 46″",
      note: "Representative cluster centre.",
    },
    parentId: "milky-way",
    relatedIds: ["milky-way", "pleiades", "intermediate-black-hole-candidates"],
    sourceIds: ["openngc", "simbad", "atlas-editorial"],
    provenance: provenance(
      [
        "Cluster values rounded",
        "Black-hole claim intentionally marked candidate",
      ],
      "Dense point rendering is statistical at distance.",
    ),
    uncertaintySummary:
      "Cluster membership is well studied; claims for a central intermediate-mass black hole remain contested.",
    visual: { colour: "#e6c88f", glyph: "⁙", textureMode: "catalogue-point" },
  },
  {
    id: "intermediate-black-hole-candidates",
    slug: "intermediate-mass-black-hole-candidates",
    name: "Intermediate-mass black-hole candidates",
    aliases: ["IMBH candidates"],
    objectType: "evidence category",
    scaleLayerId: "galactic",
    recordKind: "conceptual-model",
    evidenceStatus: "conceptual",
    catalogueIds: [],
    summary:
      "A debated population between stellar-mass and supermassive black holes.",
    significance:
      "Candidates may illuminate how the first massive black-hole seeds formed, but no single detection method is decisive in every case.",
    distance: undefined,
    facts: [
      datum(
        "Indicative mass range",
        [100, 100000],
        "solar-mass",
        "about 10²–10⁵ solar masses",
        "conceptual",
        "atlas-editorial",
        "Category boundaries are conventional",
      ),
      datum(
        "Consensus status",
        null,
        "dimensionless",
        "candidate population",
        "unknown",
        "atlas-editorial",
      ),
    ],
    relatedIds: ["omega-centauri", "cygnus-x1", "sagittarius-a-star"],
    sourceIds: ["atlas-editorial"],
    provenance: provenance(
      ["Category used for education rather than as a single object"],
      "The interface must not turn a debated class into a confirmed catalogue entry.",
    ),
    uncertaintySummary:
      "Individual candidates depend on dynamical, accretion, or gravitational-wave interpretations and can have alternative explanations.",
    visual: { colour: "#9d86bf", glyph: "?", textureMode: "diagrammatic" },
  },
  {
    id: "large-magellanic-cloud",
    slug: "large-magellanic-cloud",
    name: "Large Magellanic Cloud",
    aliases: ["LMC"],
    objectType: "satellite irregular galaxy",
    scaleLayerId: "galactic",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["LMC"],
    summary:
      "A nearby satellite galaxy of the Milky Way with vigorous star formation and a prominent bar.",
    significance:
      "Its resolved stars calibrate the cosmic distance ladder and reveal the effects of galaxy interactions.",
    distance: datum(
      "Distance from Sun",
      163000,
      "light-year",
      "≈163,000 light-years",
      "derived",
      "simbad",
      "Distance-indicator synthesis",
    ),
    facts: [
      datum(
        "Morphology",
        null,
        "dimensionless",
        "Magellanic irregular / barred",
        "derived",
        "simbad",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "05h 23m 34s",
      declination: "−69° 45′ 22″",
      note: "Representative centre for an extended, irregular galaxy.",
    },
    parentId: "milky-way",
    relatedIds: ["milky-way", "local-group", "andromeda-galaxy"],
    sourceIds: ["simbad"],
    provenance: provenance(
      ["Distance rounded", "Morphology simplified"],
      "The 3D shape is an illustrative reconstruction from an Earth-centred view.",
    ),
    uncertaintySummary:
      "Distance is well measured by several methods; depth, warp, and membership vary across the galaxy.",
    visual: { colour: "#7aa7c6", glyph: "⌁", textureMode: "diagrammatic" },
  },
  {
    id: "andromeda-galaxy",
    slug: "andromeda-galaxy",
    name: "Andromeda Galaxy",
    scientificName: "Messier 31",
    aliases: ["M31", "NGC 224"],
    objectType: "spiral galaxy",
    scaleLayerId: "local-group",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 31", "NGC 224"],
    summary:
      "The nearest large spiral galaxy to the Milky Way and the dominant other member of the Local Group.",
    significance:
      "Its resolved populations let astronomers compare another large spiral with our own from the outside.",
    distance: datum(
      "Distance from Sun",
      2540000,
      "light-year",
      "≈2.54 million light-years",
      "derived",
      "simbad",
      "Distance-indicator synthesis",
    ),
    facts: [
      datum(
        "Apparent visual magnitude",
        3.44,
        "apparent-magnitude",
        "V ≈ 3.44",
        "observed",
        "openngc",
        "Integrated value",
      ),
      datum(
        "Radial motion",
        -300,
        "kilometre-per-second",
        "approaching at roughly 300 km/s heliocentric",
        "derived",
        "simbad",
        "Frame-dependent",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "00h 42m 44.3s",
      declination: "+41° 16′ 09″",
      note: "Coordinate is a representative galaxy centre.",
    },
    parentId: "local-group",
    relatedIds: ["milky-way", "triangulum-galaxy", "local-group"],
    sourceIds: ["openngc", "simbad"],
    provenance: provenance(
      ["Distance rounded", "Velocity described with reference-frame caveat"],
      "Rendered spiral detail is illustrative and not a single-band literal image.",
    ),
    uncertaintySummary:
      "Distance is well constrained; halo mass, satellite census, and long-term encounter details remain model-dependent.",
    visual: { colour: "#82a4d6", glyph: "⌁", textureMode: "diagrammatic" },
  },
  {
    id: "triangulum-galaxy",
    slug: "triangulum-galaxy",
    name: "Triangulum Galaxy",
    scientificName: "Messier 33",
    aliases: ["M33", "NGC 598"],
    objectType: "spiral galaxy",
    scaleLayerId: "local-group",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 33", "NGC 598"],
    summary: "A lower-mass spiral and the Local Group’s third-largest galaxy.",
    significance:
      "Its face-on star-forming disc helps connect local stellar populations to galaxy-wide structure.",
    distance: datum(
      "Distance from Sun",
      2730000,
      "light-year",
      "≈2.73 million light-years",
      "derived",
      "simbad",
      "Distance-indicator synthesis",
    ),
    facts: [
      datum(
        "Apparent visual magnitude",
        5.72,
        "apparent-magnitude",
        "V ≈ 5.72",
        "observed",
        "openngc",
        "Integrated, diffuse source",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "01h 33m 50.9s",
      declination: "+30° 39′ 37″",
      note: "Representative centre for an extended galaxy.",
    },
    parentId: "local-group",
    relatedIds: ["andromeda-galaxy", "milky-way", "local-group"],
    sourceIds: ["openngc", "simbad"],
    provenance: provenance(
      ["Distance rounded"],
      "Spiral-arm contrast is boosted for legibility.",
    ),
    uncertaintySummary:
      "Distance and membership are established; its exact dynamical relationship with Andromeda is model-dependent.",
    visual: { colour: "#6d91c2", glyph: "⌁", textureMode: "diagrammatic" },
  },
  {
    id: "local-group",
    slug: "local-group",
    name: "Local Group",
    aliases: [],
    objectType: "galaxy group",
    scaleLayerId: "local-group",
    recordKind: "derived-structure",
    evidenceStatus: "derived",
    catalogueIds: [],
    summary:
      "The gravitational neighbourhood containing the Milky Way, Andromeda, Triangulum, and dozens of smaller galaxies.",
    significance:
      "It is our nearest laboratory for galaxy interactions, satellites, dark matter, and the distance ladder.",
    distance: datum(
      "Approximate span",
      3,
      "megaparsec",
      "roughly 3 Mpc / 10 million light-years",
      "modelled",
      "atlas-editorial",
      "No sharp physical edge",
    ),
    facts: [
      datum(
        "Dominant large galaxies",
        3,
        "dimensionless",
        "Milky Way, Andromeda, Triangulum",
        "observed",
        "atlas-editorial",
      ),
    ],
    parentId: "cosmic-web",
    relatedIds: [
      "milky-way",
      "andromeda-galaxy",
      "triangulum-galaxy",
      "virgo-cluster",
    ],
    sourceIds: ["simbad", "atlas-editorial"],
    provenance: provenance(
      ["Member systems grouped in a barycentric frame"],
      "The boundary and halo extents are model-dependent.",
    ),
    uncertaintySummary:
      "Bright members are secure; faint satellite membership and total group mass remain incomplete or model-dependent.",
    visual: { colour: "#748bb6", glyph: "∴", textureMode: "diagrammatic" },
  },
  {
    id: "antennae-galaxies",
    slug: "antennae-galaxies",
    name: "Antennae Galaxies",
    aliases: ["NGC 4038/4039", "Caldwell 60/61"],
    objectType: "interacting galaxy pair",
    scaleLayerId: "extragalactic",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["NGC 4038", "NGC 4039"],
    summary:
      "Two galaxies in a prolonged interaction, with tidal tails and intense star formation.",
    significance:
      "They make the gravitational transformation of galaxies visible on a grand scale.",
    distance: datum(
      "Distance from Sun",
      45000000,
      "light-year",
      "≈45 million light-years",
      "estimated",
      "simbad",
      "Literature distance varies",
    ),
    facts: [
      datum(
        "System state",
        null,
        "dimensionless",
        "ongoing merger",
        "derived",
        "simbad",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "simbad",
      rightAscension: "12h 01m 53s",
      declination: "−18° 52′",
      note: "Representative centre between two extended interacting components.",
    },
    parentId: "cosmic-web",
    relatedIds: ["m87", "virgo-cluster", "andromeda-galaxy"],
    sourceIds: ["openngc", "simbad"],
    provenance: provenance(
      ["Pair treated as one teaching target", "Distance rounded"],
      "Merger animation is sped up by many orders of magnitude.",
    ),
    uncertaintySummary:
      "Interaction is observed; three-dimensional orbit and merger timescale depend on dynamical modelling.",
    visual: { colour: "#d48291", glyph: "⌁⌁", textureMode: "diagrammatic" },
  },
  {
    id: "m87",
    slug: "m87",
    name: "Messier 87",
    scientificName: "NGC 4486",
    aliases: ["M87", "Virgo A"],
    objectType: "giant elliptical galaxy",
    scaleLayerId: "extragalactic",
    recordKind: "catalogue-backed",
    evidenceStatus: "observed",
    catalogueIds: ["M 87", "NGC 4486"],
    summary:
      "A giant elliptical galaxy near the centre of the Virgo Cluster, famous for its relativistic jet.",
    significance:
      "Its central black hole became the first target with a published horizon-scale EHT image.",
    distance: datum(
      "Distance from Sun",
      53500000,
      "light-year",
      "≈53.5 million light-years",
      "estimated",
      "simbad",
      "Distance-method dependent",
    ),
    facts: [
      datum(
        "Morphology",
        null,
        "dimensionless",
        "giant elliptical galaxy",
        "derived",
        "openngc",
      ),
      datum(
        "Apparent visual magnitude",
        8.6,
        "apparent-magnitude",
        "V ≈ 8.6",
        "observed",
        "openngc",
      ),
    ],
    coordinates: {
      frame: "ICRS",
      epoch: "J2000.0",
      sourceId: "openngc",
      rightAscension: "12h 30m 49.4s",
      declination: "+12° 23′ 28″",
      note: "Coordinate is a representative galaxy centre.",
    },
    parentId: "virgo-cluster",
    relatedIds: ["m87-star", "virgo-cluster", "antennae-galaxies"],
    sourceIds: ["openngc", "simbad", "eht-results"],
    provenance: provenance(
      ["Distance rounded", "Jet direction diagrammatic"],
      "Galaxy glow and jet length are not shown on one linear brightness scale.",
    ),
    uncertaintySummary:
      "Galaxy and jet are directly observed; distance, halo mass, and jet physics retain model dependence.",
    visual: { colour: "#d3b99d", glyph: "●", textureMode: "diagrammatic" },
  },
  {
    id: "m87-star",
    slug: "m87-star",
    name: "M87*",
    aliases: ["M87 central black hole"],
    objectType: "supermassive black hole",
    scaleLayerId: "extragalactic",
    recordKind: "catalogue-backed",
    evidenceStatus: "derived",
    catalogueIds: ["M87*"],
    summary:
      "The supermassive black hole at M87’s centre, inferred dynamically and imaged through horizon-scale emission.",
    significance:
      "It links general-relativistic predictions, galaxy-scale jets, and global very-long-baseline interferometry.",
    distance: datum(
      "Distance from Sun",
      53500000,
      "light-year",
      "≈53.5 million light-years",
      "estimated",
      "eht-results",
      "Host-galaxy distance",
    ),
    facts: [
      datum(
        "Mass",
        6500000000,
        "solar-mass",
        "≈6.5 billion solar masses",
        "derived",
        "eht-results",
        "Method-dependent interval",
      ),
      datum(
        "Observed feature",
        null,
        "dimensionless",
        "bright emission ring around a central shadow",
        "derived",
        "eht-results",
      ),
    ],
    parentId: "m87",
    relatedIds: ["m87", "sagittarius-a-star", "cygnus-x1"],
    sourceIds: ["eht-results", "simbad"],
    provenance: provenance(
      ["Published result rounded", "Image interpretation paraphrased"],
      "The event horizon itself emits no light and is not photographed as a surface.",
    ),
    uncertaintySummary:
      "Mass estimates depend on method; reconstructed ring structure is robust but imaging pipelines and plasma models contribute uncertainty.",
    visual: { colour: "#ec9e52", glyph: "◉", textureMode: "diagrammatic" },
  },
  {
    id: "virgo-cluster",
    slug: "virgo-cluster",
    name: "Virgo Cluster",
    aliases: [],
    objectType: "galaxy cluster",
    scaleLayerId: "extragalactic",
    recordKind: "derived-structure",
    evidenceStatus: "derived",
    catalogueIds: [],
    summary:
      "The nearest large galaxy cluster, containing a complex mix of galaxies and subgroups.",
    significance:
      "It anchors studies of environmental galaxy evolution and the nearby cosmic web.",
    distance: datum(
      "Representative distance",
      54000000,
      "light-year",
      "≈54 million light-years",
      "estimated",
      "simbad",
      "Members span significant depth",
    ),
    facts: [
      datum(
        "Membership",
        null,
        "dimensionless",
        "thousands of galaxies depending on selection",
        "estimated",
        "atlas-editorial",
      ),
      datum(
        "Structure",
        null,
        "dimensionless",
        "not fully relaxed; multiple subclusters",
        "derived",
        "atlas-editorial",
      ),
    ],
    parentId: "cosmic-web",
    relatedIds: ["m87", "local-group", "cosmic-web"],
    sourceIds: ["simbad", "atlas-editorial"],
    provenance: provenance(
      [
        "Representative centre and distance used",
        "Membership rendered statistically",
      ],
      "Not every visible point is a catalogued member.",
    ),
    uncertaintySummary:
      "Core galaxies are secure; boundaries, infall membership, depth, and total mass depend on method.",
    visual: { colour: "#8d83c4", glyph: "⁙", textureMode: "diagrammatic" },
  },
  {
    id: "cosmic-web",
    slug: "cosmic-web",
    name: "Cosmic Web",
    aliases: ["large-scale structure"],
    objectType: "large-scale matter distribution",
    scaleLayerId: "extragalactic",
    recordKind: "conceptual-model",
    evidenceStatus: "modelled",
    catalogueIds: [],
    summary:
      "The filamentary pattern of clusters, sheets, and voids traced statistically by galaxy surveys and simulations.",
    significance:
      "It connects early density fluctuations with the present distribution of matter on the largest mapped scales.",
    distance: datum(
      "Displayed scale",
      [10, 1000],
      "megaparsec",
      "tens to thousands of megaparsecs",
      "conceptual",
      "atlas-editorial",
    ),
    facts: [
      datum(
        "Representation",
        null,
        "dimensionless",
        "statistical density field",
        "modelled",
        "atlas-editorial",
      ),
      datum(
        "Individual distant points",
        null,
        "dimensionless",
        "procedural unless a catalogue badge is present",
        "conceptual",
        "atlas-editorial",
      ),
    ],
    parentId: "observable-universe",
    relatedIds: [
      "virgo-cluster",
      "local-group",
      "cmb-surface",
      "observable-universe",
    ],
    sourceIds: ["planck-pr3", "atlas-editorial"],
    provenance: provenance(
      [
        "Educational density field seeded deterministically",
        "No fabricated galaxy identifiers",
      ],
      "Filaments are a modelled context layer, not a complete observational map.",
    ),
    uncertaintySummary:
      "Survey masks, redshift errors, bias between light and matter, and cosmological assumptions affect reconstructions.",
    visual: { colour: "#6f5f9f", glyph: "⌁", textureMode: "diagrammatic" },
  },
  {
    id: "cmb-surface",
    slug: "cosmic-microwave-background",
    name: "Cosmic Microwave Background",
    aliases: ["CMB", "surface of last scattering"],
    objectType: "cosmological radiation field",
    scaleLayerId: "observable-universe",
    recordKind: "derived-structure",
    evidenceStatus: "observed",
    catalogueIds: [],
    summary:
      "Relic microwave radiation released when the early Universe became transparent, observed in every direction.",
    significance:
      "Its tiny temperature variations constrain the contents, geometry, and early conditions of the Universe.",
    distance: datum(
      "Lookback time",
      13.8,
      "billion-year",
      "about 13.8 billion years",
      "modelled",
      "planck-pr3",
      "Cosmology-dependent",
    ),
    facts: [
      datum(
        "Mean temperature today",
        2.7255,
        "kelvin",
        "≈2.7255 K",
        "observed",
        "planck-pr3",
      ),
      datum(
        "Physical meaning",
        null,
        "dimensionless",
        "surface of last scattering, not a wall",
        "derived",
        "planck-pr3",
      ),
    ],
    parentId: "observable-universe",
    relatedIds: ["cosmic-web", "observable-universe"],
    sourceIds: ["planck-pr3"],
    provenance: provenance(
      ["No all-sky map redistributed", "Context rendered as a labelled shell"],
      "The shell is observer-centred and represents lookback time, not a fixed material boundary.",
    ),
    uncertaintySummary:
      "Temperature anisotropies are measured; inferred parameters depend on foreground removal, calibration, and the cosmological model.",
    visual: { colour: "#d98b58", glyph: "◌", textureMode: "diagrammatic" },
  },
  {
    id: "observable-universe",
    slug: "observable-universe",
    name: "Observable Universe",
    aliases: ["observable cosmos"],
    objectType: "observer-dependent cosmological region",
    scaleLayerId: "observable-universe",
    recordKind: "conceptual-model",
    evidenceStatus: "modelled",
    catalogueIds: [],
    summary:
      "The region from which signals could have reached us since the hot early Universe, under a stated cosmological model.",
    significance:
      "It is a horizon of observation, not evidence that all of space ends there.",
    distance: datum(
      "Present comoving radius",
      46500000000,
      "light-year",
      "≈46.5 billion light-years",
      "modelled",
      "planck-pr3",
      "Cosmology-dependent",
      "A comoving distance, not an age",
    ),
    facts: [
      datum(
        "Cosmic age",
        13.8,
        "billion-year",
        "≈13.8 billion years",
        "modelled",
        "planck-pr3",
        "Model-dependent",
      ),
      datum(
        "Beyond the horizon",
        null,
        "dimensionless",
        "Unknown extent",
        "unknown",
        "atlas-editorial",
      ),
    ],
    relatedIds: ["cmb-surface", "cosmic-web"],
    sourceIds: ["planck-pr3", "atlas-editorial"],
    provenance: provenance(
      [
        "Comoving radius and age kept conceptually separate",
        "Logarithmic visual scale",
      ],
      "The visual sphere is an observer-centred diagram, not a mapped physical edge.",
    ),
    uncertaintySummary:
      "The horizon scale depends on cosmological parameters; the total size or topology of the Universe is not established by this sample.",
    visual: { colour: "#8c6b95", glyph: "◌", textureMode: "diagrammatic" },
  },
] as const;

export const catalogueById: ReadonlyMap<string, CosmosExhibit> = new Map(
  cosmosCatalogue.map((object) => [object.id, object]),
);

export const catalogueBySlug: ReadonlyMap<string, CosmosExhibit> = new Map(
  cosmosCatalogue.map((object) => [object.slug, object]),
);

export const sourceById: ReadonlyMap<string, EditorialDataSource> = new Map(
  dataSources.map((source) => [source.id, source]),
);

const nasaBodyPageByObjectId: Readonly<Record<string, string>> = {
  earth: "https://science.nasa.gov/earth/facts/",
  moon: "https://science.nasa.gov/moon/facts/",
  sun: "https://science.nasa.gov/sun/facts/",
  mercury: "https://science.nasa.gov/mercury/facts/",
  venus: "https://science.nasa.gov/venus/venus-facts/",
  mars: "https://science.nasa.gov/mars/facts/",
  ceres: "https://science.nasa.gov/dwarf-planets/ceres/facts/",
  jupiter: "https://science.nasa.gov/jupiter/jupiter-facts/",
  europa: "https://science.nasa.gov/jupiter/jupiter-moons/europa/europa-facts/",
  saturn: "https://science.nasa.gov/saturn/facts/",
  titan: "https://science.nasa.gov/saturn/moons/titan/facts/",
  uranus: "https://science.nasa.gov/uranus/facts/",
  neptune: "https://science.nasa.gov/neptune/neptune-facts/",
  pluto: "https://science.nasa.gov/dwarf-planets/pluto/facts/",
} as const;

function preferredIdentifier(
  object: CosmosExhibit,
  pattern?: RegExp,
): string | null {
  return (
    (pattern
      ? object.catalogueIds.find((identifier) => pattern.test(identifier))
      : object.catalogueIds[0]) ??
    object.catalogueIds[0] ??
    null
  );
}

/**
 * Resolves a field-level source ID to the narrowest authoritative record or
 * result link available without claiming that a cross-identification is a
 * redistributed source row.
 */
export function getScientificSourceLink(
  object: CosmosExhibit,
  sourceId: string,
): ScientificSourceLink | null {
  const source = sourceById.get(sourceId);
  if (!source) return null;

  if (sourceId === "nasa-solar-system") {
    const objectUrl = nasaBodyPageByObjectId[object.id];
    if (objectUrl) {
      return {
        sourceId,
        label: `${source.provider} object page`,
        url: objectUrl,
        recordIdentifier: object.catalogueIds[0] ?? object.name,
        scope: "object-record",
      };
    }
  }

  if (sourceId === "nasa-exoplanet-archive") {
    const identifier = preferredIdentifier(object);
    if (identifier) {
      return {
        sourceId,
        label: `${source.provider} object overview`,
        url: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(identifier)}`,
        recordIdentifier: identifier,
        scope: "object-record",
      };
    }
  }

  if (sourceId === "simbad") {
    const identifier = preferredIdentifier(object);
    if (identifier) {
      return {
        sourceId,
        label: `${source.provider} object record`,
        url: `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(identifier)}`,
        recordIdentifier: identifier,
        scope: "object-record",
      };
    }
  }

  if (sourceId === "openngc") {
    const identifier = preferredIdentifier(object, /^(?:NGC|IC)\s/u);
    return {
      sourceId,
      label: `${source.provider} pinned catalogue record`,
      url: "https://raw.githubusercontent.com/mattiaverga/OpenNGC/v20231203/database_files/NGC.csv",
      recordIdentifier: identifier,
      scope: "dataset-context",
    };
  }

  if (sourceId === "jpl-horizons") {
    return {
      sourceId,
      label: `${source.provider} ephemeris lookup`,
      url: source.url,
      recordIdentifier: preferredIdentifier(object, /^NAIF\s/u),
      scope: "ephemeris-service",
    };
  }

  if (sourceId === "eht-results") {
    return {
      sourceId,
      label: `${source.provider} published results`,
      url: source.citationUrl,
      recordIdentifier: preferredIdentifier(object),
      scope: "published-result",
    };
  }

  if (sourceId === "atlas-editorial") {
    return {
      sourceId,
      label: source.citation,
      url: source.citationUrl,
      recordIdentifier: object.id,
      scope: "methodology",
    };
  }

  return {
    sourceId,
    label: `${source.provider} dataset context`,
    url: source.url,
    recordIdentifier: preferredIdentifier(object),
    scope: "dataset-context",
  };
}

export function getObjectSourceLinks(
  object: CosmosExhibit,
): readonly ScientificSourceLink[] {
  return object.sourceIds.flatMap((sourceId) => {
    const link = getScientificSourceLink(object, sourceId);
    return link ? [link] : [];
  });
}

export const searchableCatalogue = cosmosCatalogue.map((object) => ({
  id: object.id,
  slug: object.slug,
  name: object.name,
  aliases: object.aliases,
  objectType: object.objectType,
  distance:
    object.distance?.display ?? "Distance not applicable or unavailable",
  recordKind: object.recordKind,
  sourceLabels: object.sourceIds
    .map((sourceId) => sourceById.get(sourceId)?.dataset)
    .filter((label): label is string => Boolean(label)),
}));

export const learningArticles: readonly LearningArticle[] = [
  {
    id: "scale-and-light-time",
    title: "Scale is a ladder, not one room",
    dek: "Why the atlas changes coordinate frames and visual language as you travel.",
    explanations: {
      beginner:
        "Space is so large that one picture cannot keep both Earth and a galaxy visible at honest scale. The atlas changes its ruler as you move: kilometres near a world, astronomical units around the Sun, and light-years between stars.",
      student:
        "A light-year is a distance—the distance light travels in one year. Looking at an object 100 light-years away means receiving light that left it about 100 years ago, while the object’s present position can differ because it kept moving.",
      advanced:
        "The renderer uses nested local frames and logarithmic transitions instead of a single global float coordinate. Cosmological scenes distinguish lookback time, proper distance, and present-day comoving distance; those quantities coincide only in special limits.",
    },
    howWeKnow:
      "Radar, spacecraft tracking, stellar parallax, standard candles, redshift surveys, and cosmological fits form an overlapping distance ladder. Each rung is calibrated and carries its own systematics.",
    misconception: {
      claim: "Zooming out should reveal everything at its literal size.",
      correction:
        "A literal linear scale would make almost every object disappear. The atlas uses labelled exaggeration, level of detail, and local frames to keep structure legible.",
    },
    uncertaintyNote:
      "A displayed distance can be geometric, inferred, model-dependent, or a broad representative range. Read the evidence badge and uncertainty text.",
    explorerObjectIds: [
      "earth",
      "solar-system",
      "proxima-centauri",
      "andromeda-galaxy",
      "observable-universe",
    ],
    sourceIds: ["gaia-dr3", "planck-pr3", "atlas-editorial"],
    knowledgeCheck: {
      prompt: "Which phrase names a distance rather than a duration?",
      choices: ["Light-year", "Lookback time", "Cosmic age"],
      correctChoiceIndex: 0,
      explanation:
        "A light-year is a unit of distance; lookback time and cosmic age are durations.",
    },
  },
  {
    id: "how-catalogues-work",
    title: "A catalogue is a measurement history",
    dek: "Identifiers do not make measurements complete, uniform, or timeless.",
    explanations: {
      beginner:
        "A catalogue is a carefully organised list built from observations. It can tell us where an object appeared and what instruments measured, but it does not contain every object in space.",
      student:
        "Surveys have brightness limits, wavelength choices, sky coverage, and quality filters. A catalogue row can combine direct measurements with derived properties, and different catalogues may disagree for legitimate reasons.",
      advanced:
        "Selection functions, cross-match probabilities, correlated errors, passband definitions, reference epochs, and source-model assumptions are part of the scientific data model. Removing them turns a catalogue into misleading trivia.",
    },
    howWeKnow:
      "Archive teams publish instrument calibrations, data models, validation papers, and release notes. Cross-survey comparisons reveal both astrophysical differences and systematic error.",
    misconception: {
      claim:
        "A catalogue identifier proves every property in the row is exact.",
      correction:
        "The identifier links evidence. Individual fields can be missing, uncertain, inferred, superseded, or drawn from heterogeneous literature.",
    },
    uncertaintyNote:
      "This sample keeps provider and version metadata and does not fabricate values where the cited archive lacks a defensible one.",
    explorerObjectIds: [
      "proxima-centauri",
      "trappist-1e",
      "orion-nebula",
      "andromeda-galaxy",
    ],
    sourceIds: ["gaia-dr3", "nasa-exoplanet-archive", "openngc", "simbad"],
    knowledgeCheck: {
      prompt: "Why might a survey miss a real object?",
      choices: [
        "It can be fainter than the survey limit",
        "Real objects always appear in every catalogue",
        "Identifiers expire after one year",
      ],
      correctChoiceIndex: 0,
      explanation:
        "Every survey has sensitivity, wavelength, coverage, and processing limits.",
    },
  },
  {
    id: "uncertainty-is-information",
    title: "Uncertainty is information",
    dek: "Error bars are not apologies; they describe what the evidence permits.",
    explanations: {
      beginner:
        "Measurements are never perfectly exact. Scientists report a range or a confidence level so that you can tell a close estimate from a rough one.",
      student:
        "Random noise, instrument calibration, model assumptions, and unknown geometry affect results differently. Quoting more decimal places does not remove those limits.",
      advanced:
        "Posteriors may be asymmetric, multimodal, correlated, censored, or prior-sensitive. A single symmetric ± value can therefore be an inadequate summary; the atlas uses prose caveats when the source cannot be reduced honestly.",
    },
    howWeKnow:
      "Repeated observations, calibration standards, independent methods, simulations, and residual analysis estimate how measured and inferred values may vary.",
    misconception: {
      claim: "If scientists disagree, no knowledge is possible.",
      correction:
        "Disagreement can map the size and source of uncertainty. Betelgeuse’s broad distance range still supports strong conclusions about its stellar class.",
    },
    uncertaintyNote:
      "Ranges in this sample are deliberately broad when primary literature values differ; they are not statistical confidence intervals unless labelled as such.",
    explorerObjectIds: [
      "betelgeuse",
      "omega-centauri",
      "sagittarius-a-star",
      "observable-universe",
    ],
    sourceIds: ["simbad", "eht-results", "planck-pr3", "atlas-editorial"],
    knowledgeCheck: {
      prompt: "What does a narrower error interval usually indicate?",
      choices: [
        "A more constrained estimate under stated assumptions",
        "An object with smaller physical size",
        "A value that can never change",
      ],
      correctChoiceIndex: 0,
      explanation:
        "An interval describes knowledge of a quantity, not the object’s size or eternal certainty.",
    },
  },
  {
    id: "stellar-lives",
    title: "Stars do not share one fate",
    dek: "Initial mass, composition, rotation, companionship, and mass loss shape stellar evolution.",
    explanations: {
      beginner:
        "Stars shine by fusing light elements in their cores. Small and medium stars eventually leave white dwarfs; the most massive can explode and leave neutron stars or black holes.",
      student:
        "A star spends most of its life on the main sequence. Core fuel changes the balance between gravity and pressure, driving giant phases, mass loss, and—above mass-dependent thresholds—core collapse.",
      advanced:
        "Outcome boundaries depend on metallicity, rotation, binary exchange, wind prescriptions, and core structure. Initial mass alone is a useful organising variable, not a complete deterministic label.",
    },
    howWeKnow:
      "Star clusters provide populations of similar age, spectra reveal temperature and composition, supernova remnants preserve ejecta, and compact binaries enable dynamical mass estimates.",
    misconception: {
      claim: "Every red giant will become a black hole.",
      correction:
        "Most low- and intermediate-mass stars shed their envelopes and leave white dwarfs. Black-hole remnants require very different core histories.",
    },
    uncertaintyNote:
      "Animations compress millions of years and show representative pathways, not predictions for a named star’s exact future.",
    explorerObjectIds: [
      "orion-molecular-cloud",
      "sun",
      "betelgeuse",
      "ring-nebula",
      "sirius-b",
      "crab-nebula",
      "crab-pulsar",
      "cygnus-x1",
    ],
    sourceIds: ["simbad", "openngc", "atlas-editorial"],
    knowledgeCheck: {
      prompt: "Which factor helps determine a star’s final remnant?",
      choices: [
        "Its core and mass-loss history",
        "Its constellation name",
        "How bright it looks from Earth alone",
      ],
      correctChoiceIndex: 0,
      explanation:
        "Physical evolution—not apparent pattern or brightness alone—sets the outcome.",
    },
  },
  {
    id: "finding-exoplanets",
    title: "Finding worlds by their effects",
    dek: "Most exoplanets are inferred from changes in light or motion, not resolved as tiny globes.",
    explanations: {
      beginner:
        "A planet can dim its star as it crosses in front, tug the star back and forth, bend a background star’s light, or sometimes be separated from the star in an image.",
      student:
        "Transits measure radius relative to the star; radial velocities measure a minimum mass unless inclination is known. Direct imaging favours young, warm, widely separated giants, while microlensing reaches cold and distant systems.",
      advanced:
        "Completeness varies across period, radius, mass ratio, stellar type, contrast, cadence, and event geometry. Population claims require injection–recovery tests and careful treatment of false positives and archive selection criteria.",
    },
    howWeKnow:
      "Repeated periodic signals, independent instruments, dynamical consistency, statistical validation, and follow-up observations reduce false-positive explanations.",
    misconception: {
      claim: "A planet in a habitable zone is known to be habitable.",
      correction:
        "The zone is an energy-balance model. Atmosphere, water inventory, geology, stellar activity, and many other conditions remain unknown.",
    },
    uncertaintyNote:
      "Illustrated surfaces are explicitly artistic. Confirmed status means the archive’s inclusion criteria are met, not that every property is measured.",
    explorerObjectIds: [
      "trappist-1e",
      "51-pegasi-b",
      "hr-8799-e",
      "ogle-2016-blg-1195-lb",
    ],
    sourceIds: ["nasa-exoplanet-archive", "atlas-editorial"],
    knowledgeCheck: {
      prompt: "What does a transit primarily constrain?",
      choices: [
        "Planet radius relative to the star",
        "A colour photograph of the surface",
        "The planet’s exact mass by itself",
      ],
      correctChoiceIndex: 0,
      explanation:
        "Transit depth mainly measures the area ratio; stellar properties are needed for an absolute radius.",
    },
  },
  {
    id: "mapping-the-milky-way",
    title: "Mapping a galaxy from the inside",
    dek: "Dust, distance, and our embedded viewpoint make the Milky Way a reconstruction.",
    explanations: {
      beginner:
        "We cannot fly outside the Milky Way to take its portrait. Astronomers combine star positions, gas maps, infrared light, and motions to infer its shape.",
      student:
        "Gaia maps stellar astrometry, radio surveys trace gas through dust, and infrared observations reveal the inner Galaxy. These measurements support a disc, central bar, bulge, halo, and spiral structure with unequal confidence.",
      advanced:
        "The selection function, extinction law, parallax systematics, kinematic distance ambiguity, pattern speed, and tracer age all influence Galactic reconstructions. Spiral-arm maps are conditional models, especially on the far side.",
    },
    howWeKnow:
      "Different wavelengths penetrate dust differently, while proper motion and radial velocity add kinematic constraints to positions and distances.",
    misconception: {
      claim: "Images of the whole Milky Way are photographs taken from above.",
      correction:
        "Whole-galaxy views are illustrations or reconstructions. All spacecraft remain deep inside the Milky Way.",
    },
    uncertaintyNote:
      "The atlas deliberately cross-fades catalogue stars into a labelled structural model at galactic scale.",
    explorerObjectIds: [
      "sun",
      "milky-way",
      "sagittarius-a-star",
      "omega-centauri",
      "large-magellanic-cloud",
    ],
    sourceIds: ["gaia-dr3", "simbad", "atlas-editorial"],
    knowledgeCheck: {
      prompt: "Why use infrared and radio observations in the Galactic plane?",
      choices: [
        "They can reveal structures hidden by visible-light extinction",
        "They eliminate all measurement error",
        "They place us outside the Galaxy",
      ],
      correctChoiceIndex: 0,
      explanation:
        "Longer wavelengths can penetrate dusty regions that obscure visible light.",
    },
  },
  {
    id: "galaxies-and-structure",
    title: "From galaxies to the cosmic web",
    dek: "Gravity builds hierarchy while expansion changes the distances between unbound regions.",
    explanations: {
      beginner:
        "Galaxies gather into groups and clusters. On still larger scales they trace long filaments around comparatively empty voids.",
      student:
        "Dark matter dominates the gravitating mass of groups and clusters. Galaxy redshifts and distance indicators reveal both local motions and the overall expansion of space.",
      advanced:
        "Redshift-space distortions, galaxy bias, survey masks, weak-lensing kernels, and an assumed background cosmology enter large-scale-structure inference. Filament boundaries are algorithm-dependent rather than unique physical surfaces.",
    },
    howWeKnow:
      "Spectroscopic redshift surveys map three-dimensional galaxy distributions; gravitational lensing probes total projected mass; simulations connect early fluctuations to late structure.",
    misconception: {
      claim: "Expansion means galaxies, planets, and atoms are all swelling.",
      correction:
        "Gravitationally or electromagnetically bound systems do not simply follow the large-scale Hubble expansion.",
    },
    uncertaintyNote:
      "The cosmic-web layer is statistical context. A decorative point is never promoted to a named galaxy without a catalogue source.",
    explorerObjectIds: [
      "local-group",
      "antennae-galaxies",
      "virgo-cluster",
      "cosmic-web",
    ],
    sourceIds: ["simbad", "planck-pr3", "atlas-editorial"],
    knowledgeCheck: {
      prompt:
        "Which observation can trace mass even when it emits little or no light?",
      choices: [
        "Gravitational lensing",
        "Constellation line art",
        "A planet’s phase alone",
      ],
      correctChoiceIndex: 0,
      explanation:
        "Lensing responds to gravity from total projected mass, including dark matter.",
    },
  },
  {
    id: "black-holes-evidence",
    title: "Black holes: evidence without a surface",
    dek: "We infer black holes through gravity, accreting matter, jets, waves, and horizon-scale light.",
    explanations: {
      beginner:
        "A black hole is not a cosmic vacuum cleaner. Far away, its gravity acts like that of any object with the same mass. We detect black holes by watching matter and light around them.",
      student:
        "Binary orbits can reveal an unseen compact mass; hot accretion flows emit X-rays; jets carry energy outward; gravitational waves record merging compact objects; EHT arrays reconstruct emission near supermassive black holes.",
      advanced:
        "Mass functions, inclination, plasma radiative transfer, interferometric calibration, spacetime models, and alternative compact-object hypotheses belong in the inference chain. An event horizon is a causal boundary, not a material shell.",
    },
    howWeKnow:
      "Independent evidence agrees across stellar dynamics, high-energy spectra, time variability, gravitational waves, and very-long-baseline interferometry.",
    misconception: {
      claim: "The EHT photographed the event horizon itself.",
      correction:
        "It reconstructed bright emission surrounding a central shadow region whose scale agrees with a black-hole model.",
    },
    uncertaintyNote:
      "Lensing and accretion visuals are explanatory approximations. They must not be read as live simulations of a selected object.",
    explorerObjectIds: [
      "cygnus-x1",
      "intermediate-black-hole-candidates",
      "sagittarius-a-star",
      "m87-star",
    ],
    sourceIds: ["eht-results", "simbad", "atlas-editorial"],
    knowledgeCheck: {
      prompt: "What is an event horizon?",
      choices: [
        "A causal boundary",
        "A solid black surface",
        "A ring of burning material",
      ],
      correctChoiceIndex: 0,
      explanation:
        "The event horizon marks a one-way causal boundary; accreting material can glow outside it.",
    },
  },
] as const;

export const glossary: readonly GlossaryEntry[] = [
  {
    term: "Astronomical unit",
    slug: "astronomical-unit",
    level: "beginner",
    shortDefinition: "A distance unit close to the mean Earth–Sun separation.",
    expandedDefinition:
      "The astronomical unit (au) is defined exactly as 149,597,870,700 metres and is convenient for Solar System distances.",
    relatedTerms: ["light-year", "parsec"],
  },
  {
    term: "Light-year",
    slug: "light-year",
    level: "beginner",
    shortDefinition: "The distance light travels in vacuum in one Julian year.",
    expandedDefinition:
      "A light-year is about 9.46 trillion kilometres. Despite the word year, it is a distance, not a time.",
    relatedTerms: ["lookback time", "parsec"],
  },
  {
    term: "Parsec",
    slug: "parsec",
    level: "student",
    shortDefinition: "A distance of about 3.26 light-years.",
    expandedDefinition:
      "A parsec is the distance at which one astronomical unit subtends one arcsecond; it arises naturally from parallax geometry.",
    relatedTerms: ["parallax", "light-year"],
  },
  {
    term: "Parallax",
    slug: "parallax",
    level: "student",
    shortDefinition:
      "An apparent positional shift caused by changing viewpoint.",
    expandedDefinition:
      "Annual stellar parallax compares a nearby star against distant background directions as Earth moves around the Sun.",
    relatedTerms: ["parsec", "proper motion"],
  },
  {
    term: "Proper motion",
    slug: "proper-motion",
    level: "student",
    shortDefinition: "A source’s angular motion across the sky over time.",
    expandedDefinition:
      "Proper motion combines true transverse motion with distance and is usually reported per year in an explicit reference frame.",
    relatedTerms: ["parallax", "radial velocity"],
  },
  {
    term: "Radial velocity",
    slug: "radial-velocity",
    level: "student",
    shortDefinition:
      "Motion toward or away from an observer along the line of sight.",
    expandedDefinition:
      "It is inferred from Doppler shifts and always depends on the adopted velocity reference frame.",
    relatedTerms: ["redshift", "proper motion"],
  },
  {
    term: "Apparent magnitude",
    slug: "apparent-magnitude",
    level: "beginner",
    shortDefinition: "A logarithmic measure of how bright an object appears.",
    expandedDefinition:
      "Smaller and negative values are brighter. The value depends on wavelength, distance, extinction, and measurement aperture.",
    relatedTerms: ["absolute magnitude", "luminosity"],
  },
  {
    term: "Absolute magnitude",
    slug: "absolute-magnitude",
    level: "student",
    shortDefinition: "A standardised intrinsic-brightness measure.",
    expandedDefinition:
      "For stars it is commonly defined as apparent magnitude at 10 parsecs, with passband and extinction conventions stated.",
    relatedTerms: ["apparent magnitude", "distance modulus"],
  },
  {
    term: "Redshift",
    slug: "redshift",
    level: "student",
    shortDefinition:
      "A fractional shift of spectral features toward longer wavelengths.",
    expandedDefinition:
      "Redshift can reflect relative motion, gravity, or cosmic expansion; cosmological interpretation requires a model and reference frame.",
    relatedTerms: ["radial velocity", "cosmic expansion"],
  },
  {
    term: "Reference frame",
    slug: "reference-frame",
    level: "student",
    shortDefinition:
      "The origin, axes, and motion convention used for coordinates.",
    expandedDefinition:
      "Object-local, heliocentric, galactocentric, and cosmological frames answer different questions and cannot be mixed silently.",
    relatedTerms: ["epoch", "ICRS"],
  },
  {
    term: "Epoch",
    slug: "epoch",
    level: "student",
    shortDefinition: "The time to which a coordinate or model refers.",
    expandedDefinition:
      "Positions change because of proper motion, orbital motion, precession, and observer location, so precision coordinates require an epoch.",
    relatedTerms: ["reference frame", "proper motion"],
  },
  {
    term: "Main sequence",
    slug: "main-sequence",
    level: "beginner",
    shortDefinition:
      "The long stellar phase powered mainly by core hydrogen fusion.",
    expandedDefinition:
      "A star’s main-sequence position reflects mass, temperature, luminosity, and composition; the Sun is currently in this phase.",
    relatedTerms: ["red giant", "stellar mass"],
  },
  {
    term: "Red giant",
    slug: "red-giant",
    level: "beginner",
    shortDefinition: "An expanded, cool-surfaced phase in a star’s evolution.",
    expandedDefinition:
      "After central hydrogen depletion, changing core and shell burning can enlarge the envelope; exact paths depend on mass and composition.",
    relatedTerms: ["main sequence", "white dwarf"],
  },
  {
    term: "White dwarf",
    slug: "white-dwarf",
    level: "beginner",
    shortDefinition:
      "A dense stellar remnant supported mainly by electron degeneracy pressure.",
    expandedDefinition:
      "It is the exposed core left by many low- and intermediate-mass stars, typically Earth-sized but comparable to the Sun in mass.",
    relatedTerms: ["planetary nebula", "Chandrasekhar limit"],
  },
  {
    term: "Neutron star",
    slug: "neutron-star",
    level: "student",
    shortDefinition:
      "An extremely compact remnant of some core-collapse supernovae.",
    expandedDefinition:
      "Its matter is compressed beyond atomic densities and its radius depends on the uncertain equation of state.",
    relatedTerms: ["pulsar", "supernova"],
  },
  {
    term: "Pulsar",
    slug: "pulsar",
    level: "beginner",
    shortDefinition:
      "A rotating neutron star detected through periodic beams of radiation.",
    expandedDefinition:
      "Pulses arrive when a misaligned emission beam sweeps our line of sight; not every neutron star is observed as a pulsar.",
    relatedTerms: ["neutron star", "magnetar"],
  },
  {
    term: "Event horizon",
    slug: "event-horizon",
    level: "student",
    shortDefinition:
      "A causal boundary from within which outward signals cannot reach distant observers.",
    expandedDefinition:
      "It is not a material surface. Its location and properties are defined by spacetime geometry and can be subtle in dynamical situations.",
    relatedTerms: ["black hole", "accretion disc"],
  },
  {
    term: "Accretion disc",
    slug: "accretion-disc",
    level: "beginner",
    shortDefinition:
      "Orbiting material that dissipates energy as it spirals inward.",
    expandedDefinition:
      "Viscosity-like stresses and magnetic turbulence redistribute angular momentum; the disc can become luminous without the central object emitting.",
    relatedTerms: ["event horizon", "relativistic jet"],
  },
  {
    term: "Relativistic jet",
    slug: "relativistic-jet",
    level: "advanced",
    shortDefinition: "A narrow outflow moving near light speed.",
    expandedDefinition:
      "Magnetised plasma launched near some accreting compact objects can transport energy far beyond the host system; formation details remain an active field.",
    relatedTerms: ["accretion disc", "active galactic nucleus"],
  },
  {
    term: "Habitable zone",
    slug: "habitable-zone",
    level: "beginner",
    shortDefinition:
      "A modelled range where surface liquid water could be possible under stated assumptions.",
    expandedDefinition:
      "It is not a detection of water, life, or habitability; atmosphere, orbit, geology, and stellar activity matter.",
    relatedTerms: ["exoplanet", "equilibrium temperature"],
  },
  {
    term: "Transit",
    slug: "transit",
    level: "beginner",
    shortDefinition:
      "A passage of one object across the face of another from our viewpoint.",
    expandedDefinition:
      "An exoplanet transit produces a periodic brightness dip whose depth mainly constrains the planet-to-star area ratio.",
    relatedTerms: ["exoplanet", "selection effect"],
  },
  {
    term: "Microlensing",
    slug: "microlensing",
    level: "student",
    shortDefinition:
      "Temporary magnification caused by an intervening gravitating system.",
    expandedDefinition:
      "A planet can perturb the lensing light curve, but the alignment is usually one-off and physical parameters may be degenerate.",
    relatedTerms: ["gravitational lensing", "exoplanet"],
  },
  {
    term: "Gravitational lensing",
    slug: "gravitational-lensing",
    level: "student",
    shortDefinition: "Deflection and distortion of light by curved spacetime.",
    expandedDefinition:
      "Strong, weak, and microlensing regimes probe different scales and can reveal mass whether or not it emits light.",
    relatedTerms: ["microlensing", "dark matter"],
  },
  {
    term: "Open cluster",
    slug: "open-cluster",
    level: "beginner",
    shortDefinition: "A comparatively loose group of stars born together.",
    expandedDefinition:
      "Members share age and composition closely enough to test stellar evolution, though Galactic tides gradually disperse many clusters.",
    relatedTerms: ["globular cluster", "stellar population"],
  },
  {
    term: "Globular cluster",
    slug: "globular-cluster",
    level: "beginner",
    shortDefinition: "A dense, old, roughly spherical star cluster.",
    expandedDefinition:
      "Many orbit in galactic halos and contain complex dynamical histories; some massive examples show multiple stellar populations.",
    relatedTerms: ["open cluster", "galactic halo"],
  },
  {
    term: "Galaxy group",
    slug: "galaxy-group",
    level: "beginner",
    shortDefinition:
      "A gravitational association of galaxies smaller than a rich cluster.",
    expandedDefinition:
      "Group boundaries and membership depend on position, velocity, distance, and dynamical criteria; the Local Group is our own.",
    relatedTerms: ["galaxy cluster", "Local Group"],
  },
  {
    term: "Galaxy cluster",
    slug: "galaxy-cluster",
    level: "beginner",
    shortDefinition:
      "A massive gravitationally bound system of galaxies, gas, and dark matter.",
    expandedDefinition:
      "Galaxies provide only part of the mass; hot X-ray gas and gravitational lensing trace additional components.",
    relatedTerms: ["galaxy group", "cosmic web"],
  },
  {
    term: "Cosmic web",
    slug: "cosmic-web",
    level: "student",
    shortDefinition:
      "The large-scale network of filaments, sheets, clusters, and voids.",
    expandedDefinition:
      "It is inferred statistically from surveys and lensing and reproduced by structure-formation simulations under a cosmological model.",
    relatedTerms: ["void", "galaxy cluster"],
  },
  {
    term: "Lookback time",
    slug: "lookback-time",
    level: "student",
    shortDefinition:
      "The elapsed time since the light we now receive was emitted.",
    expandedDefinition:
      "In an expanding Universe it is not numerically identical to present comoving distance divided by the speed of light.",
    relatedTerms: ["light-year", "comoving distance"],
  },
  {
    term: "Comoving distance",
    slug: "comoving-distance",
    level: "advanced",
    shortDefinition:
      "A cosmological distance coordinate that factors out average expansion.",
    expandedDefinition:
      "Objects moving only with the Hubble flow keep approximately fixed comoving coordinates; converting observations requires cosmological parameters.",
    relatedTerms: ["lookback time", "redshift"],
  },
  {
    term: "Cosmic microwave background",
    slug: "cosmic-microwave-background",
    level: "student",
    shortDefinition:
      "Relic radiation from the era when the early Universe became transparent.",
    expandedDefinition:
      "Its nearly uniform blackbody spectrum and tiny anisotropies encode early density fluctuations and model-dependent cosmological parameters.",
    relatedTerms: ["surface of last scattering", "observable Universe"],
  },
  {
    term: "Selection effect",
    slug: "selection-effect",
    level: "advanced",
    shortDefinition:
      "A pattern produced or altered by what an observing method can detect.",
    expandedDefinition:
      "A discovered population is not automatically representative; survey sensitivity, cadence, geometry, and validation thresholds shape it.",
    relatedTerms: ["catalogue completeness", "transit"],
  },
] as const;

interface ChapterAuthoring {
  readonly id: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly summary: string;
  readonly transcript: string;
  readonly anchorObjectId: string;
  readonly referenceFrame: CosmicReferenceFrame;
  readonly sourceIds: readonly string[];
  readonly objective: string;
  readonly durationSeconds?: number;
  readonly cameraDistance?: number;
  readonly cameraUnit?:
    DistanceUnit | "object-radii" | "light-year" | "kiloparsec" | "megaparsec";
  readonly caution?: string;
  readonly knowledgeCheck?: KnowledgeCheck;
}

const toCanonicalDistanceUnit = (
  unit: ChapterAuthoring["cameraUnit"],
): DistanceUnit | undefined => {
  if (unit === "object-radii" || unit === undefined) return undefined;
  if (unit === "light-year") return "ly";
  if (unit === "kiloparsec") return "kpc";
  if (unit === "megaparsec") return "Mpc";
  return unit;
};

const tourSources = (sourceIds: readonly string[]): TourDefinition["sources"] =>
  sourceIds.flatMap((sourceId) => {
    const source = sourceById.get(sourceId);
    if (!source) return [];
    return [
      {
        id: source.id,
        title: source.citation,
        provider: source.provider,
        url: source.citationUrl,
        accessedAt: "2026-07-29",
      },
    ];
  });

const createChapter = ({
  id,
  title,
  eyebrow,
  summary,
  transcript,
  anchorObjectId,
  referenceFrame,
  sourceIds,
  objective,
  durationSeconds = 48,
  cameraDistance = 4,
  cameraUnit = "object-radii",
  caution,
  knowledgeCheck,
}: ChapterAuthoring): TourChapter => {
  if (!objective.trim()) {
    throw new TypeError(`Tour chapter "${id}" needs a learning objective.`);
  }
  if (
    sourceIds.length === 0 ||
    sourceIds.some((sourceId) => !sourceById.has(sourceId))
  ) {
    throw new TypeError(`Tour chapter "${id}" has missing or unknown sources.`);
  }
  if (
    knowledgeCheck &&
    (knowledgeCheck.choices.length < 2 ||
      knowledgeCheck.correctChoiceIndex < 0 ||
      knowledgeCheck.correctChoiceIndex >= knowledgeCheck.choices.length)
  ) {
    throw new TypeError(`Tour chapter "${id}" has an invalid knowledge check.`);
  }

  return {
    id,
    title,
    caption: `${eyebrow} — ${summary}`,
    transcript,
    sourceIds: [...sourceIds],
    narration: { script: transcript },
    duration: { value: durationSeconds, unit: "s" },
    waypoint: {
      targetObjectId: anchorObjectId,
      ...(toCanonicalDistanceUnit(cameraUnit)
        ? {
            cameraDistance: {
              value: cameraDistance,
              unit: toCanonicalDistanceUnit(cameraUnit) as DistanceUnit,
            },
          }
        : {}),
      orientation: {
        yaw: { value: 0, unit: "deg" },
        pitch: { value: -4, unit: "deg" },
        roll: { value: 0, unit: "deg" },
      },
      targetLock: true,
    },
    transition: {
      style: "fly",
      duration: { value: 6.2, unit: "s" },
    },
    pauseAtEnd: true,
    contentBasis:
      caution ||
      catalogueById.get(anchorObjectId)?.recordKind === "conceptual-model" ||
      catalogueById.get(anchorObjectId)?.evidenceStatus === "modelled"
        ? "modelled"
        : catalogueById.get(anchorObjectId)?.evidenceStatus === "estimated"
          ? "estimated"
          : catalogueById.get(anchorObjectId)?.evidenceStatus === "observed"
            ? "observed"
            : "derived",
    ...(caution ||
    catalogueById.get(anchorObjectId)?.recordKind === "conceptual-model" ||
    catalogueById.get(anchorObjectId)?.evidenceStatus === "modelled" ||
    catalogueById.get(anchorObjectId)?.evidenceStatus === "estimated"
      ? {
          caveat:
            caution ??
            catalogueById.get(anchorObjectId)?.uncertaintySummary ??
            `The ${referenceFrame} representation is model-dependent.`,
        }
      : {}),
  };
};

export const guidedTours: readonly TourDefinition[] = [
  {
    schemaVersion: "1.0.0",
    id: "our-cosmic-address",
    version: "1.0.0",
    language: "en",
    title: "Our Cosmic Address",
    summary:
      "Begin above Earth and cross the Solar System, nearby stars, the Milky Way, the Local Group, and the observable horizon.",
    sources: tourSources([
      "nasa-solar-system",
      "jpl-horizons",
      "gaia-dr3",
      "simbad",
      "openngc",
      "planck-pr3",
      "atlas-editorial",
    ]),
    chapters: [
      createChapter({
        id: "address-earth",
        title: "A moving observatory",
        eyebrow: "Earth • planetary frame",
        summary:
          "Every direction and distance begins from a world already in motion.",
        transcript:
          "Our address begins on Earth, but Earth is not a fixed platform. It rotates, orbits the Sun, and carries every telescope with it. Astronomers therefore attach a time, reference frame, and observer location to precise coordinates.",
        anchorObjectId: "earth",
        referenceFrame: "object-local",
        sourceIds: ["nasa-solar-system", "jpl-horizons"],
        objective:
          "Explain why precise positions require a reference frame and epoch.",
      }),
      createChapter({
        id: "address-solar-system",
        title: "The Sun’s family",
        eyebrow: "Solar System • astronomical units",
        summary:
          "A planetary system is a hierarchy, not a row of equally spaced worlds.",
        transcript:
          "Pull back to the Sun’s gravitational family. Planet sizes are enlarged here so they remain visible, while orbital spacing follows a separate labelled scale. Beyond the planets lie belts, a solar-wind bubble, and a much less certain distant comet reservoir.",
        anchorObjectId: "solar-system",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 42,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "jpl-horizons", "atlas-editorial"],
        objective:
          "Distinguish body size, orbital distance, and conceptual Solar System boundaries.",
        caution: "Body sizes and distances are not drawn on one linear scale.",
      }),
      createChapter({
        id: "address-neighbourhood",
        title: "Between the stars",
        eyebrow: "Local neighbourhood • light-years",
        summary:
          "The nearest known star is still more than four light-years away.",
        transcript:
          "At interstellar scale the planets collapse into one point: the Sun. Proxima Centauri is the nearest known neighbouring star, about 4.25 light-years away. Most glowing points in the ambience are procedural context; only points with catalogue badges are individual measured sources.",
        anchorObjectId: "proxima-centauri",
        referenceFrame: "local-interstellar",
        cameraDistance: 2,
        cameraUnit: "light-year",
        sourceIds: ["gaia-dr3", "simbad", "atlas-editorial"],
        objective:
          "Recognise the difference between catalogue stars and procedural context.",
      }),
      createChapter({
        id: "address-milky-way",
        title: "Inside the Galaxy",
        eyebrow: "Milky Way • kiloparsecs",
        summary:
          "Our galaxy-wide view is a reconstruction made from within the dusty disc.",
        transcript:
          "The Sun sits in the Milky Way’s disc, tens of thousands of light-years from the centre. Gaia measures an immense stellar sample nearby, while infrared and radio surveys help see through dust. The far-side spiral pattern shown here is an evidence-led illustration, not a photograph taken from above.",
        anchorObjectId: "milky-way",
        referenceFrame: "galactocentric",
        cameraDistance: 24,
        cameraUnit: "kiloparsec",
        sourceIds: ["gaia-dr3", "simbad", "atlas-editorial"],
        objective:
          "Separate observed Galactic data from structural reconstruction.",
        caution:
          "Spiral-arm geometry is illustrative where observations are incomplete.",
      }),
      createChapter({
        id: "address-local-group",
        title: "A small gathering of galaxies",
        eyebrow: "Local Group • megaparsecs",
        summary:
          "The Milky Way shares a gravitational neighbourhood with Andromeda, Triangulum, and many smaller systems.",
        transcript:
          "From here the Milky Way is one galaxy among many. Andromeda is the other dominant large spiral, with Triangulum and dozens of smaller companions. Membership and the group’s outer boundary are inferred from distance and motion, so the halo envelopes are intentionally soft-edged.",
        anchorObjectId: "local-group",
        referenceFrame: "local-group-barycentric",
        cameraDistance: 2.4,
        cameraUnit: "megaparsec",
        sourceIds: ["simbad", "openngc", "atlas-editorial"],
        objective:
          "Describe the Local Group as a gravitationally inferred, soft-edged structure.",
      }),
      createChapter({
        id: "address-horizon",
        title: "The horizon of observation",
        eyebrow: "Observable Universe • cosmological frame",
        summary:
          "The observable horizon is not known to be the edge of all space.",
        transcript:
          "The oldest light we map is the cosmic microwave background, released when the young Universe became transparent. In the standard fitted cosmology, the present comoving radius of our observable region is about 46.5 billion light-years, even though the cosmic age is about 13.8 billion years. Expansion makes distance and light-travel time different quantities.",
        anchorObjectId: "observable-universe",
        referenceFrame: "comoving-cosmological",
        cameraDistance: 14260,
        cameraUnit: "megaparsec",
        sourceIds: ["planck-pr3", "atlas-editorial"],
        objective:
          "Distinguish cosmic age, lookback time, and comoving horizon distance.",
        caution:
          "The final sphere is an observer-centred diagram, not a physical wall.",
        knowledgeCheck: {
          prompt:
            "Why can the comoving radius exceed 13.8 billion light-years?",
          choices: [
            "Space expanded while the light travelled",
            "Light moved faster in the past",
            "The cosmic age is measured in kilometres",
          ],
          correctChoiceIndex: 0,
          explanation:
            "Expansion increases present separation while the signal is in flight.",
        },
      }),
    ],
  },
  {
    schemaVersion: "1.0.0",
    id: "solar-system-tour",
    version: "1.0.0",
    language: "en",
    title: "The Solar System",
    summary:
      "Meet the Sun, planets, major moons, small-body populations, heliosphere, and the conceptual Oort Cloud.",
    sources: tourSources([
      "nasa-solar-system",
      "jpl-horizons",
      "simbad",
      "atlas-editorial",
    ]),
    chapters: [
      createChapter({
        id: "solar-sun",
        title: "One ordinary star, one dominant influence",
        eyebrow: "The Sun",
        summary: "Nearly all the Solar System’s mass resides in the Sun.",
        transcript:
          "The Sun is a middle-aged main-sequence star, not a fire in the everyday chemical sense. Fusion in its core supplies energy; gravity binds the planetary system. The stylised scene marker is illustrative, while reference radius, mass, and temperature come from cited data.",
        anchorObjectId: "sun",
        referenceFrame: "object-local",
        sourceIds: ["nasa-solar-system", "simbad"],
        objective: "Identify fusion and gravity as the Sun’s central roles.",
      }),
      createChapter({
        id: "solar-inner-worlds",
        title: "Four rocky outcomes",
        eyebrow: "Mercury • Venus • Earth • Mars",
        summary:
          "Similar ingredients produced radically different surfaces and atmospheres.",
        transcript:
          "Mercury is small and airless; Venus is Earth-sized beneath a dense hot atmosphere; Earth carries oceans; Mars is a cold desert with evidence of a wetter past. Their differences warn against treating size or orbital distance as destiny. The fly-through enlarges each body without enlarging its orbit by the same factor.",
        anchorObjectId: "earth",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 1.8,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "jpl-horizons"],
        objective:
          "Compare the terrestrial planets without assuming similar size means similar climate.",
        caution: "Planet radii are exaggerated relative to orbital spacing.",
      }),
      createChapter({
        id: "solar-asteroid-belt",
        title: "A belt with mostly empty space",
        eyebrow: "Asteroid belt • Ceres",
        summary: "The main belt is a population, not a packed obstacle course.",
        transcript:
          "Between Mars and Jupiter lies a broad population of rocky and metal-rich small bodies. Ceres is large enough for gravity to pull it nearly round and is classed as a dwarf planet. Only selected points are catalogue objects; the rest of the belt is an unlabelled density model.",
        anchorObjectId: "ceres",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 0.18,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "jpl-horizons", "atlas-editorial"],
        objective:
          "Explain why a visual density field is not an inventory of individual asteroids.",
      }),
      createChapter({
        id: "solar-jupiter",
        title: "A system within the system",
        eyebrow: "Jupiter • Galilean moons",
        summary: "The largest planet governs a diverse family of moons.",
        transcript:
          "Jupiter’s atmosphere is deep and dynamic, but there is no solid cloud-top surface to stand on. Its Galilean moons include volcanic Io, ocean-bearing Europa, giant Ganymede, and cratered Callisto. Europa’s subsurface ocean is strongly inferred, while its depth and chemistry remain uncertain.",
        anchorObjectId: "jupiter",
        referenceFrame: "object-local",
        cameraDistance: 24,
        sourceIds: ["nasa-solar-system"],
        objective:
          "Recognise Jupiter and its major moons as a hierarchical planetary subsystem.",
      }),
      createChapter({
        id: "solar-saturn",
        title: "Rings made of orbits",
        eyebrow: "Saturn • Titan",
        summary:
          "Countless particles share organised orbits; Titan carries weather of another chemistry.",
        transcript:
          "Saturn’s rings are neither a solid sheet nor permanent decoration. They are vast numbers of particles shaped by gravity, collisions, and resonances. Beyond them, Titan has a nitrogen atmosphere, methane weather, and surface lakes—but far colder conditions than Earth.",
        anchorObjectId: "saturn",
        referenceFrame: "object-local",
        cameraDistance: 18,
        sourceIds: ["nasa-solar-system"],
        objective:
          "Describe rings as dynamic particle populations and Titan as a chemically distinct world.",
      }),
      createChapter({
        id: "solar-ice-giants",
        title: "The least visited giants",
        eyebrow: "Uranus • Neptune",
        summary: "Ice giants are not smaller copies of Jupiter.",
        transcript:
          "Uranus and Neptune contain larger fractions of materials astronomers call ices—such as water, ammonia, and methane—beneath hydrogen-rich atmospheres. Uranus rotates with an extreme tilt; Neptune radiates more internal heat and drives vigorous weather. Their deep interiors remain model-dependent.",
        anchorObjectId: "uranus",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 13,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "jpl-horizons"],
        objective:
          "Distinguish ice giants from gas giants and label interior models as inferred.",
      }),
      createChapter({
        id: "solar-kuiper",
        title: "Beyond Neptune",
        eyebrow: "Pluto • Kuiper Belt",
        summary:
          "A diverse population replaces the old picture of one final planet.",
        transcript:
          "Pluto is one member of a wide trans-Neptunian population. Its eccentric orbit, active nitrogen-ice landscape, and large companion Charon make it complex without making it a planet under the current IAU classification. The belt’s faint distant census remains incomplete.",
        anchorObjectId: "pluto",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 11,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "atlas-editorial"],
        objective: "Place Pluto within the wider Kuiper Belt population.",
      }),
      createChapter({
        id: "solar-heliosphere",
        title: "Where the solar wind yields",
        eyebrow: "Heliosphere",
        summary:
          "Spacecraft crossings sample a boundary whose global shape we infer.",
        transcript:
          "The solar wind inflates an asymmetric plasma region within the local interstellar medium. Voyager 1 crossed the heliopause in one direction at about 122 astronomical units. That measurement is direct; the smooth global outline shown here is a time-varying model constrained by sparse viewpoints.",
        anchorObjectId: "heliosphere",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 150,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "atlas-editorial"],
        objective:
          "Separate a spacecraft crossing measurement from a global heliosphere model.",
        caution: "The heliopause is not a rigid spherical shell.",
      }),
      createChapter({
        id: "solar-oort",
        title: "A frontier inferred from comets",
        eyebrow: "Oort Cloud • conceptual model",
        summary:
          "No telescope has photographed the Oort Cloud as the shell shown here.",
        transcript:
          "Long-period comet orbits motivate a distant, roughly isotropic reservoir called the Oort Cloud. Proposed inner and outer limits span orders of magnitude, and passing stars and Galactic tides can perturb it. Every point in this view is conceptual context, not an individually observed Oort Cloud body.",
        anchorObjectId: "oort-cloud-model",
        referenceFrame: "heliocentric-ecliptic",
        cameraDistance: 80000,
        cameraUnit: "au",
        sourceIds: ["nasa-solar-system", "atlas-editorial"],
        objective:
          "State clearly that the Oort Cloud is inferred rather than directly imaged.",
        caution:
          "Conceptual model: no individual rendered point is catalogued.",
        knowledgeCheck: {
          prompt: "What is the main evidence for an Oort Cloud?",
          choices: [
            "Long-period comet dynamics",
            "A direct photograph of the whole shell",
            "Planetary radar echoes from its outer edge",
          ],
          correctChoiceIndex: 0,
          explanation:
            "The reservoir is inferred chiefly from the orbits and supply of long-period comets.",
        },
      }),
    ],
  },
  {
    schemaVersion: "1.0.0",
    id: "lives-of-stars",
    version: "1.0.0",
    language: "en",
    title: "The Lives of Stars",
    summary:
      "Follow representative stellar pathways from molecular clouds to white dwarfs, neutron stars, and stellar black holes.",
    sources: tourSources([
      "simbad",
      "openngc",
      "gaia-dr3",
      "nasa-solar-system",
      "atlas-editorial",
    ]),
    chapters: [
      createChapter({
        id: "stars-clouds",
        title: "Cold clouds, uneven collapse",
        eyebrow: "Molecular clouds",
        summary: "Stars begin in structured clouds, not in empty space.",
        transcript:
          "Cold molecular clouds contain gas, dust, magnetic fields, turbulence, and dense knots. Gravity can overwhelm local support in some knots, while feedback or motion disperses others. The cloud volume is reconstructed from tracers and displayed illustratively; it is not a solid object with a hard boundary.",
        anchorObjectId: "orion-molecular-cloud",
        referenceFrame: "galactocentric",
        cameraDistance: 45,
        cameraUnit: "light-year",
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Describe molecular clouds as structured, partially inferred star-forming environments.",
      }),
      createChapter({
        id: "stars-protostars",
        title: "A star before fusion settles",
        eyebrow: "Protostars • discs • jets",
        summary: "Collapsing cores feed young stars through rotating discs.",
        transcript:
          "As a core collapses, angular momentum flattens infalling material into a disc and jets can carry momentum outward. A protostar shines through gravitational contraction and accretion before sustained core hydrogen fusion defines the main sequence. Dust hides much of this process in visible light, so infrared and radio observations are essential.",
        anchorObjectId: "orion-nebula",
        referenceFrame: "object-local",
        cameraDistance: 12,
        sourceIds: ["openngc", "simbad", "atlas-editorial"],
        objective:
          "Distinguish protostellar accretion energy from main-sequence fusion.",
      }),
      createChapter({
        id: "stars-main-sequence",
        title: "The long balance",
        eyebrow: "Main sequence • the Sun",
        summary:
          "Core fusion and gravity maintain a slowly evolving stellar equilibrium.",
        transcript:
          "The Sun spends most of its life on the main sequence, where core hydrogen fusion supplies energy while gravity compresses the star. More massive stars are hotter, brighter, and shorter-lived because luminosity rises steeply with mass. Composition, rotation, and companions add important variation.",
        anchorObjectId: "sun",
        referenceFrame: "object-local",
        sourceIds: ["nasa-solar-system", "simbad", "atlas-editorial"],
        objective:
          "Relate stellar mass to main-sequence temperature, luminosity, and lifetime.",
      }),
      createChapter({
        id: "stars-giants",
        title: "When the core fuel changes",
        eyebrow: "Red giants and supergiants",
        summary:
          "A cool-looking surface can surround an enormous, luminous star.",
        transcript:
          "When central hydrogen is depleted, changes in the core and burning shells can expand the envelope. Betelgeuse is a red supergiant, not a preview of the Sun’s exact future: it began with much more mass. Its distance and radius are shown as broad ranges because its extended, variable atmosphere makes both difficult to pin down.",
        anchorObjectId: "betelgeuse",
        referenceFrame: "object-local",
        cameraDistance: 7,
        sourceIds: ["simbad", "gaia-dr3"],
        objective:
          "Separate low-mass red-giant evolution from massive red-supergiant evolution.",
        caution:
          "Betelgeuse has no scientifically defensible supernova countdown.",
      }),
      createChapter({
        id: "stars-gentle-remnants",
        title: "Envelope away, core exposed",
        eyebrow: "Planetary nebulae • white dwarfs",
        summary:
          "Many stars shed their envelopes without undergoing core-collapse supernovae.",
        transcript:
          "Low- and intermediate-mass stars can expel glowing envelopes like the Ring Nebula, leaving hot white-dwarf cores. Despite the name, a planetary nebula has nothing to do with planets. Sirius B shows the endpoint: roughly a solar mass compressed into a body comparable to Earth in size, cooling over immense time.",
        anchorObjectId: "ring-nebula",
        referenceFrame: "object-local",
        cameraDistance: 8,
        sourceIds: ["openngc", "simbad", "atlas-editorial"],
        objective:
          "Connect planetary nebulae to white dwarfs and correct the misleading historical name.",
      }),
      createChapter({
        id: "stars-massive",
        title: "Mass loss before collapse",
        eyebrow: "Massive stars • Eta Carinae",
        summary:
          "Very massive stars reshape themselves and their surroundings before their final outcome.",
        transcript:
          "Eta Carinae is a massive interacting binary with a history of giant eruptions. Stellar winds, rotation, and companion exchange can strip or add mass, changing the core that eventually collapses. Initial mass remains a powerful guide, but it is not the only variable that selects a stellar fate.",
        anchorObjectId: "eta-carinae",
        referenceFrame: "object-local",
        cameraDistance: 11,
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Identify mass loss and binary interaction as major controls on massive-star outcomes.",
      }),
      createChapter({
        id: "stars-supernovae",
        title: "A remnant still expanding",
        eyebrow: "Supernova • Crab Nebula",
        summary:
          "Core collapse ejects material and can leave a compact remnant.",
        transcript:
          "The Crab Nebula expands from a supernova observed in 1054. Filaments carry processed elements outward, while a compact neutron star supplies much of the nebula’s present high-energy power. The animation is accelerated enormously: no human-scale playback can show the true evolutionary timescale.",
        anchorObjectId: "crab-nebula",
        referenceFrame: "object-local",
        cameraDistance: 10,
        sourceIds: ["openngc", "simbad"],
        objective:
          "Link historical supernova observation, expanding ejecta, and compact remnant.",
      }),
      createChapter({
        id: "stars-compact-outcomes",
        title: "Neutron star or black hole",
        eyebrow: "Pulsars • stellar black holes",
        summary:
          "Core structure and mass loss influence which compact object remains.",
        transcript:
          "The Crab Pulsar is a rapidly rotating neutron star, detected through periodic radiation. In Cygnus X-1, a massive unseen object is identified as a black hole through binary dynamics and X-ray emission. These are not the same endpoint, and the boundary between outcomes depends on core structure, composition, rotation, mass loss, and companionship.",
        anchorObjectId: "cygnus-x1",
        referenceFrame: "object-local",
        cameraDistance: 10,
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Explain why stellar endpoints branch rather than follow one universal sequence.",
        knowledgeCheck: {
          prompt: "Which statement is most accurate?",
          choices: [
            "Stellar outcome depends on mass and other physical history",
            "Every star ends as a black hole",
            "Every supernova leaves the same remnant",
          ],
          correctChoiceIndex: 0,
          explanation:
            "Mass is central, but composition, rotation, binary interaction, and mass loss also matter.",
        },
      }),
    ],
  },
  {
    schemaVersion: "1.0.0",
    id: "inside-the-milky-way",
    version: "1.0.0",
    language: "en",
    title: "Inside the Milky Way",
    summary:
      "Cross the stellar neighbourhood, disc, spiral structure, bar, bulge, halo, Galactic Centre, and satellite system.",
    sources: tourSources([
      "gaia-dr3",
      "simbad",
      "openngc",
      "eht-results",
      "atlas-editorial",
    ]),
    chapters: [
      createChapter({
        id: "milky-neighbourhood",
        title: "The local patch",
        eyebrow: "Solar neighbourhood",
        summary: "The Sun samples one small region of a vast stellar disc.",
        transcript:
          "Gaia measures positions and motions for an extraordinary number of sources, but this tour begins with a deliberately tiny curated sample. Nearby stars have distinct ages and velocities; the familiar constellations are perspective drawings from Earth, not physical groups.",
        anchorObjectId: "sun",
        referenceFrame: "local-interstellar",
        cameraDistance: 35,
        cameraUnit: "light-year",
        sourceIds: ["gaia-dr3", "atlas-editorial"],
        objective:
          "Distinguish local catalogue stars from constellation conventions and procedural context.",
      }),
      createChapter({
        id: "milky-disc",
        title: "A thin luminous disc",
        eyebrow: "Disc • gas • dust",
        summary:
          "Stars, gas, and dust occupy overlapping discs with different thicknesses.",
        transcript:
          "The Milky Way’s thin disc hosts much of its recent star formation, while older populations extend into a thicker component. Dust absorbs visible light unevenly, carving the dark band we see from Earth. The disc glow here is a density model tied to observations, not billions of independent browser objects.",
        anchorObjectId: "milky-way",
        referenceFrame: "galactocentric",
        cameraDistance: 18,
        cameraUnit: "kiloparsec",
        sourceIds: ["gaia-dr3", "atlas-editorial"],
        objective:
          "Compare thin-disc, thick-disc, gas, and dust distributions.",
      }),
      createChapter({
        id: "milky-spirals",
        title: "Spiral arms as a reconstruction",
        eyebrow: "Spiral structure",
        summary:
          "Young stars and gas trace arms, but the far side is incompletely mapped.",
        transcript:
          "Radio gas surveys, masers, young clusters, and stellar populations trace spiral structure. From inside the plane, distances can be ambiguous and dust blocks sightlines. Arm segments drawn beyond strong constraints fade to an illustrative style so visual continuity never masquerades as a complete map.",
        anchorObjectId: "milky-way",
        referenceFrame: "galactocentric",
        cameraDistance: 24,
        cameraUnit: "kiloparsec",
        sourceIds: ["gaia-dr3", "atlas-editorial"],
        objective:
          "Explain why the Milky Way’s spiral-arm map is a synthesis with uneven confidence.",
        caution: "Far-side arm geometry is illustrative.",
      }),
      createChapter({
        id: "milky-bar",
        title: "A bar through the centre",
        eyebrow: "Central bar",
        summary:
          "The inner stellar distribution is elongated rather than circular.",
        transcript:
          "Infrared star counts and stellar motions reveal a central bar embedded in the inner disc. Its exact angle, length, and pattern speed vary among analyses. In this reconstruction the bar is a probability-weighted structural layer, not a sharp solid beam.",
        anchorObjectId: "milky-way",
        referenceFrame: "galactocentric",
        cameraDistance: 8,
        cameraUnit: "kiloparsec",
        sourceIds: ["gaia-dr3", "atlas-editorial"],
        objective:
          "Identify the central bar and name the parameters that remain model-dependent.",
      }),
      createChapter({
        id: "milky-bulge",
        title: "The crowded inner Galaxy",
        eyebrow: "Bulge",
        summary:
          "Old populations, dust, and the bar overlap toward the Galactic Centre.",
        transcript:
          "The bulge is not one uniform sphere. It includes a boxy or peanut-shaped stellar distribution connected to the bar, and its crowded sightlines challenge distance and source matching. Infrared observations reduce, but do not erase, dust and confusion.",
        anchorObjectId: "sagittarius-a-star",
        referenceFrame: "galactocentric",
        cameraDistance: 1.4,
        cameraUnit: "kiloparsec",
        sourceIds: ["simbad", "gaia-dr3", "atlas-editorial"],
        objective:
          "Describe the bulge as a structured, crowded population rather than a simple sphere.",
      }),
      createChapter({
        id: "milky-halo",
        title: "Halo and ancient clusters",
        eyebrow: "Stellar halo • globular clusters",
        summary:
          "Sparse old populations and clusters extend far beyond the bright disc.",
        transcript:
          "Omega Centauri is one massive globular cluster orbiting in the Galactic halo. Halo stars and streams preserve evidence of smaller systems accreted over time. The dark-matter halo is inferred gravitationally and extends much farther than the visible glow; it is not rendered as luminous material.",
        anchorObjectId: "omega-centauri",
        referenceFrame: "galactocentric",
        cameraDistance: 18,
        cameraUnit: "kiloparsec",
        sourceIds: ["openngc", "simbad", "atlas-editorial"],
        objective:
          "Separate luminous halo tracers from the inferred dark-matter halo.",
      }),
      createChapter({
        id: "milky-centre",
        title: "Four million Suns in a compact source",
        eyebrow: "Sagittarius A*",
        summary: "Stellar orbits reveal the Milky Way’s central black hole.",
        transcript:
          "Near-infrared observations follow stars racing around an unseen compact mass of about 4.3 million Suns. The Event Horizon Telescope adds horizon-scale radio information. Neither method sees a solid black surface: each constrains gravity and emission around a black-hole model.",
        anchorObjectId: "sagittarius-a-star",
        referenceFrame: "object-local",
        cameraDistance: 14,
        sourceIds: ["eht-results", "simbad"],
        objective: "Name the independent evidence for Sagittarius A*.",
      }),
      createChapter({
        id: "milky-satellites",
        title: "A galaxy with companions",
        eyebrow: "Satellite galaxies",
        summary:
          "The Magellanic Clouds and fainter satellites record ongoing interaction and accretion.",
        transcript:
          "The Large Magellanic Cloud is a nearby irregular companion whose stars help calibrate distances. Gravitational interaction with the Milky Way and the Small Magellanic Cloud shapes gas and stellar structure. The faint-satellite census is still sensitive to sky coverage and detection limits.",
        anchorObjectId: "large-magellanic-cloud",
        referenceFrame: "galactocentric",
        cameraDistance: 70,
        cameraUnit: "kiloparsec",
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Place satellite galaxies within the Milky Way’s evolving environment.",
        knowledgeCheck: {
          prompt:
            "Why is a whole-galaxy Milky Way view labelled reconstruction?",
          choices: [
            "We observe it from inside the dusty disc",
            "The Milky Way has no stars",
            "Gaia measures no positions",
          ],
          correctChoiceIndex: 0,
          explanation:
            "Our embedded viewpoint and extinction require many surveys and models to infer the global shape.",
        },
      }),
    ],
  },
  {
    schemaVersion: "1.0.0",
    id: "worlds-beyond",
    version: "1.0.0",
    language: "en",
    title: "Worlds Beyond the Solar System",
    summary:
      "Learn how transits, radial velocities, direct imaging, and microlensing reveal a strongly selected population of confirmed and candidate worlds.",
    sources: tourSources([
      "nasa-exoplanet-archive",
      "gaia-dr3",
      "atlas-editorial",
    ]),
    chapters: [
      createChapter({
        id: "exo-claims",
        title: "A planet claim has a status",
        eyebrow: "Confirmed • candidate • false positive",
        summary:
          "Archive labels describe the strength and review state of the evidence.",
        transcript:
          "A candidate signal is worth investigating but can still have non-planet explanations. Confirmation or statistical validation requires stronger evidence and published scrutiny. Even then, individual properties can remain uncertain or change as new analyses enter the archive.",
        anchorObjectId: "trappist-1e",
        referenceFrame: "local-interstellar",
        cameraDistance: 4,
        cameraUnit: "au",
        sourceIds: ["nasa-exoplanet-archive"],
        objective:
          "Distinguish confirmed planets from candidates and false positives.",
      }),
      createChapter({
        id: "exo-transits",
        title: "A repeating shadow",
        eyebrow: "Transit method",
        summary:
          "Transit depth measures an area ratio, not a resolved planetary silhouette.",
        transcript:
          "When an orbit is aligned nearly edge-on, a planet can block a small fraction of its star’s light. Repeated dips reveal period and relative size; the star’s radius is needed to infer the planet’s radius. Starspots, blended binaries, and instrument systematics can imitate parts of the signal.",
        anchorObjectId: "trappist-1e",
        referenceFrame: "object-local",
        cameraDistance: 0.05,
        cameraUnit: "au",
        sourceIds: ["nasa-exoplanet-archive", "atlas-editorial"],
        objective: "Identify what transit depth and repetition constrain.",
      }),
      createChapter({
        id: "exo-radial-velocity",
        title: "The star moves too",
        eyebrow: "Radial velocity",
        summary:
          "A planet’s gravity shifts its star’s spectral lines back and forth.",
        transcript:
          "51 Pegasi b was found through periodic Doppler shifts of its Sun-like host. The method measures motion along our line of sight and usually gives a minimum planet mass because orbital inclination may be unknown. Stellar activity can add competing signals that require careful modelling.",
        anchorObjectId: "51-pegasi-b",
        referenceFrame: "object-local",
        cameraDistance: 0.08,
        cameraUnit: "au",
        sourceIds: ["nasa-exoplanet-archive"],
        objective:
          "Explain why radial velocity often yields m sin i rather than a unique mass.",
      }),
      createChapter({
        id: "exo-direct-imaging",
        title: "Separating a faint world from its star",
        eyebrow: "Direct imaging",
        summary: "Imaging favours bright young giants on wide orbits.",
        transcript:
          "HR 8799 e is detected as light separated from its host, but that does not create a detailed globe. Coronagraphs, adaptive optics, and signal processing suppress the star’s glare. Converting brightness and spectrum into mass still depends strongly on age, atmosphere, and cooling models.",
        anchorObjectId: "hr-8799-e",
        referenceFrame: "object-local",
        cameraDistance: 22,
        cameraUnit: "au",
        sourceIds: ["nasa-exoplanet-archive"],
        objective:
          "State both the strength and the model dependence of direct imaging.",
      }),
      createChapter({
        id: "exo-microlensing",
        title: "A one-time alignment",
        eyebrow: "Microlensing",
        summary:
          "Gravity briefly magnifies a background star and a planet perturbs the light curve.",
        transcript:
          "OGLE-2016-BLG-1195 Lb was inferred during a transient alignment of observer, lens system, and background source. Microlensing can find cold planets at large distances, including systems too faint for other methods. The event usually cannot be replayed, and lens geometry can leave multiple plausible parameter solutions.",
        anchorObjectId: "ogle-2016-blg-1195-lb",
        referenceFrame: "galactocentric",
        cameraDistance: 1,
        cameraUnit: "kiloparsec",
        sourceIds: ["nasa-exoplanet-archive"],
        objective:
          "Describe microlensing’s reach, transience, and geometric degeneracies.",
      }),
      createChapter({
        id: "exo-multiplanet",
        title: "Seven worlds, one compact laboratory",
        eyebrow: "Multi-planet systems",
        summary:
          "Shared host properties and mutual gravity improve comparative measurements.",
        transcript:
          "The TRAPPIST-1 planets transit the same ultracool star and tug one another enough to shift transit times. Those timing variations help constrain masses and orbital relationships. Shared context makes comparison powerful, while stellar activity and interior models still limit what can be concluded about surfaces.",
        anchorObjectId: "trappist-1e",
        referenceFrame: "object-local",
        cameraDistance: 0.08,
        cameraUnit: "au",
        sourceIds: ["nasa-exoplanet-archive"],
        objective:
          "Explain how multi-planet dynamics add information beyond single transits.",
      }),
      createChapter({
        id: "exo-habitable-zones",
        title: "A zone is not a verdict",
        eyebrow: "Habitable-zone models",
        summary:
          "Received energy is one condition among many, not evidence of life.",
        transcript:
          "A habitable zone marks orbital distances where a model atmosphere might permit surface liquid water. It does not measure an ocean, atmosphere, magnetic field, geology, or biosphere. For active red-dwarf systems, stellar flares and tidal evolution add important uncertainties.",
        anchorObjectId: "trappist-1e",
        referenceFrame: "object-local",
        cameraDistance: 0.08,
        cameraUnit: "au",
        sourceIds: ["nasa-exoplanet-archive", "atlas-editorial"],
        objective:
          "Use habitable-zone language without claiming habitability or life.",
        caution:
          "The zone is a model-dependent energy-balance indicator, not an observation of surface conditions.",
      }),
      createChapter({
        id: "exo-selection-bias",
        title: "Discovery reshapes the sample",
        eyebrow: "Selection effects",
        summary:
          "The planets easiest to find are not necessarily the planets most common in nature.",
        transcript:
          "Short-period transiting planets repeat quickly; massive close-in planets tug their stars strongly; young wide giants can separate from glare; microlensing favours rare alignments. The discovered population therefore carries the fingerprint of our methods. Population studies must model completeness before generalising to all planetary systems.",
        anchorObjectId: "51-pegasi-b",
        referenceFrame: "local-interstellar",
        cameraDistance: 10,
        cameraUnit: "light-year",
        sourceIds: ["nasa-exoplanet-archive", "atlas-editorial"],
        objective:
          "Connect method sensitivity to selection bias in the discovered population.",
        knowledgeCheck: {
          prompt: "Why are short-period planets common in transit catalogues?",
          choices: [
            "They transit more often during a survey",
            "All planets naturally have short periods",
            "Transit surveys resolve their surfaces",
          ],
          correctChoiceIndex: 0,
          explanation:
            "More repeated events improve detection and validation, creating a selection effect.",
        },
      }),
    ],
  },
  {
    schemaVersion: "1.0.0",
    id: "galaxies-cosmic-web",
    version: "1.0.0",
    language: "en",
    title: "Galaxies and the Cosmic Web",
    summary:
      "Compare galaxy forms, interactions, groups, clusters, lensing, filaments, voids, and expansion without turning models into literal maps.",
    sources: tourSources([
      "openngc",
      "simbad",
      "eht-results",
      "planck-pr3",
      "atlas-editorial",
    ]),
    chapters: [
      createChapter({
        id: "galaxies-spirals",
        title: "Discs with structure",
        eyebrow: "Spiral galaxies",
        summary:
          "Andromeda’s arms trace a rotating, evolving disc rather than fixed spokes.",
        transcript:
          "Spiral galaxies combine stellar discs, gas, dust, central concentrations, and extended dark-matter halos. Their arms are patterns of enhanced density and star formation, not rigid material blades. Andromeda offers an external comparison for our reconstructed Milky Way.",
        anchorObjectId: "andromeda-galaxy",
        referenceFrame: "object-local",
        cameraDistance: 8,
        sourceIds: ["openngc", "simbad", "atlas-editorial"],
        objective:
          "Describe spiral arms as evolving patterns within galactic discs.",
      }),
      createChapter({
        id: "galaxies-ellipticals",
        title: "A giant elliptical",
        eyebrow: "Elliptical galaxies • M87",
        summary:
          "Smooth light can conceal complicated histories, hot gas, dark matter, and a powerful nucleus.",
        transcript:
          "M87 lacks the thin star-forming arms of a spiral and is dominated by an older-looking, pressure-supported stellar population. Its enormous halo sits in the Virgo Cluster environment, and its active nucleus launches a relativistic jet. The simple label elliptical does not imply a simple formation history.",
        anchorObjectId: "m87",
        referenceFrame: "object-local",
        cameraDistance: 9,
        sourceIds: ["openngc", "simbad", "eht-results"],
        objective:
          "Contrast pressure-supported elliptical structure with a rotating spiral disc.",
      }),
      createChapter({
        id: "galaxies-irregulars",
        title: "Structure without symmetry",
        eyebrow: "Irregular galaxies • LMC",
        summary:
          "Interactions and internal processes can produce galaxies that fit no clean spiral or elliptical template.",
        transcript:
          "The Large Magellanic Cloud has a bar, vigorous star formation, and an irregular outline shaped in part by interactions. Morphological categories are useful descriptions, not immutable species. A galaxy can transform as gas flows, stars form, and companions exchange energy and material.",
        anchorObjectId: "large-magellanic-cloud",
        referenceFrame: "object-local",
        cameraDistance: 12,
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Treat galaxy morphology as descriptive and evolutionary rather than rigid.",
      }),
      createChapter({
        id: "galaxies-interactions",
        title: "Gravity redraws galaxies",
        eyebrow: "Interactions • Antennae",
        summary:
          "Long tidal tails and star-forming regions reveal an ongoing merger.",
        transcript:
          "The Antennae Galaxies are caught in a prolonged gravitational interaction. Stars mostly pass without direct collision, while their collective gravity reshapes both galaxies and compresses gas into new star-forming regions. The animation condenses hundreds of millions of years into seconds.",
        anchorObjectId: "antennae-galaxies",
        referenceFrame: "object-local",
        cameraDistance: 14,
        sourceIds: ["openngc", "simbad"],
        objective:
          "Explain how galaxies can merge even though individual stars rarely collide.",
        caution:
          "The merger timeline is accelerated by many orders of magnitude and the orbit is illustrative.",
      }),
      createChapter({
        id: "galaxies-groups",
        title: "Our local association",
        eyebrow: "Galaxy groups",
        summary:
          "Groups are soft-edged dynamical systems rather than labelled containers in space.",
        transcript:
          "The Local Group contains the Milky Way, Andromeda, Triangulum, and many smaller galaxies. Distances and velocities support membership, but total mass and the outer boundary depend on a dynamical model. Dark matter dominates the inferred gravitational budget without appearing as glow.",
        anchorObjectId: "local-group",
        referenceFrame: "local-group-barycentric",
        cameraDistance: 3,
        cameraUnit: "megaparsec",
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Define a galaxy group using dynamics and acknowledge uncertain boundaries.",
      }),
      createChapter({
        id: "galaxies-clusters",
        title: "Thousands in a common potential",
        eyebrow: "Galaxy clusters • Virgo",
        summary: "Galaxies are only one visible component of a cluster’s mass.",
        transcript:
          "The Virgo Cluster includes thousands of galaxies by broad membership selections, hot gas detected in X-rays, and much more gravitating mass than its starlight alone implies. Subclusters and infalling members show that it is not one perfectly relaxed sphere.",
        anchorObjectId: "virgo-cluster",
        referenceFrame: "local-group-barycentric",
        cameraDistance: 4,
        cameraUnit: "megaparsec",
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "List galaxies, hot gas, and dark matter as major cluster components.",
      }),
      createChapter({
        id: "galaxies-lensing",
        title: "Mass bends the view",
        eyebrow: "Gravitational lensing",
        summary:
          "Distorted background light traces projected mass, including matter that does not shine.",
        transcript:
          "A foreground galaxy or cluster curves spacetime and changes the apparent shape, position, brightness, or number of background sources. Strong arcs are dramatic examples; weak lensing emerges statistically across many faint galaxies. Turning those distortions into a mass map still requires geometry and modelling assumptions.",
        anchorObjectId: "virgo-cluster",
        referenceFrame: "object-local",
        cameraDistance: 6,
        sourceIds: ["simbad", "atlas-editorial"],
        objective: "Explain how lensing can reveal total projected mass.",
        caution:
          "The lensing arcs shown are explanatory geometry, not observed Virgo arcs at these exact positions.",
      }),
      createChapter({
        id: "galaxies-filaments-voids",
        title: "A web drawn statistically",
        eyebrow: "Filaments • sheets • voids",
        summary:
          "Galaxy surveys trace a network whose exact boundaries depend on analysis.",
        transcript:
          "On scales of tens to hundreds of megaparsecs, galaxies cluster along filaments and sheets around comparatively underdense voids. The pattern grows from early density fluctuations under gravity. Our layer is a deterministic statistical illustration: no distant point becomes a named galaxy without a catalogue record.",
        anchorObjectId: "cosmic-web",
        referenceFrame: "comoving-cosmological",
        cameraDistance: 300,
        cameraUnit: "megaparsec",
        sourceIds: ["planck-pr3", "atlas-editorial"],
        objective:
          "Describe the cosmic web as a survey- and model-informed density field.",
        caution:
          "Procedural distant points are context, not individually catalogued galaxies.",
      }),
      createChapter({
        id: "galaxies-expansion",
        title: "Expansion is a large-scale relation",
        eyebrow: "Cosmic expansion",
        summary:
          "Unbound distant systems separate on average; bound systems do not simply swell.",
        transcript:
          "Galaxy redshift and distance measurements reveal an overall relation between separation and recession on large scales, with local peculiar motions superimposed. Expansion does not stretch atoms, planets, or tightly bound galaxies in the same simple way. Converting redshift into distance requires a cosmological model.",
        anchorObjectId: "observable-universe",
        referenceFrame: "comoving-cosmological",
        cameraDistance: 1000,
        cameraUnit: "megaparsec",
        sourceIds: ["planck-pr3", "atlas-editorial"],
        objective:
          "Separate Hubble-flow expansion from local motion and bound dynamics.",
        caution:
          "The expansion field is a cosmological model visualisation, not literal outward motion from a centre.",
        knowledgeCheck: {
          prompt: "What does large-scale expansion imply for the Solar System?",
          choices: [
            "Its bound orbits do not simply expand with the Hubble flow",
            "Every planet grows larger",
            "The Sun sits at the centre of expansion",
          ],
          correctChoiceIndex: 0,
          explanation:
            "Local binding dominates over the tiny large-scale expansion effect.",
        },
      }),
    ],
  },
  {
    schemaVersion: "1.0.0",
    id: "black-holes-without-myths",
    version: "1.0.0",
    language: "en",
    title: "Black Holes Without the Myths",
    summary:
      "Trace evidence for stellar, candidate intermediate, and supermassive black holes, then examine horizons, accretion, jets, lensing, and tidal disruption.",
    sources: tourSources(["simbad", "eht-results", "atlas-editorial"]),
    chapters: [
      createChapter({
        id: "blackholes-stellar",
        title: "An unseen mass in a binary",
        eyebrow: "Stellar-mass black holes",
        summary:
          "Cygnus X-1 is identified through dynamics and high-energy emission.",
        transcript:
          "The black hole in Cygnus X-1 is not seen as a black ball. Astronomers measure the visible companion’s orbit, estimate inclination and stellar mass, and observe X-rays from hot accreting gas. Together those lines of evidence support a compact object too massive for a neutron star.",
        anchorObjectId: "cygnus-x1",
        referenceFrame: "object-local",
        cameraDistance: 9,
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Describe the dynamical inference behind a stellar-mass black-hole identification.",
      }),
      createChapter({
        id: "blackholes-intermediate",
        title: "The difficult middle",
        eyebrow: "Intermediate-mass candidates",
        summary:
          "Evidence for black holes between stellar and supermassive scales remains case-dependent.",
        transcript:
          "Astronomers search for intermediate-mass black holes through cluster dynamics, accretion signatures, and gravitational-wave events. Dense systems such as Omega Centauri have produced debated claims, because unseen stellar remnants, orbital anisotropy, and modelling choices can imitate part of the signal. Candidate is the scientifically responsible label.",
        anchorObjectId: "intermediate-black-hole-candidates",
        referenceFrame: "galactocentric",
        cameraDistance: 1,
        cameraUnit: "kiloparsec",
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Explain why intermediate-mass black-hole claims often remain candidates.",
        caution:
          "This chapter represents a debated class, not a single confirmed catalogue object.",
      }),
      createChapter({
        id: "blackholes-supermassive",
        title: "A dark mass at a galactic centre",
        eyebrow: "Supermassive black holes",
        summary:
          "Sagittarius A* is constrained by stars orbiting a compact central mass.",
        transcript:
          "At the Milky Way’s centre, stellar orbits require roughly 4.3 million solar masses inside an extremely small region. M87’s central object is about a thousand times more massive again. Supermassive black holes correlate with host-galaxy properties, but their original seed pathways remain an active research problem.",
        anchorObjectId: "sagittarius-a-star",
        referenceFrame: "object-local",
        cameraDistance: 12,
        sourceIds: ["eht-results", "simbad"],
        objective:
          "Connect stellar dynamics to supermassive black-hole mass measurements.",
      }),
      createChapter({
        id: "blackholes-horizon",
        title: "A boundary, not a surface",
        eyebrow: "Event horizons",
        summary:
          "An event horizon is causal geometry and emits no light of its own.",
        transcript:
          "The event horizon marks a one-way causal boundary in the black-hole spacetime model. It is not a solid shell waiting to be photographed. The Event Horizon Telescope reconstructs bright plasma emission around a central shadow region whose angular scale agrees with predictions near M87* and Sagittarius A*.",
        anchorObjectId: "m87-star",
        referenceFrame: "object-local",
        cameraDistance: 8,
        sourceIds: ["eht-results", "atlas-editorial"],
        objective:
          "Define an event horizon and distinguish it from the observed emission ring.",
        caution:
          "The ring visual is a pedagogical approximation of radiative-transfer and lensing results.",
      }),
      createChapter({
        id: "blackholes-accretion",
        title: "The bright matter outside",
        eyebrow: "Accretion discs",
        summary:
          "Falling matter can shine intensely before crossing any horizon.",
        transcript:
          "Gas with angular momentum forms a disc or hot flow rather than dropping straight inward. Magnetic turbulence redistributes angular momentum, and dissipated energy heats the plasma. Black holes themselves do not need to emit for their surroundings to become some of the brightest sources in the sky.",
        anchorObjectId: "cygnus-x1",
        referenceFrame: "object-local",
        cameraDistance: 7,
        sourceIds: ["simbad", "atlas-editorial"],
        objective:
          "Explain why accretion, rather than a black-hole surface, produces observed light.",
        caution:
          "Disc geometry, colour, and speed are illustrative and not a live simulation of Cygnus X-1.",
      }),
      createChapter({
        id: "blackholes-jets",
        title: "Energy sent outward",
        eyebrow: "Relativistic jets • M87",
        summary:
          "Some accreting black holes power narrow outflows extending far beyond the central region.",
        transcript:
          "M87’s jet carries magnetised plasma outward at relativistic speed. The prevailing picture taps energy from the rotating system through magnetic fields near the accretion flow and black hole, but important details remain under study. A jet is not material shooting from inside the event horizon.",
        anchorObjectId: "m87",
        referenceFrame: "object-local",
        cameraDistance: 16,
        sourceIds: ["eht-results", "simbad"],
        objective:
          "Place jet launching outside the event horizon and identify magnetic fields as central.",
      }),
      createChapter({
        id: "blackholes-lensing",
        title: "Light takes curved paths",
        eyebrow: "Strong gravity • lensing",
        summary:
          "The image can contain multiple bent paths from the same emitting region.",
        transcript:
          "Near a black hole, spacetime curvature bends photon paths strongly. Light from the far side of an accretion flow can appear above or below the shadow, and motion changes brightness through relativistic beaming. The atlas uses an approximation for clarity; quantitative images require full general-relativistic radiative transfer.",
        anchorObjectId: "m87-star",
        referenceFrame: "object-local",
        cameraDistance: 9,
        sourceIds: ["eht-results", "atlas-editorial"],
        objective:
          "Explain why a black-hole image is shaped by both plasma emission and curved light paths.",
        caution:
          "The schematic scene geometry is explanatory, not a precision lensing reconstruction.",
      }),
      createChapter({
        id: "blackholes-tidal-disruption",
        title: "When tides overcome a star",
        eyebrow: "Tidal disruption events",
        summary:
          "A close stellar passage can produce a transient flare without the black hole swallowing everything nearby.",
        transcript:
          "If a star passes sufficiently close to a massive black hole, the difference in gravity across the star can tear it apart. Some debris may escape and some may circularise and accrete, producing a luminous transient. Whether disruption occurs outside the horizon depends on black-hole mass, spin, stellar structure, and trajectory.",
        anchorObjectId: "sagittarius-a-star",
        referenceFrame: "object-local",
        cameraDistance: 15,
        sourceIds: ["eht-results", "atlas-editorial"],
        objective:
          "Describe tidal disruption as a conditional close encounter, not universal suction.",
        caution:
          "No tidal disruption is shown as a current event at Sagittarius A*; this is a general model.",
      }),
      createChapter({
        id: "blackholes-inference",
        title: "What was observed—and what was inferred",
        eyebrow: "Evidence chain",
        summary:
          "Good black-hole science keeps measurements, reconstruction, and interpretation connected but distinct.",
        transcript:
          "We directly record photons, detector signals, and gravitational-wave strain. Calibrated images, spectra, orbits, and light curves are derived from them. Black-hole masses, horizons, plasma states, and spacetime parameters are inferences tested against alternatives. The strongest conclusions survive across independent methods without erasing their uncertainty.",
        anchorObjectId: "sagittarius-a-star",
        referenceFrame: "object-local",
        cameraDistance: 20,
        sourceIds: ["eht-results", "simbad", "atlas-editorial"],
        objective:
          "Separate direct detector data, derived observables, and physical inference.",
        knowledgeCheck: {
          prompt: "What did the EHT directly measure?",
          choices: [
            "Interferometric radio signals used to reconstruct horizon-scale emission",
            "A solid event-horizon surface",
            "Matter emerging from inside a black hole",
          ],
          correctChoiceIndex: 0,
          explanation:
            "The collaboration combined calibrated radio-interferometric data into image reconstructions and model tests.",
        },
      }),
    ],
  },
];

export interface TourPresentation {
  readonly tourId: string;
  readonly slug: string;
  readonly subtitle: string;
  readonly estimatedMinutes: number;
  readonly coverObjectId: string;
  readonly accent: string;
  readonly audience: "beginner" | "student" | "advanced" | "all";
  readonly screenReaderSummary: string;
  readonly capabilities: {
    readonly pause: true;
    readonly resume: true;
    readonly replay: true;
    readonly chapterNavigation: true;
    readonly manualExplorationBetweenChapters: true;
    readonly savesProgressLocally: true;
    readonly deepLinks: true;
    readonly optionalAudioNarration: false;
    readonly captions: true;
    readonly completeTranscript: true;
    readonly reducedMotionAlternative: true;
  };
}

const completeTourCapabilities = {
  pause: true,
  resume: true,
  replay: true,
  chapterNavigation: true,
  manualExplorationBetweenChapters: true,
  savesProgressLocally: true,
  deepLinks: true,
  optionalAudioNarration: false,
  captions: true,
  completeTranscript: true,
  reducedMotionAlternative: true,
} as const;

export const tourPresentation: readonly TourPresentation[] = [
  {
    tourId: "our-cosmic-address",
    slug: "our-cosmic-address",
    subtitle: "Six nested neighbourhoods, one changing ruler",
    estimatedMinutes: 6,
    coverObjectId: "earth",
    accent: "#69c8df",
    audience: "all",
    screenReaderSummary:
      "A six-chapter scale journey outward from Earth. Reduced motion replaces flights with short fades and preserves every caption.",
    capabilities: completeTourCapabilities,
  },
  {
    tourId: "solar-system-tour",
    slug: "solar-system",
    subtitle: "Worlds, belts, bubbles, and a hypothesised frontier",
    estimatedMinutes: 9,
    coverObjectId: "solar-system",
    accent: "#e2b85f",
    audience: "all",
    screenReaderSummary:
      "A nine-chapter Solar System journey with labelled scale changes, transcripts, and direct target changes in reduced-motion mode.",
    capabilities: completeTourCapabilities,
  },
  {
    tourId: "lives-of-stars",
    slug: "lives-of-stars",
    subtitle:
      "Formation, fusion, expansion, collapse, and mass-dependent outcomes",
    estimatedMinutes: 9,
    coverObjectId: "orion-nebula",
    accent: "#cf6c91",
    audience: "all",
    screenReaderSummary:
      "An eight-chapter branching account of stellar evolution with compressed timescales announced in the transcript.",
    capabilities: completeTourCapabilities,
  },
  {
    tourId: "inside-the-milky-way",
    slug: "inside-the-milky-way",
    subtitle: "A reconstruction assembled from our place in the disc",
    estimatedMinutes: 8,
    coverObjectId: "milky-way",
    accent: "#789bd1",
    audience: "student",
    screenReaderSummary:
      "An eight-chapter structural map of the Milky Way that announces observed and illustrative components.",
    capabilities: completeTourCapabilities,
  },
  {
    tourId: "worlds-beyond",
    slug: "worlds-beyond-the-solar-system",
    subtitle: "Four detection methods and the population biases they create",
    estimatedMinutes: 8,
    coverObjectId: "trappist-1e",
    accent: "#55c7af",
    audience: "student",
    screenReaderSummary:
      "An eight-chapter explanation of confirmed and candidate exoplanets, detection methods, habitable zones, and selection effects.",
    capabilities: completeTourCapabilities,
  },
  {
    tourId: "galaxies-cosmic-web",
    slug: "galaxies-and-the-cosmic-web",
    subtitle: "Forms, encounters, clusters, lensing, filaments, and expansion",
    estimatedMinutes: 9,
    coverObjectId: "andromeda-galaxy",
    accent: "#8b82d2",
    audience: "student",
    screenReaderSummary:
      "A nine-chapter journey from galaxy morphology to large-scale structure with modelled geometry identified in captions.",
    capabilities: completeTourCapabilities,
  },
  {
    tourId: "black-holes-without-myths",
    slug: "black-holes-without-the-myths",
    subtitle:
      "Evidence, horizons, accretion, jets, lensing, and tidal disruption",
    estimatedMinutes: 9,
    coverObjectId: "sagittarius-a-star",
    accent: "#d59b63",
    audience: "all",
    screenReaderSummary:
      "A nine-chapter evidence-led black-hole tour that separates detector data, derived observables, and physical inference.",
    capabilities: completeTourCapabilities,
  },
] as const;

export interface CosmosDataValidationIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * Cross-validates the editorial projection with the canonical tour validator.
 * It is safe to call in tests, an authoring preview, or a build-time data check.
 */
export function validateCosmosData(): readonly CosmosDataValidationIssue[] {
  const issues: CosmosDataValidationIssue[] = [];
  const exhibitIds = new Set<string>();
  const exhibitSlugs = new Set<string>();
  const sourceIds = new Set(dataSources.map((source) => source.id));
  const scaleIds = new Set(cosmicScaleLayers.map((scale) => scale.id));

  if (sourceIds.size !== dataSources.length) {
    issues.push({
      path: "dataSources",
      message: "Source registry IDs must be unique.",
    });
  }
  dataSources.forEach((source, index) => {
    const path = `dataSources[${index}]`;
    const urls = [
      ["url", source.url],
      ["citationUrl", source.citationUrl],
    ] as const;
    urls.forEach(([field, url]) => {
      if (
        !(
          url.startsWith("/") &&
          !url.startsWith("//") &&
          !url.includes("..")
        ) &&
        !url.startsWith("https://")
      ) {
        issues.push({
          path: `${path}.${field}`,
          message: "Source links must use HTTPS or a safe root-relative path.",
        });
      }
    });
    if (
      !source.provider.trim() ||
      !source.dataset.trim() ||
      !source.version.trim() ||
      !source.publicationOrSnapshotDate.trim() ||
      !source.licence.trim() ||
      !source.attribution.trim() ||
      !source.citation.trim()
    ) {
      issues.push({
        path,
        message:
          "Every source requires provider, dataset, version/date, rights, attribution, and citation metadata.",
      });
    }
    if (
      source.units.length === 0 ||
      source.validationRules.length === 0 ||
      source.transformations.length === 0 ||
      source.knownLimitations.length === 0
    ) {
      issues.push({
        path,
        message:
          "Every source requires units, validation, transformations, and limitations.",
      });
    }
  });

  cosmosCatalogue.forEach((exhibit, index) => {
    const path = `cosmosCatalogue[${index}]`;
    if (exhibitIds.has(exhibit.id)) {
      issues.push({
        path: `${path}.id`,
        message: `Duplicate exhibit id "${exhibit.id}".`,
      });
    }
    if (exhibitSlugs.has(exhibit.slug)) {
      issues.push({
        path: `${path}.slug`,
        message: `Duplicate exhibit slug "${exhibit.slug}".`,
      });
    }
    exhibitIds.add(exhibit.id);
    exhibitSlugs.add(exhibit.slug);

    if (!scaleIds.has(exhibit.scaleLayerId)) {
      issues.push({
        path: `${path}.scaleLayerId`,
        message: `Unknown scale layer "${exhibit.scaleLayerId}".`,
      });
    }
    if (exhibit.sourceIds.length === 0) {
      issues.push({
        path: `${path}.sourceIds`,
        message: "Every exhibit needs provenance.",
      });
    }
    exhibit.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `${path}.sourceIds`,
          message: `Unknown source "${sourceId}".`,
        });
      }
    });
    const fieldSourceIds = [
      ...(exhibit.distance ? [exhibit.distance.sourceId] : []),
      ...exhibit.facts.map((fact) => fact.sourceId),
      ...(exhibit.coordinates ? [exhibit.coordinates.sourceId] : []),
    ];
    fieldSourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `${path}.fieldSourceIds`,
          message: `Unknown field-level source "${sourceId}".`,
        });
      } else if (!exhibit.sourceIds.includes(sourceId)) {
        issues.push({
          path: `${path}.sourceIds`,
          message: `Field-level source "${sourceId}" is absent from the exhibit provenance list.`,
        });
      }
    });
    const sourceLinks = getObjectSourceLinks(exhibit);
    if (sourceLinks.length !== exhibit.sourceIds.length) {
      issues.push({
        path: `${path}.sourceIds`,
        message:
          "Every exhibit source ID must resolve to a visible source link.",
      });
    }
    if (
      exhibit.recordKind === "catalogue-backed" &&
      !sourceLinks.some((link) => link.scope === "object-record")
    ) {
      issues.push({
        path: `${path}.sourceIds`,
        message:
          "Catalogue-backed exhibits require at least one authoritative object-record link.",
      });
    }
    if (
      exhibit.recordKind === "catalogue-backed" &&
      exhibit.catalogueIds.length === 0
    ) {
      issues.push({
        path: `${path}.catalogueIds`,
        message: "Catalogue-backed exhibits require a source identifier.",
      });
    }
    if (
      exhibit.recordKind === "procedural-context" &&
      exhibit.catalogueIds.length > 0
    ) {
      issues.push({
        path: `${path}.catalogueIds`,
        message: "Procedural context must not carry scientific identifiers.",
      });
    }
  });

  cosmosCatalogue.forEach((exhibit, index) => {
    const path = `cosmosCatalogue[${index}]`;
    if (exhibit.parentId && !exhibitIds.has(exhibit.parentId)) {
      issues.push({
        path: `${path}.parentId`,
        message: `Unknown parent exhibit "${exhibit.parentId}".`,
      });
    }
    exhibit.relatedIds.forEach((relatedId) => {
      if (!exhibitIds.has(relatedId)) {
        issues.push({
          path: `${path}.relatedIds`,
          message: `Unknown related exhibit "${relatedId}".`,
        });
      }
    });
  });

  learningArticles.forEach((article, index) => {
    const path = `learningArticles[${index}]`;
    if (article.sourceIds.length === 0) {
      issues.push({
        path: `${path}.sourceIds`,
        message: "Every learning explanation requires sources.",
      });
    }
    article.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `${path}.sourceIds`,
          message: `Unknown learning source "${sourceId}".`,
        });
      }
    });
    article.explorerObjectIds.forEach((objectId) => {
      if (!exhibitIds.has(objectId)) {
        issues.push({
          path: `${path}.explorerObjectIds`,
          message: `Unknown learning object "${objectId}".`,
        });
      }
    });
  });

  const tourIds = new Set<string>();
  guidedTours.forEach((tour, index) => {
    const result = validateTourDefinition(tour);
    if (!result.valid) {
      result.issues.forEach((issue) => {
        issues.push({
          path: `guidedTours[${index}]${issue.path.slice(1)}`,
          message: `${issue.code}: ${issue.message}`,
        });
      });
    }
    if (tourIds.has(tour.id)) {
      issues.push({
        path: `guidedTours[${index}].id`,
        message: `Duplicate tour id "${tour.id}".`,
      });
    }
    tourIds.add(tour.id);
    tour.chapters.forEach((chapter, chapterIndex) => {
      if (!exhibitIds.has(chapter.waypoint.targetObjectId)) {
        issues.push({
          path: `guidedTours[${index}].chapters[${chapterIndex}].waypoint.targetObjectId`,
          message: `Unknown waypoint target "${chapter.waypoint.targetObjectId}".`,
        });
      }
      chapter.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) {
          issues.push({
            path: `guidedTours[${index}].chapters[${chapterIndex}].sourceIds`,
            message: `Unknown chapter source "${sourceId}".`,
          });
        }
      });
    });
  });

  tourPresentation.forEach((presentation, index) => {
    if (!tourIds.has(presentation.tourId)) {
      issues.push({
        path: `tourPresentation[${index}].tourId`,
        message: `Unknown tour "${presentation.tourId}".`,
      });
    }
    if (!exhibitIds.has(presentation.coverObjectId)) {
      issues.push({
        path: `tourPresentation[${index}].coverObjectId`,
        message: `Unknown cover exhibit "${presentation.coverObjectId}".`,
      });
    }
  });

  return issues;
}

export const cosmosDataValidationIssues = validateCosmosData();
