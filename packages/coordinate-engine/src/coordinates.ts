import type {
  CartesianCoordinate,
  DistanceUnit,
  EclipticCoordinate,
  EquatorialCoordinate,
  GalacticCoordinate,
  Measurement,
  Quantity,
} from "../../shared-types/src/index.ts";
import {
  clampDeclinationDegrees,
  convertAngle,
  normalizeDegrees,
} from "./units.ts";

const J2000_EQUATORIAL_TO_GALACTIC = [
  [-0.0548755604162154, -0.873437090234885, -0.4838350155487132],
  [0.4941094278755837, -0.4448296299600112, 0.7469822444972189],
  [-0.8676661490190047, -0.1980763734312015, 0.4559837761750669],
] as const;

const J2000_MEAN_OBLIQUITY_DEGREES = 23.439291111;

type Vector3 = readonly [number, number, number];

function multiplyMatrixVector(
  matrix: readonly (readonly [number, number, number])[],
  vector: Vector3,
): Vector3 {
  return [
    matrix[0][0] * vector[0] +
      matrix[0][1] * vector[1] +
      matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] +
      matrix[1][1] * vector[1] +
      matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] +
      matrix[2][1] * vector[1] +
      matrix[2][2] * vector[2],
  ];
}

function transpose(
  matrix: readonly (readonly [number, number, number])[],
): readonly (readonly [number, number, number])[] {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]],
  ];
}

