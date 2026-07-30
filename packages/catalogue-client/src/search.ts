import type {
  CatalogueObject,
  DistanceUnit,
  EquatorialCoordinate,
  ObjectType,
  Quantity,
} from "../../shared-types/src/index.ts";
import {
  angularSeparation,
  makeIcrsCoordinate,
} from "../../coordinate-engine/src/coordinates.ts";
import { convertDistance } from "../../coordinate-engine/src/units.ts";
import { assertValidCatalogueObject } from "../../astronomy-core/src/validation.ts";

export interface CatalogueSearchQuery {
  readonly text?: string;
  readonly objectTypes?: readonly ObjectType[];
  readonly catalogue?: string;
  readonly constellation?: string;
  readonly minDistance?: Quantity<DistanceUnit>;
  readonly minDistanceInclusive?: boolean;
  readonly maxDistance?: Quantity<DistanceUnit>;
  readonly maxDistanceInclusive?: boolean;
  readonly minApparentMagnitude?: Quantity<"mag">;
  readonly minApparentMagnitudeInclusive?: boolean;
  readonly maxApparentMagnitude?: Quantity<"mag">;
  readonly maxApparentMagnitudeInclusive?: boolean;
  readonly near?: {
    readonly coordinate: EquatorialCoordinate;
    readonly radius: Quantity<"deg">;
  };
  readonly limit?: number;
}

export type SearchMatchKind =
  | "identifier-exact"
  | "name-exact"
  | "name-prefix"
  | "token"
  | "fuzzy"
  | "filter-only";

export interface CatalogueSearchResult {
  readonly object: CatalogueObject;
  readonly score: number;
  readonly matchKind: SearchMatchKind;
  readonly matchedText?: string;
  readonly angularSeparation?: Quantity<"deg">;
  readonly sourceCatalogue: string;
  readonly dataOrigin: "catalogue";
  readonly distance?: CatalogueObject["properties"]["distance"];
}

export interface CatalogueSuggestion {
  readonly objectId: string;
  readonly label: string;
  readonly objectType: ObjectType;
  readonly dataOrigin: "catalogue";
  readonly sourceCatalogue: string;
}

export interface SearchParseIssue {
  readonly token: string;
  readonly message: string;
}

export interface ParsedSearchExpression {
  readonly query: CatalogueSearchQuery;
  readonly issues: readonly SearchParseIssue[];
}

interface SearchDocument {
  readonly object: CatalogueObject;
  readonly normalizedNames: readonly string[];
  readonly normalizedIdentifiers: readonly string[];
  readonly normalizedCatalogues: readonly string[];
  readonly normalizedConstellations: readonly string[];
  readonly normalizedFacets: readonly string[];
  readonly words: readonly string[];
}

const OBJECT_TYPES: ReadonlySet<ObjectType> = new Set([
  "star",
  "planet",
  "dwarf-planet",
  "moon",
  "asteroid",
  "comet",
  "exoplanet",
  "nebula",
  "open-cluster",
  "globular-cluster",
  "supernova-remnant",
  "pulsar",
  "magnetar",
  "black-hole-candidate",
  "galaxy",
  "galaxy-group",
  "galaxy-cluster",
  "large-scale-structure",
  "spacecraft",
  "other",
]);

const DISTANCE_UNITS: readonly DistanceUnit[] = [
  "km",
  "au",
  "ly",
  "pc",
  "kpc",
  "Mpc",
];

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}+\-.]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenizeExpression(expression: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(expression)) !== null) {
    tokens.push(match[1] ?? match[2] ?? "");
  }
  return tokens;
}

