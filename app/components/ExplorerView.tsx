"use client";

import { useEffect, useMemo, useState } from "react";
import {
  catalogueById,
  cosmicScaleLayers,
  cosmosCatalogue,
  explorerLayers,
  sourceById,
  type CosmosExhibit,
} from "../../lib/cosmos-data";
import type { AtlasPreferences } from "../../lib/client-persistence";
import { formatNumber, formatUiMessage, type UiCopy } from "../../lib/i18n";
import {
  adaptCatalogueToScene,
  CosmosScene,
  type CosmosCameraSnapshot,
  type CosmosFlyToRequest,
  type CosmosGraphicsStateEvent,
  type CosmosSceneObject,
} from "./CosmosScene";
import { cssVars } from "./css-vars";
import { LayerManager } from "./LayerManager";
import { ObjectPanel } from "./ObjectPanel";
import { TimeControls } from "./TimeControls";

interface ExplorerViewProps {
  readonly copy: UiCopy;
  readonly selectedObject: CosmosExhibit;
  readonly objectPanelOpen: boolean;
  readonly bookmarked: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly screenshotMode: boolean;
  readonly flyToRequest: CosmosFlyToRequest | null;
  readonly preferences: AtlasPreferences;
  readonly visibleLayerIds: ReadonlySet<string>;
  readonly onBack: () => void;
  readonly onBookmarkToggle: () => void;
  readonly onForward: () => void;
  readonly onLayerToggle: (layerId: string) => void;
  readonly onObjectPanelOpenChange: (open: boolean) => void;
  readonly onPreferencesChange: (preferences: AtlasPreferences) => void;
  readonly onResetView: () => void;
  readonly onScreenshotModeChange: (active: boolean) => void;
  readonly onSelectObject: (object: CosmosExhibit, fly: boolean) => void;
}

function sceneLayerForObject(object: CosmosExhibit): string | undefined {
  const type = object.objectType.toLocaleLowerCase("en");
  if (type.includes("dwarf planet")) return "dwarf-planets";
  if (
    type.includes("planet") &&
    !type.includes("exoplanet") &&
    !type.includes("planetary nebula")
  ) {
    return "planets";
  }
  if (type.includes("satellite") || type.includes("moon")) return "moons";
  if (type.includes("exoplanet")) return "exoplanets";
  if (type.includes("nebula") || type.includes("h ii")) return "nebulae";
  if (type.includes("open star cluster")) return "open-clusters";
  if (type.includes("globular cluster")) return "globular-clusters";
  if (type.includes("supernova remnant")) return "supernova-remnants";
  if (type.includes("pulsar")) return "pulsars";
  if (type.includes("magnetar")) return "magnetars";
  if (type.includes("black hole") || type.includes("black-hole")) {
    return object.id === "sagittarius-a-star"
      ? "galactic-centre"
      : "stellar-black-holes";
  }
  if (type.includes("star")) return "named-stars";
  if (type.includes("galaxy cluster")) return "galaxy-clusters";
  if (type.includes("galaxy") || type.includes("galaxies")) return "galaxies";
  if (object.id === "milky-way") return "milky-way-structure";
  if (object.id === "cosmic-web") return "cosmic-filaments";
  if (object.id === "cmb-surface") return "cmb-context";
  return undefined;
}

function numberTriplet(values: readonly number[]): string {
  return values
    .map((value) =>
      formatNumber(value, undefined, {
        maximumFractionDigits: 2,
        signDisplay: "exceptZero",
      }),
    )
    .join(" / ");
}

