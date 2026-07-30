import type {
  AngleUnit,
  DistanceUnit,
  Quantity,
} from "../../shared-types/src/index.ts";

/**
 * IAU 2012 astronomical unit definition: exactly 149,597,870,700 metres.
 * The parsec follows the IAU geometric definition, 648000 / π AU.
 * The light-year uses the Julian year (365.25 days) and exact speed of light.
 * Sources: IAU 2012 Resolution B2 and IAU 2015 Resolution B2.
 * https://www.iau.org/static/resolutions/IAU2012_English.pdf
 * https://www.iau.org/static/resolutions/IAU2015_English.pdf
 */
export const KILOMETRES_PER_UNIT: Readonly<Record<DistanceUnit, number>> = {
  km: 1,
  au: 149_597_870.7,
  ly: 9_460_730_472_580.8,
  pc: 149_597_870.7 * (648_000 / Math.PI),
  kpc: 149_597_870.7 * (648_000 / Math.PI) * 1_000,
  Mpc: 149_597_870.7 * (648_000 / Math.PI) * 1_000_000,
};

const RADIANS_PER_ANGLE_UNIT: Readonly<Record<AngleUnit, number>> = {
  rad: 1,
  deg: Math.PI / 180,
  "hour-angle": Math.PI / 12,
  arcmin: Math.PI / (180 * 60),
  arcsec: Math.PI / (180 * 3_600),
  mas: Math.PI / (180 * 3_600_000),
};

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite`);
  }
}

export function convertDistance<
  From extends DistanceUnit,
  To extends DistanceUnit,
>(quantity: Quantity<From>, targetUnit: To): Quantity<To> {
  assertFinite(quantity.value, "Distance");
  if (String(quantity.unit) === String(targetUnit)) {
    return { value: quantity.value, unit: targetUnit };
  }
  return {
    value:
      (quantity.value * KILOMETRES_PER_UNIT[quantity.unit]) /
      KILOMETRES_PER_UNIT[targetUnit],
    unit: targetUnit,
  };
}

export function convertAngle<From extends AngleUnit, To extends AngleUnit>(
  quantity: Quantity<From>,
  targetUnit: To,
): Quantity<To> {
  assertFinite(quantity.value, "Angle");
  return {
    value:
      (quantity.value * RADIANS_PER_ANGLE_UNIT[quantity.unit]) /
      RADIANS_PER_ANGLE_UNIT[targetUnit],
    unit: targetUnit,
  };
}

export function normalizeDegrees(value: number): number {
  assertFinite(value, "Angle");
  return ((value % 360) + 360) % 360;
}

export function clampDeclinationDegrees(value: number): number {
  assertFinite(value, "Declination");
  if (value < -90 || value > 90) {
    throw new RangeError("Declination must be between -90 and +90 degrees");
  }
  return value;
}

export function parseRightAscension(value: string): Quantity<"deg"> {
  const match = /^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value.trim());
  if (!match) {
    throw new TypeError("Right ascension must use HH:MM:SS.s notation");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (hours >= 24 || minutes >= 60 || seconds >= 60) {
    throw new RangeError("Right ascension components are outside valid ranges");
  }

  return {
    value: (hours + minutes / 60 + seconds / 3_600) * 15,
    unit: "deg",
  };
}

export function parseDeclination(value: string): Quantity<"deg"> {
  const match = /^([+-])(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(
    value.trim(),
  );
  if (!match) {
    throw new TypeError("Declination must use ±DD:MM:SS.s notation");
  }

  const degrees = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4]);
  if (degrees > 90 || minutes >= 60 || seconds >= 60) {
    throw new RangeError("Declination components are outside valid ranges");
  }
  if (degrees === 90 && (minutes !== 0 || seconds !== 0)) {
    throw new RangeError("Declination cannot exceed 90 degrees");
  }

  const sign = match[1] === "-" ? -1 : 1;
  return {
    value: sign * (degrees + minutes / 60 + seconds / 3_600),
    unit: "deg",
  };
}
