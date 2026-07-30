import type { DisplayUnit, ScientificDisplayValue } from "./cosmos-data";

export type ComparisonDimension =
  | "length"
  | "mass"
  | "duration"
  | "temperature"
  | "speed"
  | "angle"
  | "magnitude"
  | "redshift"
  | "dimensionless";

interface UnitDefinition {
  readonly dimension: ComparisonDimension;
  readonly canonicalUnit: string;
  readonly multiplier: number;
  readonly ratioMeaningful: boolean;
}

export interface CanonicalComparisonValue {
  readonly dimension: ComparisonDimension;
  readonly canonicalUnit: string;
  readonly value: number;
  readonly interval?: readonly [number, number];
  readonly usedIntervalMidpoint: boolean;
  readonly ratioMeaningful: boolean;
}

export type ComparisonRowAnalysis =
  | {
      readonly kind: "comparable";
      readonly dimension: ComparisonDimension;
      readonly canonicalUnit: string;
      readonly minimumPositive: number;
      readonly maximum: number;
    }
  | {
      readonly kind: "incompatible";
      readonly dimensions: readonly ComparisonDimension[];
    }
  | {
      readonly kind: "non-ratio";
      readonly dimension: ComparisonDimension;
    }
  | {
      readonly kind: "insufficient";
      readonly dimension?: ComparisonDimension;
    };

const METRES_PER_AU = 149_597_870_700;
const METRES_PER_LIGHT_YEAR = 9.460_730_472_580_8e15;
const METRES_PER_PARSEC = 3.085_677_581_491_367e16;
const KILOGRAMS_PER_EARTH_MASS = 5.9722e24;
const KILOGRAMS_PER_JUPITER_MASS = 1.89813e27;
const KILOGRAMS_PER_SOLAR_MASS = 1.98847e30;
const METRES_PER_EARTH_RADIUS = 6_371_000;
const METRES_PER_SOLAR_RADIUS = 695_700_000;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_JULIAN_YEAR = 31_557_600;

const unitDefinitions: Readonly<Record<DisplayUnit, UnitDefinition>> = {
  km: {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: 1_000,
    ratioMeaningful: true,
  },
  au: {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_AU,
    ratioMeaningful: true,
  },
  "light-year": {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_LIGHT_YEAR,
    ratioMeaningful: true,
  },
  parsec: {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_PARSEC,
    ratioMeaningful: true,
  },
  kiloparsec: {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_PARSEC * 1_000,
    ratioMeaningful: true,
  },
  megaparsec: {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_PARSEC * 1_000_000,
    ratioMeaningful: true,
  },
  day: {
    dimension: "duration",
    canonicalUnit: "s",
    multiplier: SECONDS_PER_DAY,
    ratioMeaningful: true,
  },
  second: {
    dimension: "duration",
    canonicalUnit: "s",
    multiplier: 1,
    ratioMeaningful: true,
  },
  year: {
    dimension: "duration",
    canonicalUnit: "s",
    multiplier: SECONDS_PER_JULIAN_YEAR,
    ratioMeaningful: true,
  },
  kelvin: {
    dimension: "temperature",
    canonicalUnit: "K",
    multiplier: 1,
    ratioMeaningful: true,
  },
  "earth-mass": {
    dimension: "mass",
    canonicalUnit: "kg",
    multiplier: KILOGRAMS_PER_EARTH_MASS,
    ratioMeaningful: true,
  },
  "jupiter-mass": {
    dimension: "mass",
    canonicalUnit: "kg",
    multiplier: KILOGRAMS_PER_JUPITER_MASS,
    ratioMeaningful: true,
  },
  "solar-mass": {
    dimension: "mass",
    canonicalUnit: "kg",
    multiplier: KILOGRAMS_PER_SOLAR_MASS,
    ratioMeaningful: true,
  },
  "earth-radius": {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_EARTH_RADIUS,
    ratioMeaningful: true,
  },
  "solar-radius": {
    dimension: "length",
    canonicalUnit: "m",
    multiplier: METRES_PER_SOLAR_RADIUS,
    ratioMeaningful: true,
  },
  "apparent-magnitude": {
    dimension: "magnitude",
    canonicalUnit: "mag",
    multiplier: 1,
    ratioMeaningful: false,
  },
  "absolute-magnitude": {
    dimension: "magnitude",
    canonicalUnit: "mag",
    multiplier: 1,
    ratioMeaningful: false,
  },
  degree: {
    dimension: "angle",
    canonicalUnit: "rad",
    multiplier: Math.PI / 180,
    ratioMeaningful: true,
  },
  "kilometre-per-second": {
    dimension: "speed",
    canonicalUnit: "m/s",
    multiplier: 1_000,
    ratioMeaningful: true,
  },
  redshift: {
    dimension: "redshift",
    canonicalUnit: "redshift",
    multiplier: 1,
    ratioMeaningful: false,
  },
  "billion-year": {
    dimension: "duration",
    canonicalUnit: "s",
    multiplier: SECONDS_PER_JULIAN_YEAR * 1_000_000_000,
    ratioMeaningful: true,
  },
  dimensionless: {
    dimension: "dimensionless",
    canonicalUnit: "dimensionless",
    multiplier: 1,
    ratioMeaningful: false,
  },
};

