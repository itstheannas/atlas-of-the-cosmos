"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  catalogueById,
  cosmosCatalogue,
  explorerLayers,
  guidedTours,
  type CosmosExhibit,
} from "../lib/cosmos-data";
import {
  advanceSavedTourProgress,
  clearAtlasOfflineCaches,
  clearAtlasLocalState,
  defaultAtlasLocalState,
  readAtlasLocalState,
  writeAtlasLocalState,
  type AtlasLocalState,
  type AtlasPreferences,
} from "../lib/client-persistence";
import {
  reportCodedClientError,
  startClientPerformanceMonitoring,
} from "../lib/client-observability";
import {
  defaultLocale,
  formatUiMessage,
  getUiCopy,
  normalizeSection,
  sectionHref,
  type AppSection,
  type UiCopy,
} from "../lib/i18n";
import type { TourDefinition } from "../packages/tour-engine/src/schema";
import { CatalogueView } from "./components/CatalogueView";
import type { CosmosFlyToRequest } from "./components/CosmosScene";
import { LearningView } from "./components/LearningView";
import { Navigation } from "./components/Navigation";
import {
  CosmicScaleView,
  ReferenceView,
  SavedView,
  SettingsView,
} from "./components/ReferenceViews";
import { SearchDialog } from "./components/SearchDialog";
import type { TourRuntimeState } from "./components/ToursView";

const initialCopy = getUiCopy(defaultLocale);

const ExplorerView = dynamic(
  () =>
    import("./components/ExplorerView").then((module) => module.ExplorerView),
  {
    ssr: false,
    loading: () => (
      <div className="view-loading" role="status">
        <span aria-hidden="true">✦</span>
        <p>{initialCopy.app.loadingExplorer}</p>
      </div>
    ),
  },
);

const ToursView = dynamic(
  () => import("./components/ToursView").then((module) => module.ToursView),
  {
    ssr: false,
    loading: () => (
      <div className="view-loading" role="status">
        <span aria-hidden="true">◎</span>
        <p>{initialCopy.app.loadingTours}</p>
      </div>
    ),
  },
);

interface CosmosAppProps {
  readonly initialSection: AppSection;
}

interface ObjectHistory {
  readonly ids: readonly string[];
  readonly index: number;
}

interface ViewFailureBoundaryProps {
  readonly children: ReactNode;
  readonly copy: UiCopy;
}

interface ViewFailureBoundaryState {
  readonly failed: boolean;
}

class ViewFailureBoundary extends Component<
  ViewFailureBoundaryProps,
  ViewFailureBoundaryState
> {
  public state: ViewFailureBoundaryState = { failed: false };

  public static getDerivedStateFromError(): ViewFailureBoundaryState {
    return { failed: true };
  }

  public componentDidCatch(): void {
    reportCodedClientError("view-load-failed");
  }

  public render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="view-error" role="alert">
        <p className="eyebrow">{this.props.copy.app.recoveryEyebrow}</p>
        <h1>{this.props.copy.app.recoveryTitle}</h1>
        <p>{this.props.copy.app.recoveryBody}</p>
        <div className="button-row">
          <button type="button" onClick={() => window.location.reload()}>
            {this.props.copy.app.retryView}
          </button>
          <Link className="button-link" href="/catalogue">
            {this.props.copy.app.openCatalogue}
          </Link>
        </div>
      </section>
    );
  }
}

const referenceSections = new Set<AppSection>([
  "about-data",
  "methodology",
  "accessibility",
  "privacy",
  "security",
  "attributions",
]);

type DomainSection = keyof UiCopy["domains"];

function objectsForSection(section: DomainSection): readonly CosmosExhibit[] {
  return cosmosCatalogue.filter((object) => {
    const type = object.objectType.toLocaleLowerCase("en");
    if (section === "solar-system") {
      return (
        object.scaleLayerId === "planetary" ||
        object.scaleLayerId === "solar-system"
      );
    }
    if (section === "stars") {
      return (
        type.includes("star") ||
        type.includes("pulsar") ||
        type.includes("neutron") ||
        type.includes("black-hole") ||
        type.includes("black hole") ||
        object.id === "crab-nebula"
      );
    }
    if (section === "exoplanets") {
      return type.includes("exoplanet");
    }
    if (section === "deep-sky") {
      return (
        object.scaleLayerId === "stellar-evolution" &&
        !type.includes("exoplanet")
      );
    }
    if (section === "milky-way") {
      return (
        object.scaleLayerId === "galactic" ||
        object.id === "sun" ||
        object.id === "large-magellanic-cloud"
      );
    }
    return (
      object.scaleLayerId === "local-group" ||
      object.scaleLayerId === "extragalactic" ||
      object.scaleLayerId === "observable-universe"
    );
  });
}

