const DAY_MS = 86_400_000;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MODEL_MIN_MS = Date.UTC(1900, 0, 1, 0, 0, 0);
const MODEL_MAX_MS = Date.UTC(2100, 11, 31, 23, 59, 59);
const TAU = Math.PI * 2;

interface MeanMotionModel {
  readonly orbitalPeriodDays: number;
  readonly j2000MeanLongitudeDegrees: number;
  readonly rotationPeriodHours?: number;
}

/**
 * Rounded mean periods and J2000 mean longitudes for an educational,
 * low-precision visual model. These values are not state vectors and must not
 * be used for observing, occultations, navigation, or spacecraft operations.
 */
const meanMotionByObjectId: Readonly<Record<string, MeanMotionModel>> = {
  mercury: {
    orbitalPeriodDays: 87.969,
    j2000MeanLongitudeDegrees: 252.25,
    rotationPeriodHours: 1407.6,
  },
  venus: {
    orbitalPeriodDays: 224.701,
    j2000MeanLongitudeDegrees: 181.98,
    rotationPeriodHours: -5832.5,
  },
  earth: {
    orbitalPeriodDays: 365.256,
    j2000MeanLongitudeDegrees: 100.46,
    rotationPeriodHours: 23.9345,
  },
  moon: {
    orbitalPeriodDays: 27.321_661,
    j2000MeanLongitudeDegrees: 218.32,
    rotationPeriodHours: 655.72,
  },
  mars: {
    orbitalPeriodDays: 686.98,
    j2000MeanLongitudeDegrees: 355.45,
    rotationPeriodHours: 24.6229,
  },
  ceres: {
    orbitalPeriodDays: 1680,
    j2000MeanLongitudeDegrees: 80.3,
    rotationPeriodHours: 9.074,
  },
  jupiter: {
    orbitalPeriodDays: 4332.59,
    j2000MeanLongitudeDegrees: 34.4,
    rotationPeriodHours: 9.925,
  },
  saturn: {
    orbitalPeriodDays: 10_759.22,
    j2000MeanLongitudeDegrees: 50.08,
    rotationPeriodHours: 10.656,
  },
  titan: {
    orbitalPeriodDays: 15.945,
    j2000MeanLongitudeDegrees: 65,
    rotationPeriodHours: 382.68,
  },
  uranus: {
    orbitalPeriodDays: 30_688.5,
    j2000MeanLongitudeDegrees: 314.05,
    rotationPeriodHours: -17.24,
  },
  neptune: {
    orbitalPeriodDays: 60_182,
    j2000MeanLongitudeDegrees: 304.35,
    rotationPeriodHours: 16.11,
  },
  pluto: {
    orbitalPeriodDays: 90_560,
    j2000MeanLongitudeDegrees: 238.93,
    rotationPeriodHours: -153.3,
  },
};

export interface TimeModelSceneObject {
  readonly id: string;
  readonly renderPosition: readonly [number, number, number];
  readonly schematicOrbit?: {
    readonly centre: readonly [number, number, number];
    readonly radius: number;
    readonly inclinationRad?: number;
  };
}

export interface AstronomicalHistoryEvent {
  readonly id: string;
  readonly dateIso: string;
  readonly title: string;
  readonly note: string;
}

export const astronomicalHistoryEvents: readonly AstronomicalHistoryEvent[] = [
  {
    id: "halley-1986",
    dateIso: "1986-02-09T00:00:00.000Z",
    title: "Halley at perihelion",
    note: "The 1986 perihelion date; this atlas does not model the comet orbit.",
  },
  {
    id: "sn-1987a",
    dateIso: "1987-02-23T00:00:00.000Z",
    title: "SN 1987A light reached Earth",
    note: "Approximate discovery date in UTC.",
  },
  {
    id: "first-exoplanet-sunlike",
    dateIso: "1995-10-06T00:00:00.000Z",
    title: "51 Pegasi b announced",
    note: "Announcement date for the first confirmed planet around a Sun-like star.",
  },
  {
    id: "gw150914",
    dateIso: "2015-09-14T09:50:45.000Z",
    title: "GW150914 detected",
    note: "First direct gravitational-wave detection event time.",
  },
  {
    id: "m87-image",
    dateIso: "2019-04-10T13:00:00.000Z",
    title: "First black-hole image released",
    note: "Event Horizon Telescope release of the M87* result.",
  },
  {
    id: "sgr-a-image",
    dateIso: "2022-05-12T13:00:00.000Z",
    title: "Sagittarius A* image released",
    note: "Event Horizon Telescope release date.",
  },
] as const;

