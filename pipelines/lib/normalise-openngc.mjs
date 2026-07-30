import {
  parseDeclination,
  parseRightAscension,
} from "../../packages/coordinate-engine/src/units.ts";
import { assertValidCatalogueObject } from "../../packages/astronomy-core/src/validation.ts";

const TYPE_MAP = Object.freeze({
  G: "galaxy",
  "Cl+N": "nebula",
  SNR: "supernova-remnant",
  GCl: "globular-cluster",
});

const CONSTELLATION_MAP = Object.freeze({
  And: "Andromeda",
  Her: "Hercules",
  Ori: "Orion",
  Tau: "Taurus",
});

function paddedMessierIdentifier(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TypeError(`Invalid Messier number: ${value}`);
  }
  return `M ${parsed}`;
}

function provenanceFor(rawDataset, rawRecord) {
  return {
    provider: rawDataset.source.provider,
    dataset: rawDataset.source.dataset,
    datasetVersion: rawDataset.source.datasetVersion,
    recordIdentifier: rawRecord.name,
    accessedAt: rawDataset.source.accessedAt,
    sourceUrl: rawDataset.source.sourceUrl,
    citation: rawDataset.source.citation,
    licence: rawDataset.source.licence,
    attribution: rawDataset.source.attribution,
    transformations: [
      "Parsed source sexagesimal coordinates into decimal degrees.",
      "Mapped the OpenNGC type code to an Atlas object type; retained sourceClassification.",
      "Normalised NGC and Messier identifiers without inventing identifiers.",
      "Expanded the source IAU constellation abbreviation to its conventional name.",
      "Preserved V magnitude and heliocentric redshift; did not infer distance.",
    ],
    coordinateSystem:
      "OpenNGC J2000 equatorial position mapped to operational ICRS at Julian epoch 2000.0, limited to published source precision.",
    knownLimitations: [
      ...rawDataset.source.knownLimitations,
      ...(rawRecord.openNgcNote ? [rawRecord.openNgcNote] : []),
    ],
  };
}

export function normaliseOpenNgcRecord(rawDataset, rawRecord) {
  if (!rawRecord || typeof rawRecord !== "object") {
    throw new TypeError("Raw OpenNGC record must be an object.");
  }
  const objectType = TYPE_MAP[rawRecord.typeCode];
  if (!objectType) {
    throw new TypeError(`Unsupported OpenNGC type code: ${rawRecord.typeCode}`);
  }
  const rightAscension = parseRightAscension(rawRecord.rightAscension);
  const declination = parseDeclination(rawRecord.declination);
  const messier = rawRecord.messierNumber
    ? paddedMessierIdentifier(rawRecord.messierNumber)
    : undefined;
  const commonNames = Array.isArray(rawRecord.commonNames)
    ? rawRecord.commonNames.filter(
        (name) => typeof name === "string" && name.trim().length > 0,
      )
    : [];
  const constellationName = CONSTELLATION_MAP[rawRecord.constellationCode];
  if (!constellationName) {
    throw new TypeError(
      `Unsupported constellation code: ${rawRecord.constellationCode}`,
    );
  }

  const properties = {};
  if (rawRecord.visualMagnitude !== undefined) {
    if (!Number.isFinite(rawRecord.visualMagnitude)) {
      throw new TypeError(`Non-finite V magnitude for ${rawRecord.name}`);
    }
    properties.apparentMagnitude = {
      quantity: { value: rawRecord.visualMagnitude, unit: "mag" },
      status: "observed",
      method: "OpenNGC V-Mag field",
      caveat: "Measurement uncertainty is unavailable in this source excerpt.",
      passband: "V",
    };
  }
  if (rawRecord.redshift !== undefined) {
    if (!Number.isFinite(rawRecord.redshift)) {
      throw new TypeError(`Non-finite redshift for ${rawRecord.name}`);
    }
    properties.redshift = {
      quantity: { value: rawRecord.redshift, unit: "redshift" },
      status: "observed",
      method: "OpenNGC heliocentric Redshift field",
      caveat:
        "Preserved as observed catalogue metadata; not converted to distance.",
    };
  }

  const object = {
    id: `openngc:${rawRecord.name.toLocaleLowerCase("en")}`,
    dataOrigin: "catalogue",
    names: {
      primary: commonNames[0] ?? rawRecord.name,
      common: commonNames.slice(1),
    },
    objectType,
    sourceClassification: rawRecord.typeCode,
    constellation: {
      abbreviation: rawRecord.constellationCode,
      name: constellationName,
    },
    catalogueIdentifiers: [
      {
        catalogue: "OpenNGC",
        value: rawRecord.name,
        canonical: true,
      },
      ...(messier
        ? [{ catalogue: "Messier", value: messier, canonical: false }]
        : []),
    ],
    coordinate: {
      kind: "equatorial",
      rightAscension,
      declination,
      frame: "ICRS",
      origin: "solar-system-barycentre",
      epoch: { value: 2000, scale: "Julian-year" },
    },
    properties,
    provenance: [provenanceFor(rawDataset, rawRecord)],
  };
  return assertValidCatalogueObject(object);
}

export function normaliseOpenNgcDataset(rawDataset) {
  if (
    !rawDataset ||
    typeof rawDataset !== "object" ||
    !Array.isArray(rawDataset.records)
  ) {
    throw new TypeError("Raw dataset must contain a records array.");
  }
  const accepted = [];
  const rejected = [];
  const byId = new Map();

  rawDataset.records.forEach((record, index) => {
    try {
      const object = normaliseOpenNgcRecord(rawDataset, record);
      const existing = byId.get(object.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(object)) {
          throw new TypeError(
            `Conflicting duplicate canonical ID: ${object.id}`,
          );
        }
        return;
      }
      byId.set(object.id, object);
      accepted.push(object);
    } catch (error) {
      rejected.push({
        index,
        sourceIdentifier:
          record &&
          typeof record === "object" &&
          typeof record.name === "string"
            ? record.name
            : null,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  });

  accepted.sort((first, second) => first.id.localeCompare(second.id, "en"));
  return { accepted, rejected };
}