export function ExplorerView({
  copy,
  selectedObject,
  objectPanelOpen,
  bookmarked,
  canGoBack,
  canGoForward,
  screenshotMode,
  flyToRequest,
  preferences,
  visibleLayerIds,
  onBack,
  onBookmarkToggle,
  onForward,
  onLayerToggle,
  onObjectPanelOpenChange,
  onPreferencesChange,
  onResetView,
  onScreenshotModeChange,
  onSelectObject,
}: ExplorerViewProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [accessibleListOpen, setAccessibleListOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"cinematic" | "scientific">(
    preferences.quality === "scientific" ? "scientific" : "cinematic",
  );
  const [camera, setCamera] = useState<CosmosCameraSnapshot | null>(null);
  const [graphicsEvent, setGraphicsEvent] =
    useState<CosmosGraphicsStateEvent | null>(null);
  const [time, setTime] = useState(() => new Date());
  const [timePlaying, setTimePlaying] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const layersPanelOpen = layersOpen && !objectPanelOpen;
  const timePanelOpen = timeOpen && !objectPanelOpen;

  const currentScale =
    cosmicScaleLayers.find(
      (layer) => layer.id === selectedObject.scaleLayerId,
    ) ?? cosmicScaleLayers[0];
  const activeLayerIds = useMemo(() => {
    const scaleOrder = currentScale.order;
    const orderByScaleId = new Map(
      cosmicScaleLayers.map((layer) => [layer.id, layer.order]),
    );
    return new Set(
      explorerLayers
        .filter((layer) => {
          const minimum =
            orderByScaleId.get(layer.minimumScaleLayerId) ??
            Number.NEGATIVE_INFINITY;
          const maximum =
            orderByScaleId.get(layer.maximumScaleLayerId) ??
            Number.POSITIVE_INFINITY;
          return scaleOrder >= minimum && scaleOrder <= maximum;
        })
        .map((layer) => layer.id),
    );
  }, [currentScale.order]);
  const visibleObjects = useMemo(() => {
    const filtered = cosmosCatalogue.filter((object) => {
      const layer = sceneLayerForObject(object);
      return (
        !layer || (visibleLayerIds.has(layer) && activeLayerIds.has(layer))
      );
    });
    if (!filtered.some((object) => object.id === selectedObject.id)) {
      return [...filtered, selectedObject];
    }
    return filtered;
  }, [activeLayerIds, selectedObject, visibleLayerIds]);
  const sceneObjects = useMemo(
    () => adaptCatalogueToScene(visibleObjects),
    [visibleObjects],
  );
  const scientificLabelsVisible =
    visibleLayerIds.has("scientific-labels") &&
    activeLayerIds.has("scientific-labels");
  const uncertaintyOverlayVisible =
    visibleLayerIds.has("uncertainty-overlays") &&
    activeLayerIds.has("uncertainty-overlays");
  const habitableZoneVisible =
    visibleLayerIds.has("habitable-zones") &&
    activeLayerIds.has("habitable-zones");
  const selectedSources = selectedObject.sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source) => source !== undefined);
  const statedUncertainties = [
    ...(selectedObject.distance?.uncertainty
      ? [
          {
            label: selectedObject.distance.label,
            value: selectedObject.distance.uncertainty,
          },
        ]
      : []),
    ...selectedObject.facts
      .filter((fact) => fact.uncertainty)
      .map((fact) => ({
        label: fact.label,
        value: fact.uncertainty ?? "",
      })),
  ];
  const habitableZoneLayer = explorerLayers.find(
    (layer) => layer.id === "habitable-zones",
  );
  const coordinateSummary = selectedObject.coordinates
    ? [
        selectedObject.coordinates.frame,
        selectedObject.coordinates.epoch,
        selectedObject.coordinates.rightAscension,
        selectedObject.coordinates.declination,
        selectedObject.coordinates.longitudeDeg === undefined
          ? undefined
          : formatUiMessage(copy.timeControls.degrees, {
              value: formatNumber(
                selectedObject.coordinates.longitudeDeg,
                undefined,
                {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                },
              ),
            }),
        selectedObject.coordinates.latitudeDeg === undefined
          ? undefined
          : formatUiMessage(copy.timeControls.degrees, {
              value: formatNumber(
                selectedObject.coordinates.latitudeDeg,
                undefined,
                {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                },
              ),
            }),
      ]
        .filter((value) => value !== undefined)
        .join(" · ")
    : copy.explorerView.noCoordinates;

  useEffect(() => {
    if (!timePlaying) return;
    const timer = window.setInterval(() => {
      setTime((current) => new Date(current.getTime() + timeSpeed * 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timePlaying, timeSpeed]);

  function closeToolPanels() {
    setLayersOpen(false);
    setTimeOpen(false);
  }

  function openObjectSheet() {
    closeToolPanels();
    onObjectPanelOpenChange(true);
  }

  function selectSceneObject(sceneObject: CosmosSceneObject | null) {
    if (!sceneObject) return;
    const object = catalogueById.get(sceneObject.id);
    if (object) {
      closeToolPanels();
      onSelectObject(object, false);
    }
  }

  function openScaleTarget(scaleLayerId: string) {
    const scale = cosmicScaleLayers.find(
      (candidate) => candidate.id === scaleLayerId,
    );
    const object = scale?.featuredObjectIds
      .map((objectId) => catalogueById.get(objectId))
      .find((candidate) => candidate !== undefined);
    if (object) {
      closeToolPanels();
      onSelectObject(object, true);
    }
  }

  return (
    <div
      className={`explorer-view ${screenshotMode ? "is-screenshot-mode" : ""}`}
      data-testid="explorer"
    >
      <CosmosScene
        copy={copy.cosmosScene}
        className="cosmos-scene"
        objects={sceneObjects}
        selectedObjectId={selectedObject.id}
        flyTo={flyToRequest}
        quality={preferences.quality}
        showProceduralBackground={
          preferences.proceduralBackground &&
          activeLayerIds.has("procedural-background")
        }
        showGrid={
          preferences.coordinateGrid && activeLayerIds.has("coordinate-grids")
        }
        showOrbits={
          preferences.orbitPaths && activeLayerIds.has("orbital-paths")
        }
        showLabels={
          preferences.educationalLabels &&
          visibleLayerIds.has("educational-labels") &&
          activeLayerIds.has("educational-labels")
        }
        simulationTimeMs={time.getTime()}
        reducedMotion={preferences.reducedMotion}
        cameraMode={cameraMode}
        navigationSpeed={preferences.cameraSpeed}
        ariaLabel={formatUiMessage(copy.explorerView.sceneLabel, {
          instructions: copy.sceneInstructions,
          name: selectedObject.name,
        })}
        onSelectObject={selectSceneObject}
        onCameraChange={setCamera}
        onGraphicsStateChange={setGraphicsEvent}
      />

      {!screenshotMode ? (
        <>
          <section
            className="explorer-readout"
            aria-label={copy.explorerView.currentPosition}
          >
            <div>
              <p className="eyebrow">{copy.currentTarget}</p>
              <button type="button" onClick={openObjectSheet}>
                <span
                  className="mini-object-dot"
                  style={cssVars({
                    "--object-colour": selectedObject.visual.colour,
                  })}
                  aria-hidden="true"
                />
                <strong>{selectedObject.name}</strong>
                <small>{selectedObject.objectType}</small>
                <small className="camera-distance-compact">
                  {camera
                    ? formatUiMessage(copy.explorerView.schematicRenderUnits, {
                        value: formatNumber(
                          camera.distanceFromTarget,
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        ),
                      })
                    : copy.explorerView.initialising}
                </small>
              </button>
            </div>
            <dl>
              <div>
                <dt>{copy.referenceFrame}</dt>
                <dd>
                  {camera?.referenceFrame.replaceAll("-", " ") ??
                    currentScale.referenceFrame.replaceAll("-", " ")}
                </dd>
              </div>
              <div>
                <dt>{copy.coordinateSystem}</dt>
                <dd>
                  {camera?.coordinateSpace ??
                    copy.explorerView.scaleLocalSchematic}
                </dd>
              </div>
              <div>
                <dt>{copy.explorerView.cameraRelativePosition}</dt>
                <dd>
                  {camera
                    ? numberTriplet(camera.position)
                    : copy.explorerView.initialising}
                </dd>
              </div>
              <div>
                <dt>{copy.explorerView.cameraTargetDistance}</dt>
                <dd>
                  {camera
                    ? formatUiMessage(copy.explorerView.schematicRenderUnits, {
                        value: formatNumber(
                          camera.distanceFromTarget,
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        ),
                      })
                    : copy.explorerView.initialising}
                </dd>
              </div>
            </dl>
            <p>{copy.explorerView.renderCoordinateCaveat}</p>
          </section>

          <div
            className="explorer-toolbar"
            aria-label={copy.explorerView.controls}
          >
            <button
              type="button"
              className={layersPanelOpen ? "is-active" : undefined}
              aria-expanded={layersPanelOpen}
              onClick={() => {
                const nextOpen = objectPanelOpen ? true : !layersOpen;
                setLayersOpen(nextOpen);
                if (nextOpen) {
                  setTimeOpen(false);
                  onObjectPanelOpenChange(false);
                }
              }}
            >
              <span aria-hidden="true">◫</span>
              {copy.layers}
            </button>
            <button
              type="button"
              className={timePanelOpen ? "is-active" : undefined}
              aria-expanded={timePanelOpen}
              onClick={() => {
                const nextOpen = objectPanelOpen ? true : !timeOpen;
                setTimeOpen(nextOpen);
                if (nextOpen) {
                  setLayersOpen(false);
                  onObjectPanelOpenChange(false);
                }
              }}
            >
              <span aria-hidden="true">◷</span>
              {copy.time}
            </button>
            <button
              type="button"
              onClick={() => {
                const mode =
                  cameraMode === "cinematic" ? "scientific" : "cinematic";
                setCameraMode(mode);
                if (mode === "scientific") {
                  onPreferencesChange({
                    ...preferences,
                    coordinateGrid: true,
                  });
                }
              }}
            >
              <span aria-hidden="true">
                {cameraMode === "cinematic" ? "◉" : "⌗"}
              </span>
              {cameraMode === "cinematic" ? copy.cinematic : copy.scientific}
            </button>
            <button
              type="button"
              data-testid="camera-speed"
              aria-label={formatUiMessage(copy.explorerView.cameraSpeedLabel, {
                speed: formatNumber(preferences.cameraSpeed, undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
              })}
              onClick={() => {
                const speeds = [0.5, 1, 2, 3] as const;
                const next =
                  speeds.find((speed) => speed > preferences.cameraSpeed) ??
                  speeds[0];
                onPreferencesChange({
                  ...preferences,
                  cameraSpeed: next,
                });
              }}
            >
              <span aria-hidden="true">
                {formatNumber(preferences.cameraSpeed, undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                ×
              </span>
              {copy.cameraSpeed}
            </button>
            <button type="button" onClick={onResetView}>
              <span aria-hidden="true">↺</span>
              {copy.resetView}
            </button>
            <button type="button" onClick={() => onScreenshotModeChange(true)}>
              <span aria-hidden="true">▣</span>
              {copy.screenshotMode}
            </button>
          </div>

          {scientificLabelsVisible ||
          uncertaintyOverlayVisible ||
          habitableZoneVisible ? (
            <aside className="explorer-semantic-overlays" aria-live="polite">
              {scientificLabelsVisible ? (
                <section>
                  <h2>{copy.explorerView.selectedScience}</h2>
                  <dl>
                    <div>
                      <dt>{copy.explorerView.identifiers}</dt>
                      <dd>
                        {selectedObject.catalogueIds.length > 0
                          ? selectedObject.catalogueIds.join(" · ")
                          : copy.explorerView.noIdentifiers}
                      </dd>
                    </div>
                    <div>
                      <dt>{copy.explorerView.coordinates}</dt>
                      <dd>{coordinateSummary}</dd>
                    </div>
                    <div>
                      <dt>{copy.explorerView.evidenceAndSource}</dt>
                      <dd>
                        {
                          copy.statusLabels.evidence[
                            selectedObject.evidenceStatus
                          ]
                        }
                        {" · "}
                        {selectedSources.length > 0
                          ? selectedSources
                              .map(
                                (source) =>
                                  `${source.provider} / ${source.dataset}`,
                              )
                              .join(" · ")
                          : copy.curatedSample}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              {uncertaintyOverlayVisible ? (
                <section>
                  <h2>{copy.explorerView.uncertaintyOverlay}</h2>
                  <p>{selectedObject.uncertaintySummary}</p>
                  <p>{selectedObject.provenance.caveat}</p>
                  {statedUncertainties.length > 0 ? (
                    <ul>
                      {statedUncertainties.map((uncertainty) => (
                        <li key={uncertainty.label}>
                          <strong>{uncertainty.label}</strong>
                          <span>
                            {formatUiMessage(
                              copy.objectPanel.uncertaintyValue,
                              { value: uncertainty.value },
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{copy.explorerView.noStatedUncertainty}</p>
                  )}
                </section>
              ) : null}

              {habitableZoneVisible ? (
                <section>
                  <h2>{copy.explorerView.habitableZoneLimitation}</h2>
                  {habitableZoneLayer ? (
                    <p>{habitableZoneLayer.description}</p>
                  ) : null}
                  <p>
                    {formatUiMessage(
                      copy.explorerView.habitableZoneUnavailable,
                      { name: selectedObject.name },
                    )}
                  </p>
                </section>
              ) : null}
            </aside>
          ) : null}

          <div className="scale-rail" aria-label={copy.scaleJourney}>
            <div className="scale-rail-heading">
              <span>{copy.scale}</span>
              <strong>{currentScale.range.display}</strong>
            </div>
            <div className="scale-rail-steps">
              {cosmicScaleLayers.map((layer) => (
                <button
                  type="button"
                  key={layer.id}
                  className={
                    layer.id === selectedObject.scaleLayerId
                      ? "is-active"
                      : undefined
                  }
                  aria-current={
                    layer.id === selectedObject.scaleLayerId
                      ? "step"
                      : undefined
                  }
                  onClick={() => openScaleTarget(layer.id)}
                >
                  <i aria-hidden="true" />
                  <span>{layer.title}</span>
                  <small>
                    10
                    <sup>{layer.range.maximumLog10Metres}</sup> m
                  </small>
                </button>
              ))}
            </div>
          </div>

          {timePanelOpen ? (
            <div className="explorer-time-popover">
              <TimeControls
                copy={copy}
                date={time}
                playing={timePlaying}
                selectedObjectId={selectedObject.id}
                selectedObjectName={selectedObject.name}
                speed={timeSpeed}
                onDateChange={setTime}
                onPlayingChange={setTimePlaying}
                onReset={() => {
                  setTime(new Date());
                  setTimePlaying(false);
                  setTimeSpeed(1);
                }}
                onSpeedChange={setTimeSpeed}
              />
            </div>
          ) : null}

          <LayerManager
            copy={copy}
            currentScaleLayerId={currentScale.id}
            open={layersPanelOpen}
            visibleLayerIds={visibleLayerIds}
            onClose={() => setLayersOpen(false)}
            onToggle={onLayerToggle}
          />

          {objectPanelOpen ? (
            <ObjectPanel
              key={selectedObject.id}
              copy={copy}
              object={selectedObject}
              bookmarked={bookmarked}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={onBack}
              onBookmarkToggle={onBookmarkToggle}
              onClose={() => onObjectPanelOpenChange(false)}
              onFlyTo={(object) => onSelectObject(object, true)}
              onForward={onForward}
              onRelatedSelect={(object) => onSelectObject(object, false)}
            />
          ) : null}

          <details
            className="accessible-scene-list"
            open={accessibleListOpen}
            onToggle={(event) =>
              setAccessibleListOpen(event.currentTarget.open)
            }
          >
            <summary>{copy.accessibleList}</summary>
            <p>{copy.sceneInstructions}</p>
            <ul>
              {visibleObjects.map((object) => (
                <li key={object.id}>
                  <button
                    type="button"
                    aria-current={
                      object.id === selectedObject.id ? "true" : undefined
                    }
                    onClick={() => {
                      closeToolPanels();
                      onSelectObject(object, true);
                    }}
                  >
                    <strong>{object.name}</strong>
                    <span>
                      {object.objectType} ·{" "}
                      {object.distance?.display ?? copy.unknown} ·{" "}
                      {object.recordKind.replaceAll("-", " ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>

          {graphicsEvent &&
          (graphicsEvent.state === "failed" ||
            graphicsEvent.state === "unsupported") ? (
            <p className="scene-status-message" role="status">
              {copy.sceneFallback}
            </p>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          className="exit-screenshot-button"
          onClick={() => onScreenshotModeChange(false)}
        >
          × {copy.exitScreenshot}
        </button>
      )}
    </div>
  );
}
