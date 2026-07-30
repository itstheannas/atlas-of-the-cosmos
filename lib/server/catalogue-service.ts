import {
  catalogueById,
  catalogueNotice,
  cosmosCatalogue,
  getScientificSourceLink,
  sourceById,
  type CoordinateSnapshot,
  type CosmosExhibit,
  type ScientificDisplayValue,
} from "../cosmos-data.ts";
import { normalizeSearchText } from "../../packages/catalogue-client/src/search.ts";
import type { CursorPage } from "./api-contracts.ts";
import { ApiProblem, invalidField } from "./api-error.ts";
import { stableHash } from "./cache.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 160;
const MAX_CURSOR_LENGTH = 256;
const ALLOWED_QUERY_PARAMETERS = new Set([
  "q",
  "type",
  "source",
  "limit",
  "cursor",
]);

type SearchMatchKind =
  | "identifier-exact"
  | "name-exact"
  | "name-prefix"
  | "token"
  | "fuzzy"
  | "filter-only";

interface SearchDocument {
  readonly object: CosmosExhibit;
  readonly names: readonly string[];
  readonly identifiers: readonly string[];
  readonly searchable: string;
  readonly words: readonly string[];
}

interface ScoredObject {
  readonly object: CosmosExhibit;
  readonly score: number;
  readonly matchKind: SearchMatchKind;
}

interface ParsedCatalogueQuery {
  readonly q?: string;
  readonly normalizedQ?: string;
  readonly type?: string;
  readonly source?: string;
  readonly limit: number;
  readonly cursor?: string;
}

interface CursorPayload {
  readonly v: 1;
  readonly o: number;
  readonly s: string;
}

const catalogueRevision = stableHash(
  JSON.stringify({
    objects: cosmosCatalogue,
    sources: [...sourceById.values()],
  }),
);

const supportedTypes = new Map(
  [...new Set(cosmosCatalogue.map((object) => object.objectType))].map(
    (objectType) => [normalizeSearchText(objectType), objectType],
  ),
);

const supportedSources = new Map(
  [...sourceById.keys()].map((sourceId) => [
    normalizeSearchText(sourceId),
    sourceId,
  ]),
);

function projectScientificValue(value: ScientificDisplayValue) {
  return {
    label: value.label,
    value: value.value,
    unit: value.unit,
    display: value.display,
    evidenceStatus: value.status,
    uncertainty: value.uncertainty ?? null,
    note: value.note ?? null,
    sourceId: value.sourceId,
  };
}

function projectCoordinates(coordinates: CoordinateSnapshot) {
  return {
    frame: coordinates.frame,
    epoch: coordinates.epoch,
    longitudeDeg: coordinates.longitudeDeg ?? null,
    latitudeDeg: coordinates.latitudeDeg ?? null,
    rightAscension: coordinates.rightAscension ?? null,
    declination: coordinates.declination ?? null,
    sourceId: coordinates.sourceId,
    note: coordinates.note,
  };
}

function projectSourceLabels(object: CosmosExhibit) {
  return object.sourceIds.map((sourceId) => {
    const source = sourceById.get(sourceId);
    const recordLink = getScientificSourceLink(object, sourceId);
    return {
      id: sourceId,
      provider: source?.provider ?? "Unknown provider",
      dataset: source?.dataset ?? "Unknown dataset",
      version: source?.version ?? "Unknown version",
      citation: source?.citation ?? "Unknown citation",
      citationUrl: source?.citationUrl ?? null,
      recordUrl: recordLink?.url ?? source?.url ?? null,
      recordIdentifier: recordLink?.recordIdentifier ?? null,
      linkScope: recordLink?.scope ?? null,
    };
  });
}

export function projectCatalogueObject(object: CosmosExhibit) {
  return {
    id: object.id,
    slug: object.slug,
    name: object.name,
    scientificName: object.scientificName ?? null,
    aliases: [...object.aliases],
    objectType: object.objectType,
    scaleLayerId: object.scaleLayerId,
    dataClassification: {
      recordKind: object.recordKind,
      evidenceStatus: object.evidenceStatus,
      catalogueBacked: object.recordKind === "catalogue-backed",
    },
    catalogueIdentifiers: [...object.catalogueIds],
    summary: object.summary,
    significance: object.significance,
    distance: object.distance ? projectScientificValue(object.distance) : null,
    facts: object.facts.map(projectScientificValue),
    coordinates: object.coordinates
      ? projectCoordinates(object.coordinates)
      : null,
    relationships: {
      parentId: object.parentId ?? null,
      childIds: cosmosCatalogue
        .filter((candidate) => candidate.parentId === object.id)
        .map((candidate) => candidate.id),
      relatedIds: [...object.relatedIds],
    },
    sources: projectSourceLabels(object),
    provenance: {
      sampleStatus: object.provenance.sampleStatus,
      retrievedOn: object.provenance.retrievedOn,
      transformations: [...object.provenance.transformations],
      caveat: object.provenance.caveat,
    },
    uncertaintySummary: object.uncertaintySummary,
  };
}

