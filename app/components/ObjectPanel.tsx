"use client";

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import {
  catalogueById,
  cosmosCatalogue,
  getObjectSourceLinks,
  getScientificSourceLink,
  guidedTours,
  sourceById,
  type CosmosExhibit,
  type EditorialEvidenceStatus,
} from "../../lib/cosmos-data";
import { formatNumber, formatUiMessage, type UiCopy } from "../../lib/i18n";
import { cssVars } from "./css-vars";

interface ObjectPanelProps {
  readonly copy: UiCopy;
  readonly object: CosmosExhibit;
  readonly bookmarked: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly onBack: () => void;
  readonly onBookmarkToggle: () => void;
  readonly onClose: () => void;
  readonly onFlyTo: (object: CosmosExhibit) => void;
  readonly onForward: () => void;
  readonly onRelatedSelect: (object: CosmosExhibit) => void;
}

function evidenceLabel(copy: UiCopy, status: EditorialEvidenceStatus): string {
  const labels: Record<EditorialEvidenceStatus, string> = {
    observed: copy.observed,
    derived: copy.derived,
    estimated: copy.estimated,
    modelled: copy.modelled,
    conceptual: copy.conceptual,
    unknown: copy.unknown,
  };
  return labels[status];
}

function externalLinkAttributes(url: string) {
  return url.startsWith("https://")
    ? ({ target: "_blank", rel: "noreferrer" } as const)
    : {};
}

function InlineScientificSource({
  object,
  sourceId,
  prefix = "Source",
}: {
  readonly object: CosmosExhibit;
  readonly sourceId: string;
  readonly prefix?: string;
}) {
  const source = sourceById.get(sourceId);
  const link = getScientificSourceLink(object, sourceId);
  if (!source || !link) return null;

  return (
    <a
      className="measurement-source"
      href={link.url}
      {...externalLinkAttributes(link.url)}
    >
      {prefix}: {source.provider}
      {link.recordIdentifier ? ` · ${link.recordIdentifier}` : ""} ↗
    </a>
  );
}