function unitVectorFromEquatorial(coordinate: EquatorialCoordinate): Vector3 {
  const ra = convertAngle(coordinate.rightAscension, "rad").value;
  const dec = convertAngle(coordinate.declination, "rad").value;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

export function makeIcrsCoordinate(
  rightAscension: Quantity<"deg">,
  declination: Quantity<"deg">,
  epochValue = 2000,
  origin: EquatorialCoordinate["origin"] = "solar-system-barycentre",
): EquatorialCoordinate {
  if (!Number.isFinite(epochValue)) {
    throw new RangeError("Epoch must be finite");
  }
  return {
    kind: "equatorial",
    rightAscension: {
      value: normalizeDegrees(rightAscension.value),
      unit: "deg",
    },
    declination: {
      value: clampDeclinationDegrees(declination.value),
      unit: "deg",
    },
    frame: "ICRS",
    origin,
    epoch: { value: epochValue, scale: "Julian-year" },
  };
}

/**
 * Converts an ICRS/FK5 J2000 direction to the IAU galactic system using the
 * standard J2000 rotation matrix used by SOFA/Astropy. Precession is outside
 * this function's scope; callers must first transform non-J2000 coordinates.
 * Reference implementation family: https://www.iausofa.org/cookbooks
 */
export function equatorialToGalactic(
  coordinate: EquatorialCoordinate,
): GalacticCoordinate {
  if (Math.abs(coordinate.epoch.value - 2000) > 1e-9) {
    throw new RangeError(
      "Equatorial-to-galactic conversion requires a J2000.0 coordinate; precess it first",
    );
  }
  const [x, y, z] = multiplyMatrixVector(
    J2000_EQUATORIAL_TO_GALACTIC,
    unitVectorFromEquatorial(coordinate),
  );
  return {
    kind: "galactic",
    longitude: {
      value: normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI),
      unit: "deg",
    },
    latitude: {
      value: (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI,
      unit: "deg",
    },
    frame: "IAU-1958-J2000-realisation",
    origin: coordinate.origin,
    epoch: { value: 2000, scale: "Julian-year" },
  };
}

export function galacticToEquatorial(
  coordinate: GalacticCoordinate,
): EquatorialCoordinate {
  if (Math.abs(coordinate.epoch.value - 2000) > 1e-9) {
    throw new RangeError(
      "Galactic-to-equatorial conversion requires the J2000.0 realisation",
    );
  }
  const longitude = convertAngle(coordinate.longitude, "rad").value;
  const latitude = convertAngle(coordinate.latitude, "rad").value;
  const cosLatitude = Math.cos(latitude);
  const galacticVector: Vector3 = [
    cosLatitude * Math.cos(longitude),
    cosLatitude * Math.sin(longitude),
    Math.sin(latitude),
  ];
  const [x, y, z] = multiplyMatrixVector(
    transpose(J2000_EQUATORIAL_TO_GALACTIC),
    galacticVector,
  );

  return makeIcrsCoordinate(
    {
      value: normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI),
      unit: "deg",
    },
    {
      value: (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI,
      unit: "deg",
    },
    2000,
    coordinate.origin,
  );
}

/**
 * Rotate an equatorial J2000 direction into the mean ecliptic of J2000. This
 * is not an apparent-of-date transform and deliberately refuses other epochs.
 */
export function equatorialToEcliptic(
  coordinate: EquatorialCoordinate,
): EclipticCoordinate {
  if (Math.abs(coordinate.epoch.value - 2000) > 1e-9) {
    throw new RangeError(
      "Equatorial-to-ecliptic conversion requires J2000.0; precess the coordinate first.",
    );
  }
  const [x, y, z] = unitVectorFromEquatorial(coordinate);
  const obliquity = (J2000_MEAN_OBLIQUITY_DEGREES * Math.PI) / 180;
  const eclipticY = Math.cos(obliquity) * y + Math.sin(obliquity) * z;
  const eclipticZ = -Math.sin(obliquity) * y + Math.cos(obliquity) * z;
  return {
    kind: "ecliptic",
    longitude: {
      value: normalizeDegrees((Math.atan2(eclipticY, x) * 180) / Math.PI),
      unit: "deg",
    },
    latitude: {
      value: (Math.asin(Math.max(-1, Math.min(1, eclipticZ))) * 180) / Math.PI,
      unit: "deg",
    },
    frame: "mean-ecliptic",
    origin: coordinate.origin,
    epoch: { value: 2000, scale: "Julian-year" },
  };
}

export function eclipticToEquatorial(
  coordinate: EclipticCoordinate,
): EquatorialCoordinate {
  if (Math.abs(coordinate.epoch.value - 2000) > 1e-9) {
    throw new RangeError(
      "Ecliptic-to-equatorial conversion requires the mean ecliptic of J2000.0.",
    );
  }
  const longitude = convertAngle(coordinate.longitude, "rad").value;
  const latitude = convertAngle(coordinate.latitude, "rad").value;
  const cosLatitude = Math.cos(latitude);
  const x = cosLatitude * Math.cos(longitude);
  const eclipticY = cosLatitude * Math.sin(longitude);
  const eclipticZ = Math.sin(latitude);
  const obliquity = (J2000_MEAN_OBLIQUITY_DEGREES * Math.PI) / 180;
  const y = Math.cos(obliquity) * eclipticY - Math.sin(obliquity) * eclipticZ;
  const z = Math.sin(obliquity) * eclipticY + Math.cos(obliquity) * eclipticZ;
  return makeIcrsCoordinate(
    {
      value: normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI),
      unit: "deg",
    },
    {
      value: (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI,
      unit: "deg",
    },
    2000,
    coordinate.origin,
  );
}

export function equatorialToCartesian<U extends DistanceUnit>(
  coordinate: EquatorialCoordinate,
  distance: Quantity<U>,
  origin: CartesianCoordinate<U>["origin"] = "observer",
): CartesianCoordinate<U> {
  if (!Number.isFinite(distance.value) || distance.value < 0) {
    throw new RangeError("Distance must be finite and non-negative");
  }
  const [x, y, z] = unitVectorFromEquatorial(coordinate);
  return {
    kind: "cartesian",
    x: { value: x * distance.value, unit: distance.unit },
    y: { value: y * distance.value, unit: distance.unit },
    z: { value: z * distance.value, unit: distance.unit },
    frame: coordinate.frame,
    origin,
    epoch: coordinate.epoch,
  };
}

export function cartesianToEquatorial<U extends DistanceUnit>(
  coordinate: CartesianCoordinate<U>,
): {
  readonly coordinate: EquatorialCoordinate;
  readonly distance: Quantity<U>;
} {
  if (
    coordinate.x.unit !== coordinate.y.unit ||
    coordinate.x.unit !== coordinate.z.unit
  ) {
    throw new TypeError("Cartesian axes must use the same distance unit");
  }
  const distance = Math.hypot(
    coordinate.x.value,
    coordinate.y.value,
    coordinate.z.value,
  );
  if (!Number.isFinite(distance) || distance === 0) {
    throw new RangeError("A finite, non-zero vector is required");
  }
  const sourceVector: Vector3 = [
    coordinate.x.value,
    coordinate.y.value,
    coordinate.z.value,
  ];
  const [equatorialX, equatorialY, equatorialZ] =
    coordinate.frame === "galactic"
      ? multiplyMatrixVector(
          transpose(J2000_EQUATORIAL_TO_GALACTIC),
          sourceVector,
        )
      : sourceVector;
  const rightAscension = normalizeDegrees(
    (Math.atan2(equatorialY, equatorialX) * 180) / Math.PI,
  );
  const declination = (Math.asin(equatorialZ / distance) * 180) / Math.PI;
  return {
    coordinate: {
      kind: "equatorial",
      rightAscension: { value: rightAscension, unit: "deg" },
      declination: { value: declination, unit: "deg" },
      frame: coordinate.frame === "galactic" ? "ICRS" : coordinate.frame,
      origin: coordinate.origin,
      epoch: coordinate.epoch,
    },
    distance: { value: distance, unit: coordinate.x.unit },
  };
}

export type ParallaxDistanceResult =
  | {
      readonly kind: "distance";
      readonly measurement: Measurement<"pc">;
      readonly fractionalParallaxUncertainty?: number;
      readonly warning?: string;
    }
  | {
      readonly kind: "unavailable";
      readonly reason:
        | "missing-parallax"
        | "invalid-parallax-unit"
        | "non-finite-parallax"
        | "non-positive-parallax"
        | "invalid-parallax-uncertainty"
        | "low-signal-parallax";
      readonly explanation: string;
    };

type ParallaxUncertaintyPropagation =
  | {
      readonly valid: true;
      readonly fractionalUncertainty?: number;
      readonly distanceUncertainty?: Measurement<"pc">["uncertainty"];
    }
  | {
      readonly valid: false;
      readonly explanation: string;
    };

function propagateParallaxUncertainty(
  parallax: Measurement<"mas">,
  distance: number,
): ParallaxUncertaintyPropagation {
  const uncertainty = parallax.uncertainty;
  if (!uncertainty) return { valid: true };
  const parallaxValue = parallax.quantity.value;

  if (uncertainty.kind === "symmetric") {
    const sigma = uncertainty.plusMinus.value;
    if (
      uncertainty.plusMinus.unit !== "mas" ||
      !Number.isFinite(sigma) ||
      sigma < 0 ||
      parallaxValue - sigma <= 0
    ) {
      return {
        valid: false,
        explanation:
          "Symmetric parallax uncertainty must be finite, non-negative, in mas, and must not cross zero.",
      };
    }
    return {
      valid: true,
      fractionalUncertainty: sigma / parallaxValue,
      distanceUncertainty: {
        kind: "asymmetric",
        lower: {
          value: distance - 1_000 / (parallaxValue + sigma),
          unit: "pc",
        },
        upper: {
          value: 1_000 / (parallaxValue - sigma) - distance,
          unit: "pc",
        },
        confidence: uncertainty.confidence,
      },
    };
  }

  if (uncertainty.kind === "asymmetric") {
    const lower = uncertainty.lower.value;
    const upper = uncertainty.upper.value;
    if (
      uncertainty.lower.unit !== "mas" ||
      uncertainty.upper.unit !== "mas" ||
      !Number.isFinite(lower) ||
      !Number.isFinite(upper) ||
      lower < 0 ||
      upper < 0 ||
      parallaxValue - lower <= 0
    ) {
      return {
        valid: false,
        explanation:
          "Asymmetric parallax uncertainty offsets must be finite, non-negative, in mas, and the lower parallax bound must remain positive.",
      };
    }
    return {
      valid: true,
      fractionalUncertainty: Math.max(lower, upper) / parallaxValue,
      distanceUncertainty: {
        kind: "asymmetric",
        lower: {
          value: distance - 1_000 / (parallaxValue + upper),
          unit: "pc",
        },
        upper: {
          value: 1_000 / (parallaxValue - lower) - distance,
          unit: "pc",
        },
        confidence: uncertainty.confidence,
      },
    };
  }

  const minimumParallax = uncertainty.minimum.value;
  const maximumParallax = uncertainty.maximum.value;
  if (
    uncertainty.minimum.unit !== "mas" ||
    uncertainty.maximum.unit !== "mas" ||
    !Number.isFinite(minimumParallax) ||
    !Number.isFinite(maximumParallax) ||
    minimumParallax <= 0 ||
    maximumParallax < minimumParallax ||
    parallaxValue < minimumParallax ||
    parallaxValue > maximumParallax
  ) {
    return {
      valid: false,
      explanation:
        "Parallax interval must be finite, positive, ordered, in mas, and contain the measured value.",
    };
  }
  return {
    valid: true,
    fractionalUncertainty:
      Math.max(
        parallaxValue - minimumParallax,
        maximumParallax - parallaxValue,
      ) / parallaxValue,
    distanceUncertainty: {
      kind: "interval",
      minimum: { value: 1_000 / maximumParallax, unit: "pc" },
      maximum: { value: 1_000 / minimumParallax, unit: "pc" },
      confidence: uncertainty.confidence,
    },
  };
}

/**
 * Direct parallax inversion is only returned by default when σϖ/ϖ ≤ 0.2.
 * Low-signal and non-positive parallaxes require a documented Bayesian prior,
 * so this dependency-free core refuses to manufacture a precise distance.
 * Scientific rationale: Bailer-Jones (2015), arXiv:1507.02105.
 */
export function distanceFromParallax(
  parallax: Measurement<"mas"> | undefined,
  options: { readonly allowLowSignalDirectInversion?: boolean } = {},
): ParallaxDistanceResult {
  if (!parallax) {
    return {
      kind: "unavailable",
      reason: "missing-parallax",
      explanation: "No parallax measurement is available.",
    };
  }
  if (parallax.quantity.unit !== "mas") {
    return {
      kind: "unavailable",
      reason: "invalid-parallax-unit",
      explanation: "Parallax must be supplied explicitly in milliarcseconds.",
    };
  }
  if (!Number.isFinite(parallax.quantity.value)) {
    return {
      kind: "unavailable",
      reason: "non-finite-parallax",
      explanation: "The parallax value is not finite.",
    };
  }
  if (parallax.quantity.value <= 0) {
    return {
      kind: "unavailable",
      reason: "non-positive-parallax",
      explanation:
        "A non-positive measured parallax cannot be converted by reciprocal inversion.",
    };
  }

  const distance = 1_000 / parallax.quantity.value;
  const propagated = propagateParallaxUncertainty(parallax, distance);
  if (!propagated.valid) {
    return {
      kind: "unavailable",
      reason: "invalid-parallax-uncertainty",
      explanation: propagated.explanation,
    };
  }
  const fractionalUncertainty = propagated.fractionalUncertainty;
  if (
    fractionalUncertainty !== undefined &&
    fractionalUncertainty > 0.2 &&
    !options.allowLowSignalDirectInversion
  ) {
    return {
      kind: "unavailable",
      reason: "low-signal-parallax",
      explanation:
        "Direct reciprocal inversion is unstable because fractional parallax uncertainty exceeds 20%; use a documented probabilistic distance estimate.",
    };
  }

  return {
    kind: "distance",
    measurement: {
      quantity: { value: distance, unit: "pc" },
      status:
        fractionalUncertainty && fractionalUncertainty > 0.2
          ? "estimated"
          : "derived",
      method: "reciprocal parallax inversion (d[pc] = 1000 / parallax[mas])",
      caveat:
        fractionalUncertainty && fractionalUncertainty > 0.2
          ? "Low-signal direct inversion was explicitly requested and may be biased."
          : undefined,
      uncertainty: propagated.distanceUncertainty,
    },
    fractionalParallaxUncertainty: fractionalUncertainty,
    warning:
      fractionalUncertainty && fractionalUncertainty > 0.2
        ? "Low-signal reciprocal estimate; do not present as an exact distance."
        : undefined,
  };
}

export interface ProperMotionVector {
  readonly rightAscension: Measurement<"mas/Julian-year">;
  readonly declination: Measurement<"mas/Julian-year">;
  /**
   * `mu-alpha-star` means μα* = dα/dt cos(δ), as commonly published by Gaia.
   * `d-alpha-dt` means the catalogue already supplies dα/dt.
   */
  readonly rightAscensionConvention: "mu-alpha-star" | "d-alpha-dt";
}

export interface ProperMotionPropagationResult {
  readonly coordinate: EquatorialCoordinate;
  readonly elapsed: Quantity<"Julian-year">;
  readonly status: "modelled";
  readonly method: "linear-tangent-plane";
  readonly caveats: readonly string[];
}

/**
 * Short-baseline linear proper-motion propagation. It preserves the declared
 * reference frame and does not model radial velocity, perspective
 * acceleration, parallax, precession, or gravitational deflection.
 */
export function propagateLinearProperMotion(
  coordinate: EquatorialCoordinate,
  properMotion: ProperMotionVector,
  targetEpoch: Quantity<"Julian-year">,
): ProperMotionPropagationResult {
  if (
    targetEpoch.unit !== "Julian-year" ||
    properMotion.rightAscension.quantity.unit !== "mas/Julian-year" ||
    properMotion.declination.quantity.unit !== "mas/Julian-year"
  ) {
    throw new TypeError(
      "Proper motion and epoch must use explicit mas/Julian-year and Julian-year units.",
    );
  }
  if (
    !["mu-alpha-star", "d-alpha-dt"].includes(
      properMotion.rightAscensionConvention,
    )
  ) {
    throw new TypeError(
      "Unsupported right-ascension proper-motion convention.",
    );
  }
  const elapsedYears = targetEpoch.value - coordinate.epoch.value;
  const rightAscensionMotion = properMotion.rightAscension.quantity.value;
  const declinationMotion = properMotion.declination.quantity.value;
  if (
    !Number.isFinite(targetEpoch.value) ||
    !Number.isFinite(rightAscensionMotion) ||
    !Number.isFinite(declinationMotion)
  ) {
    throw new RangeError("Epoch and proper-motion components must be finite.");
  }
  const cosineDeclination = Math.cos(
    convertAngle(coordinate.declination, "rad").value,
  );
  if (
    properMotion.rightAscensionConvention === "mu-alpha-star" &&
    Math.abs(cosineDeclination) < 1e-8
  ) {
    throw new RangeError(
      "mu-alpha-star cannot be linearly inverted at a celestial pole.",
    );
  }

  const milliarcsecondsPerDegree = 3_600_000;
  const rightAscensionRateDegrees =
    rightAscensionMotion /
    milliarcsecondsPerDegree /
    (properMotion.rightAscensionConvention === "mu-alpha-star"
      ? cosineDeclination
      : 1);
  const declinationRateDegrees = declinationMotion / milliarcsecondsPerDegree;
  const declination =
    coordinate.declination.value + declinationRateDegrees * elapsedYears;
  if (declination < -90 || declination > 90) {
    throw new RangeError(
      "Linear proper-motion propagation crossed a celestial pole; use a full space-motion model.",
    );
  }

  return {
    coordinate: {
      ...coordinate,
      rightAscension: {
        value: normalizeDegrees(
          coordinate.rightAscension.value +
            rightAscensionRateDegrees * elapsedYears,
        ),
        unit: "deg",
      },
      declination: { value: declination, unit: "deg" },
      epoch: { value: targetEpoch.value, scale: "Julian-year" },
    },
    elapsed: { value: elapsedYears, unit: "Julian-year" },
    status: "modelled",
    method: "linear-tangent-plane",
    caveats: [
      "Suitable only when linear proper motion is adequate for the requested time baseline.",
      "Radial velocity, perspective acceleration, parallax, precession, and gravitational deflection are not modelled.",
    ],
  };
}

export function angularSeparation(
  first: EquatorialCoordinate,
  second: EquatorialCoordinate,
): Quantity<"deg"> {
  if (
    first.frame !== second.frame ||
    first.origin !== second.origin ||
    Math.abs(first.epoch.value - second.epoch.value) > 1e-9
  ) {
    throw new RangeError(
      "Angular separation requires coordinates in the same frame, origin, and epoch.",
    );
  }
  const [ax, ay, az] = unitVectorFromEquatorial(first);
  const [bx, by, bz] = unitVectorFromEquatorial(second);
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  return { value: (Math.acos(dot) * 180) / Math.PI, unit: "deg" };
}