function projectSearchResult(result: ScoredObject) {
  const { object } = result;
  return {
    id: object.id,
    slug: object.slug,
    name: object.name,
    scientificName: object.scientificName ?? null,
    objectType: object.objectType,
    scaleLayerId: object.scaleLayerId,
    dataClassification: {
      recordKind: object.recordKind,
      evidenceStatus: object.evidenceStatus,
      catalogueBacked: object.recordKind === "catalogue-backed",
    },
    catalogueIdentifiers: [...object.catalogueIds],
    distance: object.distance ? projectScientificValue(object.distance) : null,
    sources: projectSourceLabels(object),
    match: {
      kind: result.matchKind,
    },
  };
}

function buildSearchDocument(object: CosmosExhibit): SearchDocument {
  const names = [object.name, object.scientificName, ...object.aliases]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeSearchText);
  const identifiers = [object.id, object.slug, ...object.catalogueIds].map(
    normalizeSearchText,
  );
  const facets = [
    object.objectType,
    object.scaleLayerId,
    object.recordKind,
    ...object.sourceIds,
  ].map(normalizeSearchText);
  const searchableValues = [...names, ...identifiers, ...facets];

  return {
    object,
    names,
    identifiers,
    searchable: searchableValues.join(" "),
    words: [
      ...new Set(
        searchableValues.flatMap((value) => value.split(" ").filter(Boolean)),
      ),
    ],
  };
}

const searchDocuments = cosmosCatalogue.map(buildSearchDocument);

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

function fuzzyTokenDistance(
  queryToken: string,
  words: readonly string[],
): number | undefined {
  const maximum = queryToken.length <= 5 ? 1 : 2;
  let best = maximum + 1;

  for (const word of words) {
    const distance = levenshteinDistance(queryToken, word, maximum);
    if (distance < best) best = distance;
  }

  return best <= maximum ? best : undefined;
}

function scoreDocument(
  document: SearchDocument,
  query: string | undefined,
): Omit<ScoredObject, "object"> | undefined {
  if (!query) return { score: 0, matchKind: "filter-only" };

  if (document.identifiers.includes(query)) {
    return { score: 130, matchKind: "identifier-exact" };
  }
  if (document.names.includes(query)) {
    return { score: 120, matchKind: "name-exact" };
  }
  if (document.names.some((name) => name.startsWith(query))) {
    return { score: 90, matchKind: "name-prefix" };
  }

  const queryWords = query.split(" ");
  if (queryWords.every((word) => document.searchable.includes(word))) {
    return { score: 60 + queryWords.length, matchKind: "token" };
  }

  if (queryWords.some((word) => word.length < 3)) return undefined;
  const fuzzyDistances = queryWords.map((word) =>
    fuzzyTokenDistance(word, document.words),
  );
  if (fuzzyDistances.some((distance) => distance === undefined)) {
    return undefined;
  }

  const totalDistance = fuzzyDistances.reduce<number>(
    (total, distance) => total + (distance ?? 0),
    0,
  );
  return { score: 35 - totalDistance * 5, matchKind: "fuzzy" };
}

function readUniqueParameter(
  parameters: URLSearchParams,
  name: string,
): string | undefined {
  const values = parameters.getAll(name);
  if (values.length > 1) {
    throw invalidField(name, "Duplicate query parameters are not allowed.");
  }
  return values[0];
}

function parseCatalogueQuery(
  parameters: URLSearchParams,
): ParsedCatalogueQuery {
  for (const name of parameters.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(name)) {
      throw invalidField(name, "Unknown query parameter.");
    }
  }

  const rawQuery = readUniqueParameter(parameters, "q");
  let q: string | undefined;
  let normalizedQ: string | undefined;
  if (rawQuery !== undefined) {
    q = rawQuery.trim();
    if (
      q.length === 0 ||
      q.length > MAX_QUERY_LENGTH ||
      /[\u0000-\u001f\u007f]/u.test(q)
    ) {
      throw invalidField(
        "q",
        `Search text must contain 1 to ${MAX_QUERY_LENGTH} printable characters.`,
      );
    }
    normalizedQ = normalizeSearchText(q);
    if (!normalizedQ) {
      throw invalidField("q", "Search text must contain letters or numbers.");
    }
  }

  const rawType = readUniqueParameter(parameters, "type");
  let type: string | undefined;
  if (rawType !== undefined) {
    if (rawType.length === 0 || rawType.length > 80) {
      throw invalidField(
        "type",
        "Object type must contain 1 to 80 characters.",
      );
    }
    type = supportedTypes.get(normalizeSearchText(rawType));
    if (!type) {
      throw invalidField("type", "Unsupported object type.");
    }
  }

  const rawSource = readUniqueParameter(parameters, "source");
  let source: string | undefined;
  if (rawSource !== undefined) {
    if (rawSource.length === 0 || rawSource.length > 80) {
      throw invalidField(
        "source",
        "Source identifier must contain 1 to 80 characters.",
      );
    }
    source = supportedSources.get(normalizeSearchText(rawSource));
    if (!source) {
      throw invalidField("source", "Unsupported source identifier.");
    }
  }

  const rawLimit = readUniqueParameter(parameters, "limit");
  let limit = DEFAULT_LIMIT;
  if (rawLimit !== undefined) {
    if (!/^[1-9]\d*$/.test(rawLimit)) {
      throw invalidField("limit", "Limit must be a positive integer.");
    }
    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit > MAX_LIMIT) {
      throw invalidField("limit", `Limit must be between 1 and ${MAX_LIMIT}.`);
    }
  }

  const cursor = readUniqueParameter(parameters, "cursor");
  if (
    cursor !== undefined &&
    (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH)
  ) {
    throw invalidField("cursor", "Cursor length is invalid.", "INVALID_CURSOR");
  }

  return { q, normalizedQ, type, source, limit, cursor };
}

