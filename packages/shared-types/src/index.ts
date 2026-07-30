/**
 * Domain primitives shared by catalogue, coordinate, rendering, and tour code.
 *
 * Quantities are deliberately represented as `{ value, unit }` rather than
 * naked numbers. This keeps public interfaces explicit and makes accidental
 * parsec/light-year or degree/radian mixing visible at module boundaries.
 */

export type DistanceUnit = "km" | "au" | "ly" | "pc" | "kpc" | "Mpc";
export type AngleUnit =
  "rad" | "deg" | "hour-angle" | "arcmin" | "arcsec" | "mas";
export type TimeUnit = "s" | "day" | "Julian-year";
export type VelocityUnit = "km/s" | "mas/Julian-year";
export type ExpansionRateUnit = "km/s/Mpc";
export type MassUnit = "kg" | "earth-mass" | "solar-mass";
export type RadiusUnit = "km" | "earth-radius" | "solar-radius";
export type TemperatureUnit = "K";
export type PhotometryUnit = "mag";
export type DimensionlessUnit = "dimensionless" | "redshift";

export type Unit =
  | DistanceUnit
  | AngleUnit
  | TimeUnit
  | VelocityUnit
  | ExpansionRateUnit
  | MassUnit
  | RadiusUnit
  | TemperatureUnit
  | PhotometryUnit
  | DimensionlessUnit;

export interface Quantity<U extends Unit = Unit> {
  readonly value: number;
  readonly unit: U;
}

export type ConfidenceLevel =
  | "1-sigma"
  | "2-sigma"
  | "3-sigma"
  | "68-percent"
  | "90-percent"
  | "95-percent";

export type MeasurementUncertainty<U extends Unit = Unit> =
  | {
      readonly kind: "symmetric";
      readonly plusMinus: Quantity<U>;
      readonly confidence: ConfidenceLevel;
    }
  | {
      readonly kind: "asymmetric";
      readonly lower: Quantity<U>;
      readonly upper: Quantity<U>;
      readonly confidence: ConfidenceLevel;
    }
  | {
      readonly kind: "interval";
      readonly minimum: Quantity<U>;
      readonly maximum: Quantity<U>;
      readonly confidence?: ConfidenceLevel;
    };

export type EvidenceStatus = "observed" | "derived" | "estimated" | "modelled";

export interface Measurement<U extends Unit = Unit> {
  readonly quantity: Quantity<U>;
  readonly status: EvidenceStatus;
  readonly uncertainty?: MeasurementUncertainty<U>;
  readonly method?: string;
  readonly caveat?: string;
}

export interface JulianEpoch {
  readonly value: number;
  readonly scale: "Julian-year";
}

export type EquatorialReferenceFrame = "ICRS" | "FK5";
export type CoordinateOrigin =
  "observer" | "solar-system-barycentre" | "galactic-centre";

export interface EquatorialCoordinate {
  readonly kind: "equatorial";
  readonly rightAscension: Quantity<"deg">;
  readonly declination: Quantity<"deg">;
  readonly frame: EquatorialReferenceFrame;
  readonly origin: CoordinateOrigin;
  readonly epoch: JulianEpoch;
}

export interface GalacticCoordinate {
  readonly kind: "galactic";
  readonly longitude: Quantity<"deg">;
  readonly latitude: Quantity<"deg">;
  readonly frame: "IAU-1958-J2000-realisation";
  readonly origin: CoordinateOrigin;
  readonly epoch: JulianEpoch;
}

export interface EclipticCoordinate {
  readonly kind: "ecliptic";
  readonly longitude: Quantity<"deg">;
  readonly latitude: Quantity<"deg">;
  readonly frame: "mean-ecliptic";
  readonly origin: CoordinateOrigin;
  readonly epoch: JulianEpoch;
}

export interface CartesianCoordinate<U extends DistanceUnit = DistanceUnit> {
  readonly kind: "cartesian";
  readonly x: Quantity<U>;
  readonly y: Quantity<U>;
  readonly z: Quantity<U>;
  readonly frame: EquatorialReferenceFrame | "galactic";
  readonly origin: CoordinateOrigin;
  readonly epoch: JulianEpoch;
}

