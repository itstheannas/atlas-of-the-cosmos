/**
 * Procedural appearance parameters for individually rendered Solar System
 * bodies.
 *
 * Every value here is a *rendering* parameter, not a scientific measurement in
 * the catalogue sense. Physical quantities (radii, obliquity, rotation period,
 * ring boundaries) are transcribed from the published NASA/NSSDCA planetary
 * fact sheets; palettes are hand-matched approximations of the colour
 * relationships visible in published NASA/ESA mission imagery.
 *
 * No third-party image, texture, or artwork is copied or redistributed. The
 * shaders that consume these parameters draw every surface mathematically, so
 * the rendered artwork is original project work. What is borrowed is factual
 * measurement and the visual impression of published photography, both of
 * which are cited through `referenceSourceIds` and surfaced in the product's
 * data-provenance documentation.
 *
 * Appearance is therefore *illustrative*: it is a scientifically informed
 * depiction, never an observation. Do not present a rendered surface as
 * imagery, and do not derive measurements from it.
 */

export type SurfaceStyle =
  | "star"
  | "rocky"
  | "ocean-world"
  | "cloud-veiled"
  | "gas-giant"
  | "ice-giant"
  | "icy-moon";

export interface SurfacePalette {
  /** Deepest/lowest albedo tone. */
  readonly low: string;
  /** Dominant mid tone. */
  readonly mid: string;
  /** Brightest tone: highlands, cloud tops, or zones. */
  readonly high: string;
  /** Localised feature tone: spots, cracks, polar caps, sunspot contrast. */
  readonly accent: string;
}

export interface AtmosphereAppearance {
  /** Rim/limb scattering colour. */
  readonly colour: string;
  /** Relative rim strength, 0-1. */
  readonly strength: number;
}

export interface RingAppearance {
  /** Inner edge as a multiple of the body's equatorial radius. */
  readonly innerRadiusRatio: number;
  /** Outer edge as a multiple of the body's equatorial radius. */
  readonly outerRadiusRatio: number;
  /** Optional principal gap, as radius ratios. */
  readonly gapInnerRatio?: number;
  readonly gapOuterRatio?: number;
  readonly palette: SurfacePalette;
  /** Peak opacity of the densest ringlets, 0-1. */
  readonly opacity: number;
  readonly note: string;
}

export interface PlanetaryAppearance {
  /** Matches the catalogue exhibit id. */
  readonly id: string;
  readonly equatorialRadiusKm: number;
  /** Obliquity in degrees; values above 90 indicate retrograde rotation. */
  readonly obliquityDeg: number;
  /** Sidereal rotation period in hours; negative values are retrograde. */
  readonly rotationPeriodHours: number;
  readonly style: SurfaceStyle;
  readonly palette: SurfacePalette;
  readonly atmosphere?: AtmosphereAppearance;
  readonly ring?: RingAppearance;
  /** Self-luminous bodies are not shaded by the Sun. */
  readonly emissive?: boolean;
  /** Catalogue source ids backing the physical figures. */
  readonly referenceSourceIds: readonly string[];
  /** Which published imagery informed the palette. */
  readonly paletteBasis: string;
}

const NASA_FACT_SHEETS = "nasa-solar-system";

/**
 * Physical figures: NASA/NSSDCA planetary fact sheets. Ring boundaries for
 * Saturn are the C-ring inner edge and A-ring outer edge, with the Cassini
 * Division as the modelled gap.
 */
