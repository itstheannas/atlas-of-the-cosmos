import {
  dataSources,
  sourceById,
  type EditorialDataSource,
} from "../cosmos-data.ts";
import { ApiProblem } from "./api-error.ts";

export function projectDataSource(source: EditorialDataSource) {
  return {
    id: source.id,
    provider: source.provider,
    dataset: source.dataset,
    version: source.version,
    publicationOrSnapshotDate: source.publicationOrSnapshotDate,
    access: {
      method: source.accessMethod,
      url: source.url,
    },
    licence: source.licence,
    attribution: source.attribution,
    citation: {
      text: source.citation,
      url: source.citationUrl,
    },
    updateStrategy: source.updateStrategy,
    coordinateSystem: source.coordinateSystem,
    units: [...source.units],
    uncertaintyFields: source.uncertaintyFields,
    validationRules: [...source.validationRules],
    transformations: [...source.transformations],
    knownLimitations: [...source.knownLimitations],
  };
}

export function listDataSources() {
  return {
    items: [...dataSources]
      .sort(
        (first, second) =>
          first.provider.localeCompare(second.provider, "en", {
            sensitivity: "base",
          }) || first.id.localeCompare(second.id, "en"),
      )
      .map(projectDataSource),
    total: dataSources.length,
  };
}

export function getDataSource(id: string) {
  const source = sourceById.get(id);
  if (!source) {
    throw new ApiProblem(
      "NOT_FOUND",
      "The requested data source was not found.",
    );
  }
  return { source: projectDataSource(source) };
}
