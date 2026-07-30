import { normalizeSearchText } from "../packages/catalogue-client/src/search.ts";

/**
 * Curated constellation associations for local exhibits that expose an
 * equatorial sky position. Keys are exhibit IDs, never route slugs.
 */
export const constellationByObjectId: Readonly<Record<string, string>> = {
  "proxima-centauri": "Centaurus",
  "sirius-a": "Canis Major",
  "sirius-b": "Canis Major",
  betelgeuse: "Orion",
  "orion-nebula": "Orion",
  pleiades: "Taurus",
  "ring-nebula": "Lyra",
  "eta-carinae": "Carina",
  "crab-nebula": "Taurus",
  "crab-pulsar": "Taurus",
  "cygnus-x1": "Cygnus",
  "sagittarius-a-star": "Sagittarius",
  "omega-centauri": "Centaurus",
  "large-magellanic-cloud": "Dorado",
  "andromeda-galaxy": "Andromeda",
  "triangulum-galaxy": "Triangulum",
  "antennae-galaxies": "Corvus",
  m87: "Virgo",
  "m87-star": "Virgo",
};

export function matchesConstellationFilter(
  objectId: string,
  query: string,
): boolean {
  const constellation = constellationByObjectId[objectId];
  return Boolean(
    constellation &&
    normalizeSearchText(constellation).includes(normalizeSearchText(query)),
  );
}
