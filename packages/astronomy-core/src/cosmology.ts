import type { Measurement, Quantity } from "../../shared-types/src/index.ts";

const SPEED_OF_LIGHT_KM_PER_SECOND = 299_792.458;

export interface FlatLambdaCdmModel {
  readonly name: string;
  readonly citation: string;
  readonly hubbleConstant: Quantity<"km/s/Mpc">;
  readonly omegaMatter: Quantity<"dimensionless">;
  readonly omegaDarkEnergy: Quantity<"dimensionless">;
  readonly omegaRadiation?: Quantity<"dimensionless">;
  readonly validRedshiftRange: {
    readonly minimum: Quantity<"redshift">;
    readonly maximum: Quantity<"redshift">;
  };
}

export interface CosmologicalDistanceResult {
  readonly comovingRadialDistance: Measurement<"Mpc">;
  readonly luminosityDistance: Measurement<"Mpc">;
  readonly assumptions: {
    readonly model: string;
    readonly citation: string;
    readonly spatialGeometry: "flat";
    readonly hubbleConstant: Quantity<"km/s/Mpc">;
    readonly omegaMatter: Quantity<"dimensionless">;
    readonly omegaDarkEnergy: Quantity<"dimensionless">;
    readonly omegaRadiation: Quantity<"dimensionless">;
  };
}

function validateModel(model: FlatLambdaCdmModel): void {
  if (
    model.hubbleConstant.unit !== "km/s/Mpc" ||
    model.omegaMatter.unit !== "dimensionless" ||
    model.omegaDarkEnergy.unit !== "dimensionless" ||
    (model.omegaRadiation?.unit ?? "dimensionless") !== "dimensionless" ||
    model.validRedshiftRange.minimum.unit !== "redshift" ||
    model.validRedshiftRange.maximum.unit !== "redshift"
  ) {
    throw new TypeError(
      "Cosmology parameters use incompatible or ambiguous units.",
    );
  }
  const values = [
    model.hubbleConstant.value,
    model.omegaMatter.value,
    model.omegaDarkEnergy.value,
    model.omegaRadiation?.value ?? 0,
    model.validRedshiftRange.minimum.value,
    model.validRedshiftRange.maximum.value,
  ];
  if (!values.every(Number.isFinite)) {
    throw new RangeError("Cosmology parameters must be finite.");
  }
  if (model.hubbleConstant.value <= 0) {
    throw new RangeError("Hubble constant must be positive.");
  }
  if (
    model.omegaMatter.value < 0 ||
    model.omegaDarkEnergy.value < 0 ||
    (model.omegaRadiation?.value ?? 0) < 0
  ) {
    throw new RangeError("Density parameters cannot be negative.");
  }
  const densitySum =
    model.omegaMatter.value +
    model.omegaDarkEnergy.value +
    (model.omegaRadiation?.value ?? 0);
  if (Math.abs(densitySum - 1) > 1e-6) {
    throw new RangeError(
      "Flat ΛCDM requires matter, dark-energy, and radiation density parameters to sum to one.",
    );
  }
  if (
    model.validRedshiftRange.minimum.value < 0 ||
    model.validRedshiftRange.maximum.value <
      model.validRedshiftRange.minimum.value
  ) {
    throw new RangeError("Cosmology valid-redshift range is inconsistent.");
  }
}

function expansionRateRatio(
  redshift: number,
  model: FlatLambdaCdmModel,
): number {
  const scale = 1 + redshift;
  return Math.sqrt(
    model.omegaMatter.value * scale ** 3 +
      (model.omegaRadiation?.value ?? 0) * scale ** 4 +
      model.omegaDarkEnergy.value,
  );
}

function integrateInverseExpansionRate(
  redshift: number,
  model: FlatLambdaCdmModel,
): number {
  if (redshift === 0) return 0;
  // Composite Simpson integration; the bounded even step count makes the
  // result deterministic while retaining sub-0.01% accuracy for UI use.
  const steps = Math.min(
    16_384,
    Math.max(256, Math.ceil((redshift * 1_024) / 2) * 2),
  );
  const width = redshift / steps;
  let weightedSum =
    1 / expansionRateRatio(0, model) + 1 / expansionRateRatio(redshift, model);
  for (let index = 1; index < steps; index += 1) {
    weightedSum +=
      (index % 2 === 0 ? 2 : 4) / expansionRateRatio(index * width, model);
  }
  return (width / 3) * weightedSum;
}