function readSectionFromLocation(): AppSection {
  const value = window.location.pathname.split("/").filter(Boolean)[0];
  return normalizeSection(value);
}

export function CosmosApp({ initialSection }: CosmosAppProps) {
  const copy = getUiCopy(defaultLocale);
  const [section, setSection] = useState<AppSection>(initialSection);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [localState, setLocalState] = useState<AtlasLocalState>(
    defaultAtlasLocalState,
  );
  const [selectedObjectId, setSelectedObjectId] = useState("earth");
  const [objectPanelOpen, setObjectPanelOpen] = useState(true);
  const [objectHistory, setObjectHistory] = useState<ObjectHistory>({
    ids: ["earth"],
    index: 0,
  });
  const [flyToRequest, setFlyToRequest] = useState<CosmosFlyToRequest | null>(
    null,
  );
  const [visibleLayerIds, setVisibleLayerIds] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        explorerLayers
          .filter((layer) => layer.defaultVisible)
          .map((layer) => layer.id),
      ),
  );
  const [compareIds, setCompareIds] = useState<readonly string[]>([]);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [tourRuntime, setTourRuntime] = useState<TourRuntimeState>({
    activeTourId: null,
    chapterIndex: 0,
    playing: false,
    progress: 0,
  });
  const [toast, setToast] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const storageRef = useRef<Storage | null>(null);
  const storageWarningRef = useRef(false);
  const suppressedPersistenceStateRef = useRef<AtlasLocalState | null>(null);
  const flyRequestRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  const selectedObject =
    catalogueById.get(selectedObjectId) ?? catalogueById.get("earth")!;
  const effectivePreferences = useMemo<AtlasPreferences>(
    () => ({
      ...localState.preferences,
      reducedMotion:
        localState.preferences.reducedMotion || systemReducedMotion,
    }),
    [localState.preferences, systemReducedMotion],
  );

  useEffect(() => {
    return startClientPerformanceMonitoring();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        storageRef.current = window.localStorage;
      } catch {
        storageRef.current = null;
      }
      const storageResult = readAtlasLocalState(storageRef.current);
      const stored = storageResult.state;
      if (!storageResult.available) {
        storageWarningRef.current = true;
        setToast(copy.app.storageUnavailable);
      }
      setLocalState(stored);
      setVisibleLayerIds((current) => {
        const next = new Set(current);
        const preferenceLayers = [
          ["procedural-background", stored.preferences.proceduralBackground],
          ["coordinate-grids", stored.preferences.coordinateGrid],
          ["orbital-paths", stored.preferences.orbitPaths],
          ["educational-labels", stored.preferences.educationalLabels],
        ] as const;
        for (const [layerId, enabled] of preferenceLayers) {
          if (enabled) next.add(layerId);
          else next.delete(layerId);
        }
        for (const [layerId, enabled] of Object.entries(
          stored.layerVisibility,
        )) {
          if (enabled) next.add(layerId);
          else next.delete(layerId);
        }
        return next;
      });
      hydratedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [copy.app.storageUnavailable]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (suppressedPersistenceStateRef.current === localState) {
      suppressedPersistenceStateRef.current = null;
      return;
    }
    suppressedPersistenceStateRef.current = null;
    if (!writeAtlasLocalState(storageRef.current, localState)) {
      storageRef.current = null;
      if (!storageWarningRef.current) {
        storageWarningRef.current = true;
        setToast(copy.app.storageWriteFailed);
      }
    }
  }, [copy.app.storageWriteFailed, localState]);

  useEffect(() => {
    document.documentElement.dataset.theme = localState.preferences.theme;
  }, [localState.preferences.theme]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setSystemReducedMotion(preference.matches);
    apply();
    preference.addEventListener("change", apply);
    return () => preference.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        reportCodedClientError("service-worker-registration-failed");
        if (active) {
          setToast(copy.app.offlineCachingUnavailable);
        }
      }
    };
    void register();
    return () => {
      active = false;
    };
  }, [copy.app.offlineCachingUnavailable]);

  useEffect(() => {
    const onPopState = () => setSection(readSectionFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parameters = new URLSearchParams(window.location.search);
      const tourId = parameters.get("tour");
      if (!tourId || !guidedTours.some((tour) => tour.id === tourId)) return;
      const chapter = Number(parameters.get("chapter") ?? "1");
      const tour = guidedTours.find((candidate) => candidate.id === tourId)!;
      const chapterIndex = Number.isInteger(chapter)
        ? Math.max(0, Math.min(tour.chapters.length - 1, chapter - 1))
        : 0;
      setSection("tours");
      setTourRuntime({
        activeTourId: tour.id,
        chapterIndex,
        playing: false,
        progress: 0,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!tourRuntime.activeTourId) return;
    const url = new URL(window.location.href);
    url.pathname = "/tours";
    url.searchParams.set("tour", tourRuntime.activeTourId);
    url.searchParams.set("chapter", String(tourRuntime.chapterIndex + 1));
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [tourRuntime.activeTourId, tourRuntime.chapterIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.matches("input, textarea, select, [contenteditable='true']") ??
        false;
      if (
        !isTyping &&
        (event.key === "/" ||
          ((event.metaKey || event.ctrlKey) &&
            event.key.toLocaleLowerCase("en") === "k"))
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        if (screenshotMode) setScreenshotMode(false);
        else if (navigationOpen) setNavigationOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigationOpen, screenshotMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = useCallback((nextSection: AppSection) => {
    setSection(nextSection);
    setNavigationOpen(false);
    setScreenshotMode(false);
    if (nextSection !== "tours") {
      setTourRuntime((runtime) =>
        runtime.playing ? { ...runtime, playing: false } : runtime,
      );
    }
    const nextHref = sectionHref(nextSection);
    if (`${window.location.pathname}${window.location.search}` !== nextHref) {
      window.history.pushState({}, "", nextHref);
    }
    window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const recordRecentObject = useCallback((objectId: string) => {
    setLocalState((current) => ({
      ...current,
      recentObjects: [
        objectId,
        ...current.recentObjects.filter((item) => item !== objectId),
      ].slice(0, 20),
    }));
  }, []);

  const issueFlight = useCallback(
    (objectId: string) => {
      flyRequestRef.current += 1;
      setFlyToRequest({
        objectId,
        requestId: flyRequestRef.current,
        durationMs: effectivePreferences.reducedMotion
          ? 0
          : Math.round(1750 / effectivePreferences.cameraSpeed),
      });
    },
    [effectivePreferences.cameraSpeed, effectivePreferences.reducedMotion],
  );

  const selectObject = useCallback(
    (
      object: CosmosExhibit,
      fly: boolean,
      addToHistory = true,
      revealPanel = true,
    ) => {
      setSelectedObjectId(object.id);
      if (revealPanel) setObjectPanelOpen(true);
      recordRecentObject(object.id);
      if (addToHistory) {
        setObjectHistory((current) => {
          if (current.ids[current.index] === object.id) return current;
          const prefix = current.ids.slice(0, current.index + 1);
          const ids = [...prefix, object.id].slice(-30);
          return { ids, index: ids.length - 1 };
        });
      }
      if (fly) issueFlight(object.id);
    },
    [issueFlight, recordRecentObject],
  );

  const openObjectInExplorer = useCallback(
    (object: CosmosExhibit, fly = true) => {
      navigate("explorer");
      selectObject(object, fly);
    },
    [navigate, selectObject],
  );

  const moveHistory = useCallback(
    (direction: -1 | 1) => {
      setObjectHistory((current) => {
        const index = Math.max(
          0,
          Math.min(current.ids.length - 1, current.index + direction),
        );
        const object = catalogueById.get(current.ids[index] ?? "");
        if (object) {
          setSelectedObjectId(object.id);
          setObjectPanelOpen(true);
          recordRecentObject(object.id);
          issueFlight(object.id);
        }
        return { ...current, index };
      });
    },
    [issueFlight, recordRecentObject],
  );

  const toggleBookmark = useCallback(
    (objectId = selectedObject.id) => {
      setLocalState((current) => {
        const exists = current.bookmarks.includes(objectId);
        const object = catalogueById.get(objectId);
        setToast(
          exists
            ? formatUiMessage(copy.app.removedFromSaved, {
                name: object?.name ?? copy.app.fallbackObjectName,
              })
            : formatUiMessage(copy.app.savedOnDevice, {
                name: object?.name ?? copy.app.fallbackObjectName,
              }),
        );
        return {
          ...current,
          bookmarks: exists
            ? current.bookmarks.filter((item) => item !== objectId)
            : [...current.bookmarks, objectId].slice(-250),
        };
      });
    },
    [
      copy.app.fallbackObjectName,
      copy.app.removedFromSaved,
      copy.app.savedOnDevice,
      selectedObject.id,
    ],
  );

  const handlePreferencesChange = useCallback(
    (preferences: AtlasPreferences) => {
      const normalized =
        preferences.quality === "scientific"
          ? {
              ...preferences,
              coordinateGrid: true,
              orbitPaths: true,
            }
          : preferences;
      setLocalState((current) => ({
        ...current,
        preferences: normalized,
        layerVisibility: {
          ...current.layerVisibility,
          "procedural-background": normalized.proceduralBackground,
          "coordinate-grids": normalized.coordinateGrid,
          "orbital-paths": normalized.orbitPaths,
          "educational-labels": normalized.educationalLabels,
        },
      }));
      setVisibleLayerIds((current) => {
        const next = new Set(current);
        const mapped = [
          ["procedural-background", normalized.proceduralBackground],
          ["coordinate-grids", normalized.coordinateGrid],
          ["orbital-paths", normalized.orbitPaths],
          ["educational-labels", normalized.educationalLabels],
        ] as const;
        for (const [layerId, enabled] of mapped) {
          if (enabled) next.add(layerId);
          else next.delete(layerId);
        }
        return next;
      });
    },
    [],
  );

  const handleLayerToggle = useCallback(
    (layerId: string) => {
      const enabled = !visibleLayerIds.has(layerId);
      setVisibleLayerIds((current) => {
        const next = new Set(current);
        if (enabled) next.add(layerId);
        else next.delete(layerId);
        return next;
      });
      const preferenceKey: Readonly<Record<string, keyof AtlasPreferences>> = {
        "procedural-background": "proceduralBackground",
        "coordinate-grids": "coordinateGrid",
        "orbital-paths": "orbitPaths",
        "educational-labels": "educationalLabels",
      };
      const key = preferenceKey[layerId];
      setLocalState((state) => ({
        ...state,
        layerVisibility: {
          ...state.layerVisibility,
          [layerId]: enabled,
        },
        preferences: key
          ? { ...state.preferences, [key]: enabled }
          : state.preferences,
      }));
    },
    [visibleLayerIds],
  );

  const handleCompareToggle = useCallback((objectId: string) => {
    setCompareIds((current) =>
      current.includes(objectId)
        ? current.filter((item) => item !== objectId)
        : current.length < 3
          ? [...current, objectId]
          : current,
    );
  }, []);

  const handleTourRuntimeChange = useCallback((runtime: TourRuntimeState) => {
    setTourRuntime(runtime);
  }, []);

  const recordCompletedTourChapter = useCallback(
    (tour: TourDefinition, chapterId: string) => {
      setLocalState((current) => {
        const saved = current.tourProgress[tour.id];
        const next = advanceSavedTourProgress(
          saved,
          tour,
          chapterId,
          effectivePreferences.reducedMotion,
        );
        if (next === saved) return current;
        return {
          ...current,
          tourProgress: {
            ...current.tourProgress,
            ...(next ? { [tour.id]: next } : {}),
          },
        };
      });
    },
    [effectivePreferences.reducedMotion],
  );

  const startTour = useCallback(
    (tour: TourDefinition, chapterIndex: number) => {
      navigate("tours");
      setTourRuntime({
        activeTourId: tour.id,
        chapterIndex,
        playing: true,
        progress: 0,
      });
    },
    [navigate],
  );

  const handleTourTarget = useCallback(
    (object: CosmosExhibit) => {
      selectObject(object, true, true, false);
    },
    [selectObject],
  );

  const commitSearch = useCallback((query: string) => {
    setLocalState((current) => ({
      ...current,
      recentSearches: [
        query,
        ...current.recentSearches.filter((item) => item !== query),
      ].slice(0, 10),
    }));
  }, []);

  const savedObjects = localState.bookmarks
    .map((objectId) => catalogueById.get(objectId))
    .filter((object): object is CosmosExhibit => object !== undefined);
  const recentObjects = localState.recentObjects
    .map((objectId) => catalogueById.get(objectId))
    .filter((object): object is CosmosExhibit => object !== undefined);

  let view: ReactNode;
  if (section === "explorer") {
    view = (
      <ExplorerView
        copy={copy}
        selectedObject={selectedObject}
        objectPanelOpen={objectPanelOpen}
        bookmarked={localState.bookmarks.includes(selectedObject.id)}
        canGoBack={objectHistory.index > 0}
        canGoForward={objectHistory.index < objectHistory.ids.length - 1}
        screenshotMode={screenshotMode}
        flyToRequest={flyToRequest}
        preferences={effectivePreferences}
        visibleLayerIds={visibleLayerIds}
        onBack={() => moveHistory(-1)}
        onBookmarkToggle={() => toggleBookmark()}
        onForward={() => moveHistory(1)}
        onLayerToggle={handleLayerToggle}
        onObjectPanelOpenChange={setObjectPanelOpen}
        onPreferencesChange={handlePreferencesChange}
        onResetView={() => {
          const earth = catalogueById.get("earth");
          if (earth) selectObject(earth, true);
        }}
        onScreenshotModeChange={setScreenshotMode}
        onSelectObject={(object, fly) => selectObject(object, fly)}
      />
    );
  } else if (section === "tours") {
    view = (
      <ToursView
        copy={copy}
        reducedMotion={effectivePreferences.reducedMotion}
        runtime={tourRuntime}
        savedProgress={localState.tourProgress}
        onChapterCompleted={recordCompletedTourChapter}
        onExit={() => {
          setTourRuntime({
            activeTourId: null,
            chapterIndex: 0,
            playing: false,
            progress: 0,
          });
          window.history.replaceState({}, "", "/tours");
        }}
        onOpenObject={handleTourTarget}
        onRuntimeChange={handleTourRuntimeChange}
        onStart={startTour}
      />
    );
  } else if (section === "catalogue") {
    view = (
      <CatalogueView
        copy={copy}
        compareIds={compareIds}
        onCompareToggle={handleCompareToggle}
        onOpenObject={openObjectInExplorer}
      />
    );
  } else if (
    section === "solar-system" ||
    section === "stars" ||
    section === "exoplanets" ||
    section === "deep-sky" ||
    section === "milky-way" ||
    section === "galaxies"
  ) {
    const content = copy.domains[section];
    view = (
      <CatalogueView
        copy={copy}
        initialObjects={objectsForSection(section)}
        title={content.title}
        description={content.description}
        compareIds={compareIds}
        onCompareToggle={handleCompareToggle}
        onOpenObject={openObjectInExplorer}
      />
    );
  } else if (section === "cosmic-scale") {
    view = (
      <CosmicScaleView
        copy={copy}
        onOpenObject={(object) => openObjectInExplorer(object, true)}
      />
    );
  } else if (section === "learning") {
    view = (
      <LearningView
        copy={copy}
        onOpenObject={(object) => openObjectInExplorer(object, true)}
      />
    );
  } else if (section === "saved") {
    view = (
      <SavedView
        copy={copy}
        objects={savedObjects}
        recentObjects={recentObjects}
        onOpenObject={(object) => openObjectInExplorer(object, true)}
        onRemove={toggleBookmark}
      />
    );
  } else if (section === "settings") {
    view = (
      <SettingsView
        copy={copy}
        preferences={localState.preferences}
        onChange={handlePreferencesChange}
        onReset={() => {
          suppressedPersistenceStateRef.current = defaultAtlasLocalState;
          setLocalState(defaultAtlasLocalState);
          setVisibleLayerIds(
            new Set(
              explorerLayers
                .filter((layer) => layer.defaultVisible)
                .map((layer) => layer.id),
            ),
          );
          const cleared = clearAtlasLocalState(storageRef.current);
          const cacheStorage =
            typeof window !== "undefined" && "caches" in window
              ? window.caches
              : null;
          void clearAtlasOfflineCaches(cacheStorage).then((cachesCleared) => {
            setToast(
              cleared && cachesCleared
                ? copy.resetConfirm
                : copy.app.resetStorageUnavailable,
            );
          });
        }}
      />
    );
  } else if (referenceSections.has(section)) {
    view = <ReferenceView copy={copy} section={section} />;
  } else {
    view = null;
  }

  return (
    <div className={`app-shell ${screenshotMode ? "screenshot-mode" : ""}`}>
      <a className="skip-link" href="#main-content">
        {copy.skipToContent}
      </a>
      <Navigation
        copy={copy}
        currentSection={section}
        navigationOpen={navigationOpen}
        online={online}
        onNavigationOpenChange={setNavigationOpen}
        onNavigate={navigate}
        onSearchOpen={() => setSearchOpen(true)}
      />
      <SearchDialog
        copy={copy}
        open={searchOpen}
        recentSearches={localState.recentSearches}
        onClose={() => setSearchOpen(false)}
        onCommitSearch={commitSearch}
        onSelect={(object) => openObjectInExplorer(object, true)}
      />
      <main
        id="main-content"
        ref={mainRef}
        className={`app-main ${section === "explorer" ? "is-explorer" : ""}`}
        tabIndex={-1}
      >
        <ViewFailureBoundary key={section} copy={copy}>
          {view}
        </ViewFailureBoundary>
      </main>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedObject
          ? formatUiMessage(copy.app.selectedObjectAnnouncement, {
              name: selectedObject.name,
            })
          : ""}
      </div>
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
