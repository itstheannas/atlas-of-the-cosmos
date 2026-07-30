import type { DistanceUnit, Quantity } from "../../shared-types/src/index.ts";
import { convertDistance } from "../../coordinate-engine/src/units.ts";

export type SpatialScaleBand =
  | "planetary"
  | "solar-system"
  | "interstellar"
  | "galactic"
  | "intergalactic"
  | "cosmological";

const ONE_LIGHT_YEAR_KM = convertDistance({ value: 1, unit: "ly" }, "km").value;
const ONE_KILOPARSEC_KM = convertDistance(
  { value: 1, unit: "kpc" },
  "km",
).value;
const ONE_MEGAPARSEC_KM = convertDistance(
  { value: 1, unit: "Mpc" },
  "km",
).value;

/**
 * Rendering bands are engineering thresholds, not claims about natural
 * boundaries. They select local frames/representations at useful scales.
 */
export function classifySpatialScale(
  distance: Quantity<DistanceUnit>,
): SpatialScaleBand {
  const kilometres = convertDistance(distance, "km").value;
  if (!Number.isFinite(kilometres) || kilometres < 0) {
    throw new RangeError("Scale distance must be finite and non-negative");
  }
  if (kilometres < 10_000_000) return "planetary";
  if (kilometres < ONE_LIGHT_YEAR_KM) return "solar-system";
  if (kilometres < ONE_KILOPARSEC_KM) return "interstellar";
  if (kilometres < ONE_MEGAPARSEC_KM) return "galactic";
  if (kilometres < ONE_MEGAPARSEC_KM * 1_000) return "intergalactic";
  return "cosmological";
}

/**
 * Maps non-negative physical distance to a stable display-space scalar.
 * The reference distance controls the linear region around the origin.
 */
export function logarithmicDisplayRadius(
  distance: Quantity<DistanceUnit>,
  referenceDistance: Quantity<DistanceUnit>,
): Quantity<"dimensionless"> {
  const distanceKm = convertDistance(distance, "km").value;
  const referenceKm = convertDistance(referenceDistance, "km").value;
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError("Distance must be finite and non-negative");
  }
  if (!Number.isFinite(referenceKm) || referenceKm <= 0) {
    throw new RangeError("Reference distance must be finite and positive");
  }
  return {
    value: Math.log10(1 + distanceKm / referenceKm),
    unit: "dimensionless",
  };
}
