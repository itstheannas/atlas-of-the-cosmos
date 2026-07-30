"use client";

import { useMemo, useState } from "react";
import {
  cosmosCatalogue,
  sourceById,
  type CosmosExhibit,
} from "../../lib/cosmos-data";
import { formatUiMessage, type UiCopy } from "../../lib/i18n";
import { normalizeSearchText } from "../../packages/catalogue-client/src/search";
import { ComparisonView } from "./ComparisonView";
import { cssVars } from "./css-vars";

interface CatalogueViewProps {
  readonly copy: UiCopy;
  readonly compareIds: readonly string[];
  readonly initialObjects?: readonly CosmosExhibit[];
  readonly title?: string;
  readonly description?: string;
  readonly onCompareToggle: (objectId: string) => void;
  readonly onOpenObject: (object: CosmosExhibit, fly: boolean) => void;
}

const pageSize = 12;

export function CatalogueView({
  copy,
  compareIds,
  initialObjects = cosmosCatalogue,
  title = copy.catalogueTitle,
  description = copy.catalogueDek,
  onCompareToggle,
  onOpenObject,
}: CatalogueViewProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sort, setSort] = useState<"name" | "type" | "distance">("name");
  const [page, setPage] = useState(1);

  const objectTypes = useMemo(
    () =>
      [...new Set(initialObjects.map((object) => object.objectType))].sort(
        (first, second) => first.localeCompare(second, "en"),
      ),
    [initialObjects],
  );
  const sourceIds = useMemo(
    () =>
      [...new Set(initialObjects.flatMap((object) => object.sourceIds))].sort(
        (first, second) => first.localeCompare(second, "en"),
      ),
    [initialObjects],
  );

  const filtered = useMemo(() => {
    const normalized = normalizeSearchText(query);
    return initialObjects
      .filter((object) => {
        if (
          normalized &&
          !normalizeSearchText(
            [
              object.name,
              object.scientificName ?? "",
              object.objectType,
              ...object.aliases,
              ...object.catalogueIds,
            ].join(" "),
          ).includes(normalized)
        ) {
          return false;
        }
        if (typeFilter !== "all" && object.objectType !== typeFilter) {
          return false;
        }
        if (
          sourceFilter !== "all" &&
          !object.sourceIds.includes(sourceFilter)
        ) {
          return false;
        }
        return true;
      })
      .sort((first, second) => {
        if (sort === "type") {
          return (
            first.objectType.localeCompare(second.objectType, "en") ||
            first.name.localeCompare(second.name, "en")
          );
        }
        if (sort === "distance") {
          const firstDistance =
            typeof first.distance?.value === "number"
              ? first.distance.value
              : Number.POSITIVE_INFINITY;
          const secondDistance =
            typeof second.distance?.value === "number"
              ? second.distance.value
              : Number.POSITIVE_INFINITY;
          return (
            firstDistance - secondDistance ||
            first.name.localeCompare(second.name, "en")
          );
        }
        return first.name.localeCompare(second.name, "en");
      });
  }, [initialObjects, query, sort, sourceFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const comparisonObjects = compareIds
    .map((objectId) => cosmosCatalogue.find((object) => object.id === objectId))
    .filter((object): object is CosmosExhibit => object !== undefined);

  return (
    <div className="content-view catalogue-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">{copy.catalogueView.eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div
          className="dataset-seal"
          aria-label={copy.catalogueView.datasetStatus}
        >
          <span>49</span>
          <small>{copy.catalogueObjects}</small>
          <em>{copy.catalogueView.snapshot}</em>
        </div>
      </header>

      <section className="catalogue-toolbar" aria-label={copy.filters}>
        <label className="catalogue-search">
          <span className="sr-only">{copy.commandSearch}</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            placeholder={copy.catalogueView.searchPlaceholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span>{copy.objectType}</span>
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">{copy.allTypes}</option>
            {objectTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.source}</span>
          <select
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">{copy.allSources}</option>
            {sourceIds.map((sourceId) => (
              <option value={sourceId} key={sourceId}>
                {sourceById.get(sourceId)?.provider ?? sourceId}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.sortBy}</span>
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as "name" | "type" | "distance")
            }
          >
            <option value="name">{copy.name}</option>
            <option value="type">{copy.objectType}</option>
            <option value="distance">{copy.distance}</option>
          </select>
        </label>
      </section>

      <div className="catalogue-count" role="status" aria-live="polite">
        <strong>{filtered.length}</strong> {copy.results}
        <span>{copy.catalogueView.evidenceNotice}</span>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">∅</span>
          <p>{copy.noSearchResults}</p>
        </div>
      ) : (
        <div className="catalogue-grid">
          {visible.map((object) => {
            const source = sourceById.get(object.sourceIds[0] ?? "");
            const compared = compareIds.includes(object.id);
            return (
              <article className="catalogue-card" key={object.id}>
                <button
                  type="button"
                  className="catalogue-card-main"
                  onClick={() => onOpenObject(object, false)}
                >
                  <span
                    className="catalogue-card-visual"
                    style={cssVars({
                      "--object-colour": object.visual.colour,
                    })}
                    aria-hidden="true"
                  >
                    {object.visual.glyph}
                  </span>
                  <span className="badge-row">
                    <span className={`data-badge kind-${object.recordKind}`}>
                      {copy.statusLabels.recordKinds[object.recordKind]}
                    </span>
                    <span
                      className={`evidence-badge status-${object.evidenceStatus}`}
                    >
                      {object.evidenceStatus}
                    </span>
                  </span>
                  <span>
                    <small>{object.objectType}</small>
                    <strong>{object.name}</strong>
                    <em>{object.catalogueIds.slice(0, 2).join(" · ")}</em>
                  </span>
                  <span className="catalogue-card-distance">
                    {object.distance?.display ?? copy.unknown}
                  </span>
                  <span className="catalogue-card-source">
                    {source?.dataset ?? source?.provider ?? copy.curatedSample}
                  </span>
                </button>
                <div className="catalogue-card-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onOpenObject(object, true)}
                  >
                    ◎ {copy.flyTo}
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={compared}
                      disabled={!compared && compareIds.length >= 3}
                      onChange={() => onCompareToggle(object.id)}
                    />
                    {copy.compare}
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pageCount > 1 ? (
        <nav className="pagination" aria-label={copy.catalogueView.pagesLabel}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            {copy.catalogueView.previousPage}
          </button>
          <span>
            {formatUiMessage(copy.catalogueView.pageStatus, {
              current: currentPage,
              total: pageCount,
            })}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            {copy.catalogueView.nextPage}
          </button>
        </nav>
      ) : null}

      <ComparisonView
        copy={copy}
        objects={comparisonObjects}
        onRemove={onCompareToggle}
      />
    </div>
  );
}