export const planetaryAppearances: readonly PlanetaryAppearance[] = [
  {
    id: "sun",
    equatorialRadiusKm: 695_700,
    obliquityDeg: 7.25,
    rotationPeriodHours: 609.12,
    style: "star",
    emissive: true,
    palette: {
      low: "#f08a2a",
      mid: "#ffb347",
      high: "#fff1c4",
      accent: "#c25a12",
    },
    atmosphere: { colour: "#ffd79a", strength: 1 },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Granulation and limb-darkening contrast approximated from NASA SDO photospheric imagery.",
  },
  {
    id: "mercury",
    equatorialRadiusKm: 2_440.5,
    obliquityDeg: 0.034,
    rotationPeriodHours: 1_407.6,
    style: "rocky",
    palette: {
      low: "#5f574f",
      mid: "#8c8279",
      high: "#b3aaa0",
      accent: "#4a443e",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Grey regolith range approximated from NASA MESSENGER surface imagery.",
  },
  {
    id: "venus",
    equatorialRadiusKm: 6_051.8,
    obliquityDeg: 177.36,
    rotationPeriodHours: -5_832.5,
    style: "cloud-veiled",
    palette: {
      low: "#b8945c",
      mid: "#dcc088",
      high: "#f3e0b4",
      accent: "#9c7a45",
    },
    atmosphere: { colour: "#f0d9a8", strength: 0.85 },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Sulphuric haze tones approximated from NASA Mariner 10 and JAXA Akatsuki cloud-top imagery.",
  },
  {
    id: "earth",
    equatorialRadiusKm: 6_378.1,
    obliquityDeg: 23.44,
    rotationPeriodHours: 23.93,
    style: "ocean-world",
    palette: {
      low: "#12447e",
      mid: "#1f6bb0",
      high: "#4f7a3a",
      accent: "#eef4fb",
    },
    atmosphere: { colour: "#79b0ff", strength: 1 },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Ocean, vegetated land, and cloud/ice contrast approximated from NASA Blue Marble composites.",
  },
  {
    id: "moon",
    equatorialRadiusKm: 1_738.1,
    obliquityDeg: 6.68,
    rotationPeriodHours: 655.7,
    style: "rocky",
    palette: {
      low: "#6e6862",
      mid: "#a29b92",
      high: "#c8c1b7",
      accent: "#514c47",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Mare and highland albedo contrast approximated from NASA Lunar Reconnaissance Orbiter imagery.",
  },
  {
    id: "mars",
    equatorialRadiusKm: 3_396.2,
    obliquityDeg: 25.19,
    rotationPeriodHours: 24.62,
    style: "rocky",
    palette: {
      low: "#7d3a22",
      mid: "#b5573a",
      high: "#d98f63",
      accent: "#f2f4f7",
    },
    atmosphere: { colour: "#e3a483", strength: 0.35 },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Iron-oxide surface range and polar cap contrast approximated from NASA Viking and MRO imagery.",
  },
  {
    id: "ceres",
    equatorialRadiusKm: 469.7,
    obliquityDeg: 4,
    rotationPeriodHours: 9.07,
    style: "rocky",
    palette: {
      low: "#5c574f",
      mid: "#8d867b",
      high: "#a8a196",
      accent: "#e8e4d8",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Dark regolith with bright carbonate deposits approximated from NASA Dawn imagery.",
  },
  {
    id: "jupiter",
    equatorialRadiusKm: 71_492,
    obliquityDeg: 3.13,
    rotationPeriodHours: 9.93,
    style: "gas-giant",
    palette: {
      low: "#8a5a3c",
      mid: "#c39a72",
      high: "#e8dcc2",
      accent: "#b04a32",
    },
    atmosphere: { colour: "#e6d3b0", strength: 0.5 },
    ring: {
      innerRadiusRatio: 1.71,
      outerRadiusRatio: 1.81,
      palette: {
        low: "#6b5c4c",
        mid: "#8d7c68",
        high: "#a89684",
        accent: "#5a4d40",
      },
      opacity: 0.12,
      note: "Jupiter's main dust ring is extremely faint and is drawn far brighter than it appears.",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Belt/zone banding and Great Red Spot contrast approximated from NASA Voyager, Cassini, and Juno imagery.",
  },
  {
    id: "saturn",
    equatorialRadiusKm: 60_268,
    obliquityDeg: 26.73,
    rotationPeriodHours: 10.66,
    style: "gas-giant",
    palette: {
      low: "#a98d5e",
      mid: "#d8c294",
      high: "#f0e3c2",
      accent: "#8f7346",
    },
    atmosphere: { colour: "#efdfba", strength: 0.45 },
    ring: {
      // C-ring inner edge 74,500 km and A-ring outer edge 136,780 km,
      // expressed against the 60,268 km equatorial radius.
      innerRadiusRatio: 1.236,
      outerRadiusRatio: 2.269,
      // Cassini Division, 117,580-122,170 km.
      gapInnerRatio: 1.951,
      gapOuterRatio: 2.027,
      palette: {
        low: "#8a7856",
        mid: "#cbb68d",
        high: "#eee0c0",
        accent: "#6f5f45",
      },
      opacity: 0.92,
      note: "Ring boundaries follow published C-ring and A-ring edges; individual ringlets are procedural.",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Cloud-band and ring-particle tones approximated from NASA/ESA Cassini imagery.",
  },
  {
    id: "uranus",
    equatorialRadiusKm: 25_559,
    obliquityDeg: 97.77,
    rotationPeriodHours: -17.24,
    style: "ice-giant",
    palette: {
      low: "#5f9fa8",
      mid: "#8fcdd4",
      high: "#c3e8ea",
      accent: "#4a8891",
    },
    atmosphere: { colour: "#a9e2e8", strength: 0.7 },
    ring: {
      // Inner ring system to the epsilon ring, 38,000-51,149 km.
      innerRadiusRatio: 1.487,
      outerRadiusRatio: 2.001,
      palette: {
        low: "#4c565c",
        mid: "#6d7980",
        high: "#8b979e",
        accent: "#3d464b",
      },
      opacity: 0.22,
      note: "Uranus's narrow rings are very dark and are drawn brighter than observed.",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Methane-blue disc approximated from NASA Voyager 2 and Hubble imagery.",
  },
  {
    id: "neptune",
    equatorialRadiusKm: 24_764,
    obliquityDeg: 28.32,
    rotationPeriodHours: 16.11,
    style: "ice-giant",
    palette: {
      low: "#22458f",
      mid: "#3a6ad0",
      high: "#7fa4ec",
      accent: "#16305f",
    },
    atmosphere: { colour: "#6f9bf0", strength: 0.75 },
    ring: {
      // Inner rings to the Adams ring, 41,900-62,932 km.
      innerRadiusRatio: 1.692,
      outerRadiusRatio: 2.541,
      palette: {
        low: "#3c4763",
        mid: "#586582",
        high: "#78859f",
        accent: "#2c3550",
      },
      opacity: 0.18,
      note: "Neptune's rings are faint and clumpy; the smooth depiction is illustrative.",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Deep methane-blue disc approximated from NASA Voyager 2 imagery.",
  },
  {
    id: "pluto",
    equatorialRadiusKm: 1_188.3,
    obliquityDeg: 122.53,
    rotationPeriodHours: -153.3,
    style: "rocky",
    palette: {
      low: "#7d6752",
      mid: "#b09a80",
      high: "#e0d2bb",
      accent: "#f2ece0",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Tholin-tinted terrain and bright nitrogen plain contrast approximated from NASA New Horizons imagery.",
  },
  {
    id: "europa",
    equatorialRadiusKm: 1_560.8,
    obliquityDeg: 0.1,
    rotationPeriodHours: 85.2,
    style: "icy-moon",
    palette: {
      low: "#c9c2b2",
      mid: "#e6e0d2",
      high: "#f6f2e8",
      accent: "#a2714a",
    },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Bright ice crust with reddish lineae approximated from NASA Galileo imagery.",
  },
  {
    id: "titan",
    equatorialRadiusKm: 2_574.7,
    obliquityDeg: 0.3,
    rotationPeriodHours: 382.7,
    style: "cloud-veiled",
    palette: {
      low: "#9a6a2c",
      mid: "#d29a49",
      high: "#edc47f",
      accent: "#7d5320",
    },
    atmosphere: { colour: "#e8b56a", strength: 1 },
    referenceSourceIds: [NASA_FACT_SHEETS],
    paletteBasis:
      "Opaque orange haze approximated from NASA/ESA Cassini-Huygens imagery.",
  },
];

const APPEARANCE_BY_ID = new Map(
  planetaryAppearances.map((appearance) => [appearance.id, appearance]),
);

export function planetaryAppearanceFor(
  id: string,
): PlanetaryAppearance | undefined {
  return APPEARANCE_BY_ID.get(id);
}

/** Earth's equatorial radius, the reference for relative visual sizing. */
export const EARTH_RADIUS_KM = 6_378.1;

/**
 * Relative visual radius, expressed in Earth radii after compression.
 *
 * True radii span roughly 1,480:1 across these bodies, which would render the
 * smaller ones as sub-pixel specks beside the Sun. A square-root curve
 * preserves the size *ordering* and keeps the hierarchy obvious — the Sun
 * still reads as an order of magnitude larger than Earth, and gas giants
 * clearly dwarf terrestrial worlds — while holding the whole set legible in
 * one view. The result is deliberately not to scale, and the interface must
 * continue to say so.
 *
 * A gentler exponent was tried first and flattened the hierarchy so far that
 * every body looked interchangeable, which defeated the purpose.
 */
export const VISUAL_RADIUS_COMPRESSION = 0.5;

export function compressedVisualRadius(equatorialRadiusKm: number): number {
  if (!Number.isFinite(equatorialRadiusKm) || equatorialRadiusKm <= 0) {
    throw new RangeError("Equatorial radius must be a positive number.");
  }
  return Math.pow(
    equatorialRadiusKm / EARTH_RADIUS_KM,
    VISUAL_RADIUS_COMPRESSION,
  );
}