function comovingMegaparsecs(
  redshift: number,
  model: FlatLambdaCdmModel,
): number {
  return (
    (SPEED_OF_LIGHT_KM_PER_SECOND / model.hubbleConstant.value) *
    integrateInverseExpansionRate(redshift, model)
  );
}

function redshiftSigma(redshift: Measurement<"redshift">): number | undefined {
  return redshift.uncertainty?.kind === "symmetric"
    ? Math.abs(redshift.uncertainty.plusMinus.value)
    : undefined;
}

/**
 * Flat ΛCDM line-of-sight comoving and luminosity distances. A model is always
 * required; the core never silently selects H₀ or density parameters.
 */
export function cosmologicalDistancesFromRedshift(
  redshift: Measurement<"redshift">,
  model: FlatLambdaCdmModel,
): CosmologicalDistanceResult {
  validateModel(model);
  if (redshift.quantity.unit !== "redshift") {
    throw new TypeError(
      "Redshift measurement must use the explicit redshift unit.",
    );
  }
  const value = redshift.quantity.value;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      "Cosmological distance requires a finite, non-negative redshift.",
    );
  }
  if (
    value < model.validRedshiftRange.minimum.value ||
    value > model.validRedshiftRange.maximum.value
  ) {
    throw new RangeError(
      `Redshift ${value} is outside the declared validity range for ${model.name}.`,
    );
  }

  const comoving = comovingMegaparsecs(value, model);
  const luminosity = comoving * (1 + value);
  const sigma = redshiftSigma(redshift);
  const common = {
    status: "modelled" as const,
    method: `Numerical flat ΛCDM integral using ${model.name}.`,
    caveat:
      "Distance depends on the stated cosmological parameters; peculiar velocity and parameter uncertainty are not propagated.",
  };

  let comovingUncertainty: Measurement<"Mpc">["uncertainty"];
  let luminosityUncertainty: Measurement<"Mpc">["uncertainty"];
  if (sigma !== undefined) {
    const lowerRedshift = Math.max(0, value - sigma);
    const upperRedshift = value + sigma;
    if (upperRedshift > model.validRedshiftRange.maximum.value) {
      throw new RangeError(
        "Redshift uncertainty extends beyond the cosmology model's declared validity range.",
      );
    }
    const lowerComoving = comovingMegaparsecs(lowerRedshift, model);
    const upperComoving = comovingMegaparsecs(upperRedshift, model);
    const lowerLuminosity = lowerComoving * (1 + lowerRedshift);
    const upperLuminosity = upperComoving * (1 + upperRedshift);
    const confidence =
      redshift.uncertainty?.kind === "symmetric"
        ? redshift.uncertainty.confidence
        : "1-sigma";
    comovingUncertainty = {
      kind: "asymmetric",
      lower: { value: comoving - lowerComoving, unit: "Mpc" },
      upper: { value: upperComoving - comoving, unit: "Mpc" },
      confidence,
    };
    luminosityUncertainty = {
      kind: "asymmetric",
      lower: { value: luminosity - lowerLuminosity, unit: "Mpc" },
      upper: { value: upperLuminosity - luminosity, unit: "Mpc" },
      confidence,
    };
  }

  return {
    comovingRadialDistance: {
      quantity: { value: comoving, unit: "Mpc" },
      ...common,
      uncertainty: comovingUncertainty,
    },
    luminosityDistance: {
      quantity: { value: luminosity, unit: "Mpc" },
      ...common,
      uncertainty: luminosityUncertainty,
    },
    assumptions: {
      model: model.name,
      citation: model.citation,
      spatialGeometry: "flat",
      hubbleConstant: model.hubbleConstant,
      omegaMatter: model.omegaMatter,
      omegaDarkEnergy: model.omegaDarkEnergy,
      omegaRadiation: model.omegaRadiation ?? {
        value: 0,
        unit: "dimensionless",
      },
    },
  };
}
