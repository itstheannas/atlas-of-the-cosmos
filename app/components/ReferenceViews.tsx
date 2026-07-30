"use client";

import {
  cosmicScaleLayers,
  dataSources,
  catalogueNotice,
  cosmosCatalogue,
  sourceById,
  type CosmosExhibit,
} from "../../lib/cosmos-data";
import type { AtlasPreferences } from "../../lib/client-persistence";
import {
  formatNumber,
  formatUiMessage,
  type AppSection,
  type UiCopy,
} from "../../lib/i18n";
import { cssVars } from "./css-vars";

interface SavedViewProps {
  readonly copy: UiCopy;
  readonly objects: readonly CosmosExhibit[];
  readonly recentObjects: readonly CosmosExhibit[];
  readonly onOpenObject: (object: CosmosExhibit) => void;
  readonly onRemove: (objectId: string) => void;
}

export function SavedView({
  copy,
  objects,
  recentObjects,
  onOpenObject,
  onRemove,
}: SavedViewProps) {
  return (
    <div className="content-view saved-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">{copy.savedView.eyebrow}</p>
          <h1>{copy.savedTitle}</h1>
          <p>{copy.savedDek}</p>
        </div>
        <div className="saved-count">
          <strong>{objects.length}</strong>
          <span>{copy.savedView.savedCount}</span>
        </div>
      </header>
      {objects.length === 0 ? (
        <div className="empty-state saved-empty">
          <span aria-hidden="true">☆</span>
          <p>{copy.noSaved}</p>
        </div>
      ) : (
        <div className="saved-object-grid">
          {objects.map((object) => (
            <article key={object.id}>
              <button
                type="button"
                className="saved-object-main"
                onClick={() => onOpenObject(object)}
              >
                <span
                  style={cssVars({
                    "--object-colour": object.visual.colour,
                  })}
                  aria-hidden="true"
                >
                  {object.visual.glyph}
                </span>
                <strong>{object.name}</strong>
                <small>{object.objectType}</small>
                <em>{object.distance?.display ?? copy.unknown}</em>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={formatUiMessage(copy.savedView.removeObject, {
                  action: copy.removeBookmark,
                  name: object.name,
                })}
                onClick={() => onRemove(object.id)}
              >
                ×
              </button>
            </article>
          ))}
        </div>
      )}
      {recentObjects.length > 0 ? (
        <section className="recently-viewed">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">{copy.savedView.historyEyebrow}</p>
              <h2>{copy.savedView.recentlyViewed}</h2>
            </div>
          </div>
          <div className="horizontal-object-list">
            {recentObjects.map((object) => (
              <button
                type="button"
                key={object.id}
                onClick={() => onOpenObject(object)}
              >
                <span
                  style={cssVars({
                    "--object-colour": object.visual.colour,
                  })}
                  aria-hidden="true"
                />
                <strong>{object.name}</strong>
                <small>{object.objectType}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface SettingsViewProps {
  readonly copy: UiCopy;
  readonly preferences: AtlasPreferences;
  readonly onChange: (preferences: AtlasPreferences) => void;
  readonly onReset: () => void;
}

export function SettingsView({
  copy,
  preferences,
  onChange,
  onReset,
}: SettingsViewProps) {
  return (
    <div className="content-view settings-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">{copy.settingsView.eyebrow}</p>
          <h1>{copy.settingsTitle}</h1>
          <p>{copy.settingsView.intro}</p>
        </div>
      </header>
      <div className="settings-grid">
        <section>
          <div className="settings-section-heading">
            <span aria-hidden="true">◐</span>
            <div>
              <h2>{copy.appearance}</h2>
              <p>{copy.settingsView.appearanceDescription}</p>
            </div>
          </div>
          <div
            className="theme-options"
            role="radiogroup"
            aria-label={copy.settingsView.themeLabel}
          >
            {(
              [
                ["dark", copy.darkTheme],
                ["light", copy.lightTheme],
                ["contrast", copy.contrastTheme],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className={`theme-swatch theme-${id}`}>
                <input
                  type="radio"
                  name="theme"
                  checked={preferences.theme === id}
                  onChange={() => onChange({ ...preferences, theme: id })}
                />
                <span aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{label}</strong>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="settings-section-heading">
            <span aria-hidden="true">✦</span>
            <div>
              <h2>{copy.quality}</h2>
              <p>{copy.settingsView.qualityDescription}</p>
            </div>
          </div>
          <div
            className="quality-options"
            role="radiogroup"
            aria-label={copy.quality}
          >
            {(
              [
                ["auto", copy.automatic],
                ["low", copy.low],
                ["medium", copy.medium],
                ["high", copy.high],
                ["ultra", copy.ultra],
                ["scientific", copy.scientific],
              ] as const
            ).map(([id, label]) => (
              <label key={id}>
                <input
                  type="radio"
                  name="quality"
                  checked={preferences.quality === id}
                  onChange={() => onChange({ ...preferences, quality: id })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="settings-section-heading">
            <span aria-hidden="true">≈</span>
            <div>
              <h2>{copy.motion}</h2>
              <p>{copy.settingsView.motionDescription}</p>
            </div>
          </div>
          <label className="settings-toggle">
            <span>
              <strong>{copy.reducedMotion}</strong>
              <small>{copy.settingsView.reducedMotionDescription}</small>
            </span>
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  reducedMotion: event.target.checked,
                })
              }
            />
          </label>
          <label className="settings-range">
            <span>
              <strong>{copy.cameraSpeed}</strong>
              <small>
                {formatNumber(preferences.cameraSpeed, undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                ×
              </small>
            </span>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.25"
              value={preferences.cameraSpeed}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  cameraSpeed: Number(event.target.value),
                })
              }
            />
          </label>
        </section>

        <section>
          <div className="settings-section-heading">
            <span aria-hidden="true">⌗</span>
            <div>
              <h2>{copy.settingsView.overlaysTitle}</h2>
              <p>{copy.settingsView.overlaysDescription}</p>
            </div>
          </div>
          {(
            [
              [
                "proceduralBackground",
                copy.proceduralBackground,
                copy.settingsView.proceduralBackgroundDescription,
              ],
              [
                "coordinateGrid",
                copy.coordinateGrid,
                copy.settingsView.coordinateGridDescription,
              ],
              [
                "orbitPaths",
                copy.orbitPaths,
                copy.settingsView.orbitPathsDescription,
              ],
              [
                "educationalLabels",
                copy.educationalLabels,
                copy.settingsView.educationalLabelsDescription,
              ],
            ] as const
          ).map(([key, label, description]) => (
            <label className="settings-toggle" key={key}>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) =>
                  onChange({ ...preferences, [key]: event.target.checked })
                }
              />
            </label>
          ))}
        </section>
      </div>
      <button type="button" className="danger-button" onClick={onReset}>
        ↺ {copy.resetPreferences}
      </button>
    </div>
  );
}

interface CosmicScaleViewProps {
  readonly copy: UiCopy;
  readonly onOpenObject: (object: CosmosExhibit) => void;
}

export function CosmicScaleView({ copy, onOpenObject }: CosmicScaleViewProps) {
  return (
    <div className="content-view scale-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">
            {formatUiMessage(copy.scaleView.eyebrow, {
              journey: copy.scaleJourney,
            })}
          </p>
          <h1>{copy.scaleView.title}</h1>
          <p>{copy.scaleView.intro}</p>
        </div>
      </header>
      <ol className="scale-timeline">
        {cosmicScaleLayers.map((layer, index) => (
          <li key={layer.id}>
            <span className="scale-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="scale-line" aria-hidden="true">
              <i />
            </div>
            <article>
              <div className="badge-row">
                <span>{layer.range.display}</span>
                <span>{layer.referenceFrame.replaceAll("-", " ")}</span>
              </div>
              <h2>{layer.title}</h2>
              <p>{layer.kicker}</p>
              <dl>
                <div>
                  <dt>{copy.scaleView.coordinateStrategy}</dt>
                  <dd>{layer.coordinateStrategy}</dd>
                </div>
                <div>
                  <dt>{copy.scaleView.representation}</dt>
                  <dd>{layer.representation}</dd>
                </div>
              </dl>
              <div className="scale-featured-objects">
                {layer.featuredObjectIds.map((objectId) => {
                  const object = cosmosCatalogue.find(
                    (candidate) => candidate.id === objectId,
                  );
                  return object ? (
                    <button
                      type="button"
                      key={object.id}
                      onClick={() => onOpenObject(object)}
                    >
                      <span
                        style={cssVars({
                          "--object-colour": object.visual.colour,
                        })}
                        aria-hidden="true"
                      />
                      {object.name} ↗
                    </button>
                  ) : null;
                })}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface ReferenceViewProps {
  readonly copy: UiCopy;
  readonly section: Extract<
    AppSection,
    | "about-data"
    | "methodology"
    | "accessibility"
    | "privacy"
    | "security"
    | "attributions"
  >;
}

export function ReferenceView({ copy, section }: ReferenceViewProps) {
  if (section === "about-data") {
    return (
      <div className="content-view data-view">
        <header className="section-heading">
          <div>
            <p className="eyebrow">{copy.referenceView.aboutData.eyebrow}</p>
            <h1>{copy.aboutDataTitle}</h1>
            <p>{catalogueNotice.body}</p>
          </div>
          <div className="dataset-seal">
            <span>{dataSources.length}</span>
            <small>{copy.referenceView.aboutData.declaredSources}</small>
            <em>{copy.referenceView.aboutData.noHiddenImagery}</em>
          </div>
        </header>
        <aside className="catalogue-notice">
          <span aria-hidden="true">i</span>
          <div>
            <h2>{catalogueNotice.title}</h2>
            <p>{catalogueNotice.updatePolicy}</p>
          </div>
        </aside>
        <div className="source-registry">
          {dataSources.map((source, index) => (
            <article key={source.id}>
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="eyebrow">{source.provider}</p>
                  <h2>{source.dataset}</h2>
                </div>
                <a
                  href={source.url}
                  {...(source.url.startsWith("https://")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {copy.referenceView.aboutData.sourceLink}
                </a>
              </header>
              <dl>
                <div>
                  <dt>{copy.referenceView.aboutData.version}</dt>
                  <dd>{source.version}</dd>
                </div>
                <div>
                  <dt>{copy.referenceView.aboutData.snapshotPublication}</dt>
                  <dd>{source.publicationOrSnapshotDate}</dd>
                </div>
                <div>
                  <dt>{copy.referenceView.aboutData.access}</dt>
                  <dd>{source.accessMethod}</dd>
                </div>
                <div>
                  <dt>{copy.referenceView.aboutData.licence}</dt>
                  <dd>{source.licence}</dd>
                </div>
                <div>
                  <dt>{copy.referenceView.aboutData.attribution}</dt>
                  <dd>{source.attribution}</dd>
                </div>
                <div>
                  <dt>{copy.referenceView.aboutData.citation}</dt>
                  <dd>
                    <a
                      href={source.citationUrl}
                      {...(source.citationUrl.startsWith("https://")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {source.citation}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>{copy.referenceView.aboutData.updateStrategy}</dt>
                  <dd>{source.updateStrategy}</dd>
                </div>
              </dl>
              <details>
                <summary>
                  {copy.referenceView.aboutData.transformationsAndLimitations}
                </summary>
                <div className="source-details-grid">
                  <div>
                    <h3>{copy.referenceView.aboutData.transformations}</h3>
                    <ul>
                      {source.transformations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{copy.referenceView.aboutData.knownLimitations}</h3>
                    <ul>
                      {source.knownLimitations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{copy.referenceView.aboutData.coordinatesAndUnits}</h3>
                    <p>{source.coordinateSystem}</p>
                    <ul>
                      {source.units.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{copy.referenceView.aboutData.uncertaintyFields}</h3>
                    <p>{source.uncertaintyFields}</p>
                  </div>
                  <div>
                    <h3>{copy.referenceView.aboutData.validationRules}</h3>
                    <ul>
                      {source.validationRules.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </div>
    );
  }

  const content = copy.referenceView[section];
  return (
    <div className="content-view reference-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </div>
      </header>
      <div className="reference-sections">
        {content.sections.map((item, index) => (
          <article key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
      {section === "attributions" ? (
        <section className="attribution-table-wrapper">
          <table>
            <caption>{copy.referenceView.attributionTable.caption}</caption>
            <thead>
              <tr>
                <th scope="col">
                  {copy.referenceView.attributionTable.provider}
                </th>
                <th scope="col">
                  {copy.referenceView.attributionTable.dataset}
                </th>
                <th scope="col">
                  {copy.referenceView.attributionTable.version}
                </th>
                <th scope="col">{copy.referenceView.attributionTable.date}</th>
                <th scope="col">
                  {copy.referenceView.attributionTable.licenceStatement}
                </th>
                <th scope="col">
                  {copy.referenceView.attributionTable.attribution}
                </th>
                <th scope="col">
                  {copy.referenceView.attributionTable.citation}
                </th>
                <th scope="col">
                  {copy.referenceView.attributionTable.transformations}
                </th>
                <th scope="col">
                  {copy.referenceView.attributionTable.limitations}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...sourceById.values()].map((source) => (
                <tr key={source.id}>
                  <th scope="row">{source.provider}</th>
                  <td>{source.dataset}</td>
                  <td>{source.version}</td>
                  <td>{source.publicationOrSnapshotDate}</td>
                  <td>{source.licence}</td>
                  <td>{source.attribution}</td>
                  <td>
                    <a
                      href={source.citationUrl}
                      {...(source.citationUrl.startsWith("https://")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {source.citation}
                    </a>
                  </td>
                  <td>{source.transformations.join("; ")}</td>
                  <td>{source.knownLimitations.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