function parseDistanceToken(
  token: string,
):
  | { operator: "<" | "<=" | ">" | ">="; quantity: Quantity<DistanceUnit> }
  | undefined {
  const match =
    /^distance(<=|>=|<|>)(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(km|au|ly|pc|kpc|Mpc)$/i.exec(
      token,
    );
  if (!match) return undefined;
  const canonicalUnit = DISTANCE_UNITS.find(
    (unit) => unit.toLocaleLowerCase("en") === match[3].toLocaleLowerCase("en"),
  );
  if (!canonicalUnit) return undefined;
  return {
    operator: match[1] as "<" | "<=" | ">" | ">=",
    quantity: { value: Number(match[2]), unit: canonicalUnit },
  };
}

function parseMagnitudeToken(
  token: string,
):
  { operator: "<" | "<=" | ">" | ">="; quantity: Quantity<"mag"> } | undefined {
  const match = /^mag(<=|>=|<|>)(-?\d+(?:\.\d+)?)$/i.exec(token);
  if (!match) return undefined;
  return {
    operator: match[1] as "<" | "<=" | ">" | ">=",
    quantity: { value: Number(match[2]), unit: "mag" },
  };
}

export function parseSearchExpression(
  expression: string,
): ParsedSearchExpression {
  if (expression.length > 512) {
    return {
      query: {},
      issues: [
        {
          token: expression.slice(0, 32),
          message: "Search expression exceeds the 512-character safety limit.",
        },
      ],
    };
  }
  const issues: SearchParseIssue[] = [];
  const textTokens: string[] = [];
  const objectTypes: ObjectType[] = [];
  let catalogue: string | undefined;
  let constellation: string | undefined;
  let minDistance: Quantity<DistanceUnit> | undefined;
  let maxDistance: Quantity<DistanceUnit> | undefined;
  let minDistanceInclusive = true;
  let maxDistanceInclusive = true;
  let minMagnitude: Quantity<"mag"> | undefined;
  let maxMagnitude: Quantity<"mag"> | undefined;
  let minMagnitudeInclusive = true;
  let maxMagnitudeInclusive = true;
  let ra: number | undefined;
  let dec: number | undefined;
  let radius: number | undefined;

  for (const token of tokenizeExpression(expression)) {
    if (/^type:/i.test(token)) {
      const objectType = normalizeSearchText(
        token.slice(token.indexOf(":") + 1),
      ) as ObjectType;
      if (OBJECT_TYPES.has(objectType)) objectTypes.push(objectType);
      else
        issues.push({ token, message: `Unknown object type "${objectType}".` });
      continue;
    }
    if (/^catalogue:/i.test(token)) {
      catalogue = token.slice(token.indexOf(":") + 1).trim();
      if (!catalogue)
        issues.push({ token, message: "Catalogue filter cannot be empty." });
      continue;
    }
    if (/^(?:constellation|const):/i.test(token)) {
      constellation = token.slice(token.indexOf(":") + 1).trim();
      if (!constellation) {
        issues.push({
          token,
          message: "Constellation filter cannot be empty.",
        });
      }
      continue;
    }

    const distance = parseDistanceToken(token);
    if (distance) {
      if (
        !Number.isFinite(distance.quantity.value) ||
        distance.quantity.value < 0
      ) {
        issues.push({
          token,
          message: "Distance filters must be finite and non-negative.",
        });
      } else if (distance.operator.startsWith("<")) {
        maxDistance = distance.quantity;
        maxDistanceInclusive = distance.operator === "<=";
      } else {
        minDistance = distance.quantity;
        minDistanceInclusive = distance.operator === ">=";
      }
      continue;
    }

    const magnitude = parseMagnitudeToken(token);
    if (magnitude) {
      if (magnitude.operator.startsWith("<")) {
        maxMagnitude = magnitude.quantity;
        maxMagnitudeInclusive = magnitude.operator === "<=";
      } else {
        minMagnitude = magnitude.quantity;
        minMagnitudeInclusive = magnitude.operator === ">=";
      }
      continue;
    }

    const coordinateMatch = /^(ra|dec|radius):(-?\d+(?:\.\d+)?)$/i.exec(token);
    if (coordinateMatch) {
      const value = Number(coordinateMatch[2]);
      switch (coordinateMatch[1].toLocaleLowerCase("en")) {
        case "ra":
          ra = value;
          break;
        case "dec":
          dec = value;
          break;
        default:
          radius = value;
      }
      continue;
    }

    if (/^(distance|mag|ra:|dec:|radius:)/i.test(token)) {
      issues.push({
        token,
        message: "Malformed numeric or coordinate filter.",
      });
      continue;
    }
    textTokens.push(token);
  }

  let near: CatalogueSearchQuery["near"];
  const suppliedCoordinateParts = [ra, dec, radius].filter(
    (value) => value !== undefined,
  ).length;
  if (suppliedCoordinateParts > 0 && suppliedCoordinateParts < 3) {
    issues.push({
      token: "ra/dec/radius",
      message:
        "Coordinate search requires ra:<deg>, dec:<deg>, and radius:<deg>.",
    });
  } else if (suppliedCoordinateParts === 3) {
    try {
      if (
        !Number.isFinite(radius) ||
        (radius ?? 0) <= 0 ||
        (radius ?? 0) > 180
      ) {
        throw new RangeError("Radius must be in (0, 180] degrees.");
      }
      near = {
        coordinate: makeIcrsCoordinate(
          { value: ra!, unit: "deg" },
          { value: dec!, unit: "deg" },
        ),
        radius: { value: radius!, unit: "deg" },
      };
    } catch (error) {
      issues.push({
        token: "ra/dec/radius",
        message:
          error instanceof Error ? error.message : "Invalid coordinate filter.",
      });
    }
  }
  if (
    minDistance &&
    maxDistance &&
    (convertDistance(minDistance, "pc").value >
      convertDistance(maxDistance, "pc").value ||
      (convertDistance(minDistance, "pc").value ===
        convertDistance(maxDistance, "pc").value &&
        (!minDistanceInclusive || !maxDistanceInclusive)))
  ) {
    issues.push({
      token: "distance",
      message: "Minimum distance cannot exceed maximum distance.",
    });
  }
  if (
    minMagnitude &&
    maxMagnitude &&
    (minMagnitude.value > maxMagnitude.value ||
      (minMagnitude.value === maxMagnitude.value &&
        (!minMagnitudeInclusive || !maxMagnitudeInclusive)))
  ) {
    issues.push({
      token: "mag",
      message: "Minimum magnitude cannot exceed maximum magnitude.",
    });
  }

  return {
    query: {
      text: textTokens.join(" ").trim() || undefined,
      objectTypes: objectTypes.length > 0 ? objectTypes : undefined,
      catalogue: catalogue || undefined,
      constellation: constellation || undefined,
      minDistance,
      minDistanceInclusive,
      maxDistance,
      maxDistanceInclusive,
      minApparentMagnitude: minMagnitude,
      minApparentMagnitudeInclusive: minMagnitudeInclusive,
      maxApparentMagnitude: maxMagnitude,
      maxApparentMagnitudeInclusive: maxMagnitudeInclusive,
      near,
    },
    issues,
  };
}

function levenshteinDistance(
  first: string,
  second: string,
  maximum: number,
): number {
  if (Math.abs(first.length - second.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    let rowMinimum = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitution =
        previous[secondIndex - 1] +
        (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1);
      const value = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        substitution,
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[second.length];
}

function buildDocument(object: CatalogueObject): SearchDocument {
  const normalizedNames = [object.names.primary, ...object.names.common].map(
    normalizeSearchText,
  );
  const normalizedIdentifiers = [
    ...new Set(
      object.catalogueIdentifiers.flatMap((identifier) => {
        const catalogue = normalizeSearchText(identifier.catalogue);
        const value = normalizeSearchText(identifier.value);
        const compactValue = value.replace(/[\s-]+/g, "");
        return [`${catalogue} ${value}`, value, compactValue];
      }),
    ),
  ];
  const normalizedCatalogues = object.catalogueIdentifiers.map((identifier) =>
    normalizeSearchText(identifier.catalogue),
  );
  const normalizedConstellations = object.constellation
    ? [
        normalizeSearchText(object.constellation.abbreviation),
        normalizeSearchText(object.constellation.name),
      ]
    : [];
  const normalizedFacets = [
    normalizeSearchText(object.objectType),
    ...normalizedCatalogues,
    ...normalizedConstellations,
  ];
  return {
    object,
    normalizedNames,
    normalizedIdentifiers,
    normalizedCatalogues,
    normalizedConstellations,
    normalizedFacets,
    words: [
      ...new Set(
        [
          ...normalizedNames,
          ...normalizedIdentifiers,
          ...normalizedFacets,
        ].flatMap((text) => text.split(" ").filter(Boolean)),
      ),
    ],
  };
}

function scoreText(
  document: SearchDocument,
  queryText: string | undefined,
):
  | { score: number; matchKind: SearchMatchKind; matchedText?: string }
  | undefined {
  const query = normalizeSearchText(queryText ?? "");
  if (!query) return { score: 0, matchKind: "filter-only" };

  const identifierExact = document.normalizedIdentifiers.find(
    (identifier) => identifier === query,
  );
  if (identifierExact) {
    return {
      score: 120,
      matchKind: "identifier-exact",
      matchedText: identifierExact,
    };
  }
  const nameExact = document.normalizedNames.find((name) => name === query);
  if (nameExact)
    return { score: 110, matchKind: "name-exact", matchedText: nameExact };

  const namePrefix = document.normalizedNames.find((name) =>
    name.startsWith(query),
  );
  if (namePrefix)
    return { score: 80, matchKind: "name-prefix", matchedText: namePrefix };

  const queryWords = query.split(" ");
  const searchable = [
    ...document.normalizedNames,
    ...document.normalizedIdentifiers,
    ...document.normalizedFacets,
  ].join(" ");
  if (queryWords.every((word) => searchable.includes(word))) {
    return {
      score: 60 + queryWords.length,
      matchKind: "token",
      matchedText: query,
    };
  }

  const maximumDistance = query.length <= 5 ? 1 : 2;
  let bestDistance = maximumDistance + 1;
  let bestWord: string | undefined;
  for (const word of document.words) {
    const distance = levenshteinDistance(query, word, maximumDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestWord = word;
    }
  }
  if (bestDistance <= maximumDistance) {
    return {
      score: 30 - bestDistance * 5,
      matchKind: "fuzzy",
      matchedText: bestWord,
    };
  }
  return undefined;
}

function withinDistanceFilter(
  object: CatalogueObject,
  minimum: Quantity<DistanceUnit> | undefined,
  maximum: Quantity<DistanceUnit> | undefined,
  minimumInclusive = true,
  maximumInclusive = true,
): boolean {
  if (!minimum && !maximum) return true;
  const distance = object.properties.distance;
  if (!distance) return false;
  const parsecs = convertDistance(distance.quantity, "pc").value;
  if (minimum) {
    const minimumParsecs = convertDistance(minimum, "pc").value;
    if (
      parsecs < minimumParsecs ||
      (!minimumInclusive && parsecs === minimumParsecs)
    ) {
      return false;
    }
  }
  if (maximum) {
    const maximumParsecs = convertDistance(maximum, "pc").value;
    if (
      parsecs > maximumParsecs ||
      (!maximumInclusive && parsecs === maximumParsecs)
    ) {
      return false;
    }
  }
  return true;
}

function withinMagnitudeFilter(
  object: CatalogueObject,
  minimum: Quantity<"mag"> | undefined,
  maximum: Quantity<"mag"> | undefined,
  minimumInclusive = true,
  maximumInclusive = true,
): boolean {
  if (!minimum && !maximum) return true;
  const magnitude = object.properties.apparentMagnitude?.quantity.value;
  if (magnitude === undefined) return false;
  if (
    minimum &&
    (magnitude < minimum.value ||
      (!minimumInclusive && magnitude === minimum.value))
  ) {
    return false;
  }
  if (
    maximum &&
    (magnitude > maximum.value ||
      (!maximumInclusive && magnitude === maximum.value))
  ) {
    return false;
  }
  return true;
}

function equatorialCoordinateOf(
  object: CatalogueObject,
): EquatorialCoordinate | undefined {
  return object.coordinate?.kind === "equatorial"
    ? object.coordinate
    : undefined;
}

export class CatalogueIndex {
  readonly #documents: readonly SearchDocument[];

  public constructor(objects: readonly CatalogueObject[]) {
    const ids = new Set<string>();
    this.#documents = objects.map((candidate) => {
      const object = assertValidCatalogueObject(candidate);
      if (ids.has(object.id)) {
        throw new TypeError(`Duplicate catalogue object ID: ${object.id}`);
      }
      ids.add(object.id);
      return buildDocument(object);
    });
  }

  public search(query: CatalogueSearchQuery): readonly CatalogueSearchResult[] {
    const limit = query.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("Search limit must be an integer from 1 to 100.");
    }
    if ((query.text?.length ?? 0) > 256) {
      throw new RangeError(
        "Search text exceeds the 256-character safety limit.",
      );
    }
    if (
      query.near &&
      (query.near.radius.value <= 0 || query.near.radius.value > 180)
    ) {
      throw new RangeError(
        "Angular search radius must be in (0, 180] degrees.",
      );
    }

    const results: CatalogueSearchResult[] = [];
    for (const document of this.#documents) {
      const { object } = document;
      if (query.objectTypes && !query.objectTypes.includes(object.objectType))
        continue;
      if (
        query.catalogue &&
        !document.normalizedCatalogues.includes(
          normalizeSearchText(query.catalogue),
        )
      ) {
        continue;
      }
      if (
        query.constellation &&
        !document.normalizedConstellations.includes(
          normalizeSearchText(query.constellation),
        )
      ) {
        continue;
      }
      if (
        !withinDistanceFilter(
          object,
          query.minDistance,
          query.maxDistance,
          query.minDistanceInclusive,
          query.maxDistanceInclusive,
        )
      ) {
        continue;
      }
      if (
        !withinMagnitudeFilter(
          object,
          query.minApparentMagnitude,
          query.maxApparentMagnitude,
          query.minApparentMagnitudeInclusive,
          query.maxApparentMagnitudeInclusive,
        )
      ) {
        continue;
      }

      let separation: Quantity<"deg"> | undefined;
      if (query.near) {
        const coordinate = equatorialCoordinateOf(object);
        if (!coordinate) continue;
        separation = angularSeparation(query.near.coordinate, coordinate);
        if (separation.value > query.near.radius.value) continue;
      }

      const textScore = scoreText(document, query.text);
      if (!textScore) continue;
      const proximityBonus =
        query.near && separation
          ? Math.max(0, 10 * (1 - separation.value / query.near.radius.value))
          : 0;
      results.push({
        object,
        score: textScore.score + proximityBonus,
        matchKind: textScore.matchKind,
        matchedText: textScore.matchedText,
        angularSeparation: separation,
        sourceCatalogue: object.provenance[0]?.dataset ?? "Unknown catalogue",
        dataOrigin: "catalogue",
        distance: object.properties.distance,
      });
    }

    return results
      .sort(
        (first, second) =>
          second.score - first.score ||
          first.object.names.primary.localeCompare(
            second.object.names.primary,
            "en",
            { sensitivity: "base" },
          ) ||
          first.object.id.localeCompare(second.object.id, "en"),
      )
      .slice(0, limit);
  }

  public suggest(text: string, limit = 8): readonly CatalogueSuggestion[] {
    if (!normalizeSearchText(text)) return [];
    return this.search({ text, limit }).map((result) => ({
      objectId: result.object.id,
      label: result.object.names.primary,
      objectType: result.object.objectType,
      dataOrigin: "catalogue",
      sourceCatalogue: result.sourceCatalogue,
    }));
  }
}

export function createCatalogueIndex(
  objects: readonly CatalogueObject[],
): CatalogueIndex {
  return new CatalogueIndex(objects);
}
