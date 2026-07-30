import type {
  DistanceUnit,
  Measurement,
  PhotometricMeasurement,
  Quantity,
} from "../../shared-types/src/index.ts";
import { convertDistance } from "../../coordinate-engine/src/units.ts";

function requirePositiveDistance(distance: Quantity<DistanceUnit>): number {
  const parsecs = convertDistance(distance, "pc").value;
  if (!Number.isFinite(parsecs) || parsecs <= 0) {
    throw new RangeError(
      "Photometric distance must be finite and greater than zero",
    );
  }
  return parsecs;
}

/**
 * m - M = 5 log10(d/10 pc) + A, where A is extinction in magnitudes.
 */
export function distanceModulus(
  distance: Quantity<DistanceUnit>,
  extinction: Quantity<"mag"> = { value: 0, unit: "mag" },
): Quantity<"mag"> {
  if (!Number.isFinite(extinction.value)) {
    throw new RangeError("Extinction must be finite");
  }
  const parsecs = requirePositiveDistance(distance);
  return {
    value: 5 * Math.log10(parsecs / 10) + extinction.value,
    unit: "mag",
  };
}

export function absoluteMagnitudeFromApparent(
  apparentMagnitude: PhotometricMeasurement,
  distance: Measurement<DistanceUnit>,
  extinction: Measurement<"mag"> = {
    quantity: { value: 0, unit: "mag" },
    status: "modelled",
    method: "No extinction correction supplied; A=0 assumed.",
  },
): PhotometricMeasurement {
  const modulus = distanceModulus(distance.quantity, extinction.quantity);
  const result: PhotometricMeasurement = {
    quantity: {
      value: apparentMagnitude.quantity.value - modulus.value,
      unit: "mag",
    },
    passband: apparentMagnitude.passband,
    status: "derived",
    method: "M = m - 5 log10(d/10 pc) - A",
    caveat:
      extinction.method === "No extinction correction supplied; A=0 assumed."
        ? "Interstellar extinction is uncorrected and may bias the result."
        : undefined,
  };

  const apparentSigma =
    apparentMagnitude.uncertainty?.kind === "symmetric"
      ? apparentMagnitude.uncertainty.plusMinus.value
      : undefined;
  const distanceSigma =
    distance.uncertainty?.kind === "symmetric"
      ? convertDistance(distance.uncertainty.plusMinus, "pc").value
      : undefined;
  const extinctionSigma =
    extinction.uncertainty?.kind === "symmetric"
      ? extinction.uncertainty.plusMinus.value
      : undefined;
  if (
    apparentSigma !== undefined ||
    distanceSigma !== undefined ||
    extinctionSigma !== undefined
  ) {
    const distancePc = convertDistance(distance.quantity, "pc").value;
    const sigmaFromDistance =
      distanceSigma === undefined
        ? 0
        : (5 / Math.LN10) * (Math.abs(distanceSigma) / distancePc);
    return {
      ...result,
      uncertainty: {
        kind: "symmetric",
        plusMinus: {
          value: Math.hypot(
            apparentSigma ?? 0,
            sigmaFromDistance,
            extinctionSigma ?? 0,
          ),
          unit: "mag",
        },
        confidence: "1-sigma",
      },
    };
  }
  return result;
}

export function apparentMagnitudeFromAbsolute(
  absoluteMagnitude: Quantity<"mag">,
  distance: Quantity<DistanceUnit>,
  extinction: Quantity<"mag"> = { value: 0, unit: "mag" },
): Quantity<"mag"> {
  return {
    value:
      absoluteMagnitude.value + distanceModulus(distance, extinction).value,
    unit: "mag",
  };
}

/**
 * Flux ratio F1/F2 for two apparent magnitudes in the same passband.
 */
export function fluxRatioFromMagnitudes(
  first: Quantity<"mag">,
  second: Quantity<"mag">,
): Quantity<"dimensionless"> {
  if (!Number.isFinite(first.value) || !Number.isFinite(second.value)) {
    throw new RangeError("Magnitudes must be finite");
  }
  return {
    value: 10 ** (-0.4 * (first.value - second.value)),
    unit: "dimensionless",
  };
}