export const educationalTimeModelValidity = {
  minimumYear: 1900,
  maximumYear: 2100,
  description:
    "Circular mean-motion rendering is clamped to 1900–2100. It is an educational phase model, not a precision ephemeris.",
} as const;

function clampModelTime(timeMs: number): number {
  return Math.max(MODEL_MIN_MS, Math.min(MODEL_MAX_MS, timeMs));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function orbitalAngle(model: MeanMotionModel, timeMs: number): number {
  const elapsedDays = (clampModelTime(timeMs) - J2000_MS) / DAY_MS;
  return (
    (model.j2000MeanLongitudeDegrees * Math.PI) / 180 +
    TAU * (elapsedDays / model.orbitalPeriodDays)
  );
}

export function applyEducationalOrbitModel<T extends TimeModelSceneObject>(
  objects: readonly T[],
  date: Date,
): readonly T[] {
  const timeMs = date.getTime();
  if (!Number.isFinite(timeMs)) return objects;

  return objects.map((object) => {
    const model = meanMotionByObjectId[object.id];
    const orbit = object.schematicOrbit;
    if (!model || !orbit) return object;

    const angle = orbitalAngle(model, timeMs);
    const inclination = orbit.inclinationRad ?? 0;
    const cosInclination = Math.cos(inclination);
    const sinInclination = Math.sin(inclination);
    const radialX = Math.cos(angle) * orbit.radius;
    const radialZ = Math.sin(angle) * orbit.radius;
    const renderPosition = [
      orbit.centre[0] + radialX,
      orbit.centre[1] + radialZ * sinInclination,
      orbit.centre[2] + radialZ * cosInclination,
    ] as const;
    return { ...object, renderPosition };
  });
}

export interface EducationalTimeSnapshot {
  readonly withinModelWindow: boolean;
  readonly effectiveDateIso: string;
  readonly rotationPhaseDegrees: number | null;
  readonly orbitalPhaseDegrees: number | null;
  readonly moonIlluminatedFraction: number;
  readonly moonPhaseName: string;
}

export function describeEducationalTime(
  date: Date,
  selectedObjectId: string,
): EducationalTimeSnapshot {
  const rawTimeMs = date.getTime();
  const timeMs = Number.isFinite(rawTimeMs) ? rawTimeMs : J2000_MS;
  const effectiveTimeMs = clampModelTime(timeMs);
  const model = meanMotionByObjectId[selectedObjectId];
  const elapsedHours = (effectiveTimeMs - J2000_MS) / 3_600_000;
  const rotationPhaseDegrees =
    model?.rotationPeriodHours === undefined
      ? null
      : positiveModulo((elapsedHours / model.rotationPeriodHours) * 360, 360);
  const orbitalPhaseDegrees = model
    ? positiveModulo(
        (orbitalAngle(model, effectiveTimeMs) * 180) / Math.PI,
        360,
      )
    : null;

  // Synodic phase anchored to the well-documented 2000-01-06 new moon.
  const newMoonEpochMs = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodicAgeDays = positiveModulo(
    (effectiveTimeMs - newMoonEpochMs) / DAY_MS,
    29.530_588_853,
  );
  const phaseAngle = TAU * (synodicAgeDays / 29.530_588_853);
  const moonIlluminatedFraction = (1 - Math.cos(phaseAngle)) / 2;
  const phaseIndex = Math.round((synodicAgeDays / 29.530_588_853) * 8) % 8;
  const moonPhaseName = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ][phaseIndex];

  return {
    withinModelWindow: timeMs >= MODEL_MIN_MS && timeMs <= MODEL_MAX_MS,
    effectiveDateIso: new Date(effectiveTimeMs).toISOString(),
    rotationPhaseDegrees,
    orbitalPhaseDegrees,
    moonIlluminatedFraction,
    moonPhaseName,
  };
}