export type SkyCoordinate =
  EquatorialCoordinate | GalacticCoordinate | EclipticCoordinate;

export interface CatalogueIdentifier {
  readonly catalogue: string;
  readonly value: string;
  readonly canonical: boolean;
}

export type ObjectType =
  | "star"
  | "planet"
  | "dwarf-planet"
  | "moon"
  | "asteroid"
  | "comet"
  | "exoplanet"
  | "nebula"
  | "open-cluster"
  | "globular-cluster"
  | "supernova-remnant"
  | "pulsar"
  | "magnetar"
  | "black-hole-candidate"
  | "galaxy"
  | "galaxy-group"
  | "galaxy-cluster"
  | "large-scale-structure"
  | "spacecraft"
  | "other";

export interface DatasetProvenance {
  readonly provider: string;
  readonly dataset: string;
  readonly datasetVersion: string;
  readonly recordIdentifier: string;
  readonly accessedAt: string;
  readonly publicationDate?: string;
  readonly sourceUrl: string;
  readonly citation: string;
  readonly licence: string;
  readonly attribution: string;
  readonly transformations: readonly string[];
  readonly coordinateSystem?: string;
  readonly knownLimitations: readonly string[];
}

export interface CatalogueObjectProperties {
  readonly distance?: Measurement<DistanceUnit>;
  readonly parallax?: Measurement<"mas">;
  readonly properMotionRightAscension?: Measurement<"mas/Julian-year">;
  readonly properMotionDeclination?: Measurement<"mas/Julian-year">;
  readonly radialVelocity?: Measurement<"km/s">;
  readonly apparentMagnitude?: PhotometricMeasurement;
  readonly absoluteMagnitude?: PhotometricMeasurement;
  readonly redshift?: Measurement<"redshift">;
  readonly mass?: Measurement<MassUnit>;
  readonly radius?: Measurement<RadiusUnit>;
  readonly temperature?: Measurement<"K">;
  readonly age?: Measurement<"Julian-year">;
  readonly spectralType?: string;
}

export interface PhotometricMeasurement extends Measurement<"mag"> {
  /** Photometric passband (for example V, B, G, or bolometric). */
  readonly passband: string;
}

export interface CatalogueObject {
  readonly id: string;
  readonly dataOrigin: "catalogue";
  readonly names: {
    readonly primary: string;
    readonly common: readonly string[];
  };
  readonly objectType: ObjectType;
  /** The source catalogue's original, unmodified classification code. */
  readonly sourceClassification?: string;
  readonly constellation?: {
    readonly abbreviation: string;
    readonly name: string;
  };
  readonly summary?: string;
  readonly catalogueIdentifiers: readonly CatalogueIdentifier[];
  readonly coordinate?: SkyCoordinate;
  readonly properties: CatalogueObjectProperties;
  readonly provenance: readonly DatasetProvenance[];
}

/**
 * Procedural batches intentionally contain no per-point names or catalogue
 * identifiers. A point is visual context, not a discoverable scientific object.
 */
export interface ProceduralContextPoint {
  readonly direction: {
    readonly x: Quantity<"dimensionless">;
    readonly y: Quantity<"dimensionless">;
    readonly z: Quantity<"dimensionless">;
  };
  readonly relativeIntensity: Quantity<"dimensionless">;
  readonly colourTemperature?: Measurement<"K">;
}

export interface ProceduralContextBatch {
  readonly batchId: string;
  readonly dataOrigin: "procedural";
  readonly kind: "background-stars" | "dust" | "gas" | "distant-structure";
  readonly generator: {
    readonly name: string;
    readonly version: string;
    readonly seed: string;
    readonly distribution: string;
  };
  readonly label: string;
  readonly disclaimer: string;
  readonly layerCanBeDisabled: true;
  readonly points: readonly ProceduralContextPoint[];
}

export type AtlasObject = CatalogueObject;

export interface DatasetManifest {
  readonly schemaVersion: string;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly generatedAt: string;
  readonly pipelineVersion: string;
  readonly recordsAccepted: number;
  readonly recordsRejected: number;
  readonly sha256: string;
  readonly provenance: readonly DatasetProvenance[];
}
