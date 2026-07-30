import type { Measurement, Unit } from "../../shared-types/src/index.ts";

export interface MeasurementFormatOptions {
  readonly locale?: string;
  readonly includeEvidenceStatus?: boolean;
  readonly maximumSignificantDigitsWithoutUncertainty?: number;
}

function decimalPlacesForUncertainty(uncertainty: number): number {
  if (!Number.isFinite(uncertainty) || uncertainty <= 0) return 2;
  const exponent = Math.floor(Math.log10(Math.abs(uncertainty)));
  const leadingDigit = Math.floor(uncertainty / 10 ** exponent);
  const significantDigits = leadingDigit <= 2 ? 2 : 1;
  return Math.max(0, significantDigits - 1 - exponent);
}

function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    useGrouping: true,
    ...options,
  }).format(value);
}

export function formatMeasurement<U extends Unit>(
  measurement: Measurement<U> | undefined,
  options: MeasurementFormatOptions = {},
): string {
  if (!measurement) return "Unknown";
  const locale = options.locale ?? "en";
  const suffix = options.includeEvidenceStatus
    ? ` (${measurement.status})`
    : "";

  if (measurement.uncertainty?.kind === "symmetric") {
    const uncertainty = Math.abs(measurement.uncertainty.plusMinus.value);
    const decimalPlaces = decimalPlacesForUncertainty(uncertainty);
    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    };
    return `${formatNumber(measurement.quantity.value, locale, formatOptions)} ± ${formatNumber(
      uncertainty,
      locale,
      formatOptions,
    )} ${measurement.quantity.unit}${suffix}`;
  }

  if (measurement.uncertainty?.kind === "asymmetric") {
    const decimalPlaces = Math.max(
      decimalPlacesForUncertainty(
        Math.abs(measurement.uncertainty.lower.value),
      ),
      decimalPlacesForUncertainty(
        Math.abs(measurement.uncertainty.upper.value),
      ),
    );
    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    };
    return `${formatNumber(measurement.quantity.value, locale, formatOptions)} +${formatNumber(
      Math.abs(measurement.uncertainty.upper.value),
      locale,
      formatOptions,
    )}/−${formatNumber(
      Math.abs(measurement.uncertainty.lower.value),
      locale,
      formatOptions,
    )} ${measurement.quantity.unit}${suffix}`;
  }

  return `${formatNumber(measurement.quantity.value, locale, {
    maximumSignificantDigits:
      options.maximumSignificantDigitsWithoutUncertainty ?? 6,
  })} ${measurement.quantity.unit}${suffix}`;
}