function cursorScope(query: ParsedCatalogueQuery): string {
  return stableHash(
    JSON.stringify({
      revision: catalogueRevision,
      q: query.normalizedQ ?? null,
      type: query.type ?? null,
      source: query.source ?? null,
    }),
  );
}

function encodeCursor(offset: number, scope: string): string {
  const payload: CursorPayload = { v: 1, o: offset, s: scope };
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function decodeCursor(cursor: string, expectedScope: string): number {
  if (!/^[A-Za-z0-9_-]+$/u.test(cursor)) {
    throw invalidField(
      "cursor",
      "Cursor encoding is invalid.",
      "INVALID_CURSOR",
    );
  }

  try {
    const paddingLength = (4 - (cursor.length % 4)) % 4;
    const encoded = cursor.replace(/-/g, "+").replace(/_/g, "/");
    const parsed: unknown = JSON.parse(
      atob(encoded + "=".repeat(paddingLength)),
    );

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new TypeError("Invalid cursor payload.");
    }

    const candidate = parsed as Record<string, unknown>;
    const keys = Object.keys(candidate).sort().join(",");
    if (
      keys !== "o,s,v" ||
      candidate.v !== 1 ||
      !Number.isSafeInteger(candidate.o) ||
      (candidate.o as number) < 1 ||
      typeof candidate.s !== "string"
    ) {
      throw new TypeError("Invalid cursor fields.");
    }

    if (candidate.s !== expectedScope) {
      throw new ApiProblem(
        "CURSOR_MISMATCH",
        "The cursor does not belong to this catalogue query.",
        [
          {
            field: "cursor",
            issue: "Restart pagination after changing search filters.",
          },
        ],
      );
    }

    return candidate.o as number;
  } catch (error) {
    if (error instanceof ApiProblem) throw error;
    throw invalidField(
      "cursor",
      "Cursor encoding is invalid.",
      "INVALID_CURSOR",
    );
  }
}

export function searchCatalogue(url: URL) {
  const query = parseCatalogueQuery(url.searchParams);
  const scope = cursorScope(query);
  const offset = query.cursor ? decodeCursor(query.cursor, scope) : 0;

  const results: ScoredObject[] = [];
  for (const document of searchDocuments) {
    if (query.type && document.object.objectType !== query.type) continue;
    if (query.source && !document.object.sourceIds.includes(query.source)) {
      continue;
    }

    const score = scoreDocument(document, query.normalizedQ);
    if (!score) continue;
    results.push({ object: document.object, ...score });
  }

  results.sort(
    (first, second) =>
      second.score - first.score ||
      first.object.name.localeCompare(second.object.name, "en", {
        sensitivity: "base",
      }) ||
      first.object.id.localeCompare(second.object.id, "en"),
  );

  if (offset > results.length) {
    throw invalidField(
      "cursor",
      "Cursor position is outside the current result set.",
      "INVALID_CURSOR",
    );
  }

  const pageResults = results.slice(offset, offset + query.limit);
  const nextOffset = offset + pageResults.length;
  const page: CursorPage = {
    limit: query.limit,
    returned: pageResults.length,
    total: results.length,
    nextCursor:
      nextOffset < results.length ? encodeCursor(nextOffset, scope) : null,
  };

  return {
    catalogue: {
      revision: catalogueRevision,
      sampleStatus: "curated-educational-sample" as const,
      completenessNotice: catalogueNotice.body,
    },
    query: {
      q: query.q ?? null,
      type: query.type ?? null,
      source: query.source ?? null,
    },
    items: pageResults.map(projectSearchResult),
    page,
  };
}

export function getCatalogueObject(id: string) {
  const object = catalogueById.get(id);
  if (!object) {
    throw new ApiProblem(
      "NOT_FOUND",
      "The requested catalogue object was not found.",
    );
  }

  return {
    object: projectCatalogueObject(object),
    catalogue: {
      revision: catalogueRevision,
      sampleStatus: "curated-educational-sample" as const,
      completenessNotice: catalogueNotice.body,
    },
  };
}

export function getCatalogueCapabilities() {
  return {
    revision: catalogueRevision,
    objectCount: cosmosCatalogue.length,
    supportedTypes: [...supportedTypes.values()].sort((first, second) =>
      first.localeCompare(second, "en", { sensitivity: "base" }),
    ),
    supportedSources: [...supportedSources.values()].sort(),
    maximumPageSize: MAX_LIMIT,
  };
}