/**
 * Converts a sourced display value to one canonical unit per dimension. The
 * optional multiplier is used for explicit semantic transforms, such as
 * comparing a sourced radius as a diameter (2 × radius).
 */
export function canonicaliseComparisonValue(
  fact: ScientificDisplayValue | undefined,
  valueMultiplier = 1,
): CanonicalComparisonValue | undefined {
  if (!fact || fact.value === null || !Number.isFinite(valueMultiplier)) {
    return undefined;
  }

  const definition = unitDefinitions[fact.unit];
  const sourceInterval =
    typeof fact.value === "number"
      ? undefined
      : ([Math.min(...fact.value), Math.max(...fact.value)] as const);
  const sourceValue =
    typeof fact.value === "number"
      ? fact.value
      : (fact.value[0] + fact.value[1]) / 2;
  const conversion = definition.multiplier * valueMultiplier;
  const value = sourceValue * conversion;

  if (!Number.isFinite(value)) return undefined;

  return {
    dimension: definition.dimension,
    canonicalUnit: definition.canonicalUnit,
    value,
    ...(sourceInterval
      ? {
          interval: [
            sourceInterval[0] * conversion,
            sourceInterval[1] * conversion,
          ] as const,
        }
      : {}),
    usedIntervalMidpoint: sourceInterval !== undefined,
    ratioMeaningful: definition.ratioMeaningful,
  };
}

/**
 * A row is plotted only when every numeric value has the same physical
 * dimension and at least two compatible measurements are present.
 */
export function analyseComparisonRow(
  values: readonly (CanonicalComparisonValue | undefined)[],
): ComparisonRowAnalysis {
  const available = values.filter(
    (value): value is CanonicalComparisonValue => value !== undefined,
  );
  const dimensions = [...new Set(available.map((value) => value.dimension))];

  if (dimensions.length > 1) {
    return { kind: "incompatible", dimensions };
  }
  if (available.length < 2) {
    return {
      kind: "insufficient",
      ...(dimensions[0] ? { dimension: dimensions[0] } : {}),
    };
  }
  if (!available.every((value) => value.ratioMeaningful)) {
    return { kind: "non-ratio", dimension: dimensions[0] };
  }

  const maximum = Math.max(...available.map((value) => value.value));
  const positive = available
    .map((value) => value.value)
    .filter((value) => value > 0);
  if (!(maximum > 0) || positive.length === 0) {
    return { kind: "insufficient", dimension: dimensions[0] };
  }

  return {
    kind: "comparable",
    dimension: dimensions[0],
    canonicalUnit: available[0].canonicalUnit,
    minimumPositive: Math.min(...positive),
    maximum,
  };
}

export function linearComparisonFraction(
  value: CanonicalComparisonValue | undefined,
  analysis: ComparisonRowAnalysis,
): number | undefined {
  if (
    !value ||
    analysis.kind !== "comparable" ||
    value.dimension !== analysis.dimension
  ) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value.value / analysis.maximum));
}

/**
 * Unit-invariant logarithmic position within a compatible row. A zero value is
 * placed at zero; positive values are positioned between the row's smallest
 * and largest positive measurement.
 */
export function logarithmicComparisonFraction(
  value: CanonicalComparisonValue | undefined,
  analysis: ComparisonRowAnalysis,
): number | undefined {
  if (
    !value ||
    analysis.kind !== "comparable" ||
    value.dimension !== analysis.dimension
  ) {
    return undefined;
  }
  if (value.value <= 0) return 0;
  if (analysis.maximum === analysis.minimumPositive) return 1;

  return Math.max(
    0,
    Math.min(
      1,
      Math.log(value.value / analysis.minimumPositive) /
        Math.log(analysis.maximum / analysis.minimumPositive),
    ),
  );
}

/** Physical icon diameter is directly proportional to physical diameter. */
export function linearDiameterScale(
  diameter: number | undefined,
  maximumDiameter: number,
): number {
  if (
    diameter === undefined ||
    !Number.isFinite(diameter) ||
    diameter <= 0 ||
    !Number.isFinite(maximumDiameter) ||
    maximumDiameter <= 0
  ) {
    return 0;
  }
  return Math.min(1, diameter / maximumDiameter);
}