export function ObjectPanel({
  copy,
  object,
  bookmarked,
  canGoBack,
  canGoForward,
  onBack,
  onBookmarkToggle,
  onClose,
  onFlyTo,
  onForward,
  onRelatedSelect,
}: ObjectPanelProps) {
  const [tab, setTab] = useState<"overview" | "science" | "sources">(
    "overview",
  );
  const tabIds = ["overview", "science", "sources"] as const;
  const tabRefs = useRef<
    Record<(typeof tabIds)[number], HTMLButtonElement | null>
  >({
    overview: null,
    science: null,
    sources: null,
  });
  const tabPanelId = "object-panel-tabpanel";

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentTab: (typeof tabIds)[number],
  ): void {
    const currentIndex = tabIds.indexOf(currentTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % tabIds.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabIds.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabIds[nextIndex];
    setTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }
  const sources = object.sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source) => source !== undefined);
  const sourceLinksById = new Map(
    getObjectSourceLinks(object).map((link) => [link.sourceId, link]),
  );
  const parent = object.parentId
    ? catalogueById.get(object.parentId)
    : undefined;
  const relationshipIds = new Set<string>();
  const relationships = [
    ...(parent ? [{ object: parent, relationship: "parent" as const }] : []),
    ...cosmosCatalogue
      .filter((candidate) => candidate.parentId === object.id)
      .map((candidate) => ({
        object: candidate,
        relationship: "child" as const,
      })),
    ...object.relatedIds
      .map((relatedId) => catalogueById.get(relatedId))
      .filter((related) => related !== undefined)
      .map((related) => ({
        object: related,
        relationship: "related" as const,
      })),
  ].filter(({ object: related }) => {
    if (relationshipIds.has(related.id)) return false;
    relationshipIds.add(related.id);
    return true;
  });
  const tourAppearances = guidedTours.flatMap((tour) =>
    tour.chapters.flatMap((chapter, chapterIndex) =>
      chapter.waypoint.targetObjectId === object.id
        ? [{ tour, chapter, chapterIndex }]
        : [],
    ),
  );

  return (
    <aside
      className="object-panel"
      aria-labelledby="object-panel-title"
      data-testid="object-panel"
    >
      <div className="object-panel-grabber" aria-hidden="true" />
      <div className="object-panel-toolbar">
        <div className="history-controls" aria-label={copy.objectPanel.history}>
          <button
            type="button"
            className="icon-button"
            disabled={!canGoBack}
            aria-label={copy.back}
            onClick={onBack}
          >
            ←
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!canGoForward}
            aria-label={copy.forward}
            onClick={onForward}
          >
            →
          </button>
        </div>
        <div className="object-panel-actions">
          <button
            type="button"
            className={`icon-button ${bookmarked ? "is-active" : ""}`}
            aria-label={bookmarked ? copy.removeBookmark : copy.bookmark}
            aria-pressed={bookmarked}
            onClick={onBookmarkToggle}
          >
            {bookmarked ? "★" : "☆"}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={copy.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <header className="object-panel-header">
        <div
          className="object-portrait"
          style={cssVars({ "--object-colour": object.visual.colour })}
          aria-hidden="true"
        >
          <span>{object.visual.glyph}</span>
        </div>
        <div>
          <div className="badge-row">
            <span className={`data-badge kind-${object.recordKind}`}>
              {object.recordKind === "catalogue-backed"
                ? copy.catalogueBacked
                : copy.statusLabels.recordKinds[object.recordKind]}
            </span>
            <span className={`evidence-badge status-${object.evidenceStatus}`}>
              {evidenceLabel(copy, object.evidenceStatus)}
            </span>
          </div>
          <p className="eyebrow">{object.objectType}</p>
          <h2 id="object-panel-title">{object.name}</h2>
          {object.scientificName ? (
            <p className="scientific-name">{object.scientificName}</p>
          ) : null}
          <p className="catalogue-identifiers">
            {object.catalogueIds.length > 0
              ? object.catalogueIds.join(" · ")
              : copy.curatedSample}
          </p>
        </div>
      </header>

      <div
        className="segmented-tabs"
        role="tablist"
        aria-label={copy.objectPanel.details}
      >
        {tabIds.map((item) => (
          <button
            ref={(element) => {
              tabRefs.current[item] = element;
            }}
            key={item}
            id={`object-panel-tab-${item}`}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={tabPanelId}
            tabIndex={tab === item ? 0 : -1}
            className={tab === item ? "is-active" : undefined}
            onClick={() => setTab(item)}
            onKeyDown={(event) => handleTabKeyDown(event, item)}
          >
            {item === "overview"
              ? copy.objectPanel.overview
              : item === "science"
                ? copy.data
                : copy.provenance}
          </button>
        ))}
      </div>

      <div
        id={tabPanelId}
        className="object-panel-scroll"
        role="tabpanel"
        aria-labelledby={`object-panel-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" ? (
          <>
            <p className="object-summary">{object.summary}</p>
            <blockquote>{object.significance}</blockquote>

            <dl className="fact-summary">
              <div>
                <dt>{copy.targetDistance}</dt>
                <dd>{object.distance?.display ?? copy.unknown}</dd>
              </div>
              <div>
                <dt>{copy.referenceFrame}</dt>
                <dd>
                  {object.coordinates?.frame ?? copy.objectPanel.scaleLocal}
                </dd>
              </div>
              <div>
                <dt>{copy.evidence}</dt>
                <dd>{evidenceLabel(copy, object.evidenceStatus)}</dd>
              </div>
            </dl>

            {object.coordinates ? (
              <section className="detail-section">
                <h3>{copy.coordinateSystem}</h3>
                <div className="coordinate-readout">
                  <span>{object.coordinates.frame}</span>
                  <span>{object.coordinates.epoch}</span>
                  <strong>
                    {object.coordinates.rightAscension ??
                      (object.coordinates.longitudeDeg === undefined
                        ? copy.unknown
                        : formatUiMessage(copy.timeControls.degrees, {
                            value: formatNumber(
                              object.coordinates.longitudeDeg,
                              undefined,
                              {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              },
                            ),
                          }))}
                  </strong>
                  <strong>
                    {object.coordinates.declination ??
                      (object.coordinates.latitudeDeg === undefined
                        ? copy.unknown
                        : formatUiMessage(copy.timeControls.degrees, {
                            value: formatNumber(
                              object.coordinates.latitudeDeg,
                              undefined,
                              {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              },
                            ),
                          }))}
                  </strong>
                </div>
                <p className="fine-print">{object.coordinates.note}</p>
                <InlineScientificSource
                  object={object}
                  sourceId={object.coordinates.sourceId}
                  prefix="Coordinate source"
                />
              </section>
            ) : null}

            <section className="detail-section">
              <h3>{copy.uncertainties}</h3>
              <p>{object.uncertaintySummary}</p>
              <p className="fine-print">{object.provenance.caveat}</p>
            </section>

            {relationships.length > 0 ? (
              <section className="detail-section">
                <h3>{copy.objectPanel.relationships}</h3>
                <div className="related-object-list">
                  {relationships.map(({ object: related, relationship }) => (
                    <button
                      type="button"
                      key={related.id}
                      onClick={() => onRelatedSelect(related)}
                    >
                      <span
                        className="mini-object-dot"
                        style={cssVars({
                          "--object-colour": related.visual.colour,
                        })}
                      />
                      <span>
                        <strong>{related.name}</strong>
                        <small>
                          {formatUiMessage(
                            copy.objectPanel.relationshipDescription,
                            {
                              relationship: copy.objectPanel[relationship],
                              objectType: related.objectType,
                            },
                          )}
                        </small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {tourAppearances.length > 0 ? (
              <section className="detail-section">
                <h3>{copy.objectPanel.relatedTourChapters}</h3>
                <div className="related-object-list">
                  {tourAppearances.map(({ tour, chapter, chapterIndex }) => (
                    <Link
                      key={`${tour.id}-${chapter.id}`}
                      href={`/tours?tour=${encodeURIComponent(tour.id)}&chapter=${chapterIndex + 1}`}
                    >
                      <span aria-hidden="true">◎</span>
                      <span>
                        <strong>{tour.title}</strong>
                        <small>
                          {formatUiMessage(copy.objectPanel.chapterLink, {
                            number: chapterIndex + 1,
                            title: chapter.title,
                          })}
                        </small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {tab === "science" ? (
          <section className="detail-section">
            <h3>{copy.objectPanel.measurements}</h3>
            <dl className="measurement-list">
              {object.distance ? (
                <div>
                  <dt>
                    {object.distance.label}
                    <span
                      className={`evidence-badge status-${object.distance.status}`}
                    >
                      {evidenceLabel(copy, object.distance.status)}
                    </span>
                  </dt>
                  <dd>
                    <strong>{object.distance.display}</strong>
                    {object.distance.uncertainty ? (
                      <small>
                        {formatUiMessage(copy.objectPanel.uncertaintyValue, {
                          value: object.distance.uncertainty,
                        })}
                      </small>
                    ) : null}
                    {object.distance.note ? (
                      <small>{object.distance.note}</small>
                    ) : null}
                    <InlineScientificSource
                      object={object}
                      sourceId={object.distance.sourceId}
                    />
                  </dd>
                </div>
              ) : null}
              {object.facts.map((fact) => (
                <div key={`${fact.label}-${fact.unit}`}>
                  <dt>
                    {fact.label}
                    <span className={`evidence-badge status-${fact.status}`}>
                      {evidenceLabel(copy, fact.status)}
                    </span>
                  </dt>
                  <dd>
                    <strong>{fact.display}</strong>
                    {fact.uncertainty ? (
                      <small>
                        {formatUiMessage(copy.objectPanel.uncertaintyValue, {
                          value: fact.uncertainty,
                        })}
                      </small>
                    ) : null}
                    {fact.note ? <small>{fact.note}</small> : null}
                    <InlineScientificSource
                      object={object}
                      sourceId={fact.sourceId}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {tab === "sources" ? (
          <>
            <section className="detail-section">
              <h3>{copy.provenance}</h3>
              <p>
                {formatUiMessage(copy.objectPanel.provenanceSummary, {
                  date: object.provenance.retrievedOn,
                  status: object.provenance.sampleStatus.replaceAll("-", " "),
                })}
              </p>
              <ul className="transformation-list">
                {object.provenance.transformations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="detail-section">
              <h3>{copy.externalReferences}</h3>
              <ul className="authoritative-record-list">
                {[...sourceLinksById.values()].map((sourceLink) => (
                  <li key={sourceLink.sourceId}>
                    <a
                      href={sourceLink.url}
                      {...externalLinkAttributes(sourceLink.url)}
                    >
                      {sourceLink.label}
                      {sourceLink.recordIdentifier
                        ? ` · ${sourceLink.recordIdentifier}`
                        : ""}{" "}
                      ↗
                    </a>
                    <small>{sourceLink.scope.replaceAll("-", " ")}</small>
                  </li>
                ))}
              </ul>
              <div className="source-card-list">
                {sources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="eyebrow">{source.provider}</span>
                    <strong>{source.dataset}</strong>
                    <small>
                      {source.version} · {source.publicationOrSnapshotDate}
                    </small>
                    <small>{source.licence}</small>
                  </a>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <div className="object-panel-footer">
        <button
          type="button"
          className="primary-button"
          onClick={() => onFlyTo(object)}
        >
          <span aria-hidden="true">◎</span> {copy.flyTo}
        </button>
      </div>
    </aside>
  );
}
