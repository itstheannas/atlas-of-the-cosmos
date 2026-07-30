import type { SavedTourProgress } from "../packages/tour-engine/src/index";
import type { TourDefinition } from "../packages/tour-engine/src/schema";

export const ATLAS_STORAGE_KEY = "atlas.cosmos.local-state";
export const ATLAS_STORAGE_VERSION = 2 as const;
export const ATLAS_OFFLINE_CACHE_PREFIX = "atlas-cosmos-";

export type ThemePreference = "dark" | "light" | "contrast";
export type QualityPreference =
  "auto" | "low" | "medium" | "high" | "ultra" | "scientific";

export interface AtlasPreferences {
  readonly theme: ThemePreference;
  readonly quality: QualityPreference;
  readonly reducedMotion: boolean;
  readonly proceduralBackground: boolean;
  readonly coordinateGrid: boolean;
  readonly orbitPaths: boolean;
  readonly educationalLabels: boolean;
  readonly cameraSpeed: number;
}

export interface AtlasLocalState {
  readonly version: typeof ATLAS_STORAGE_VERSION;
  readonly preferences: AtlasPreferences;
  readonly bookmarks: readonly string[];
  readonly recentObjects: readonly string[];
  readonly recentSearches: readonly string[];
  readonly tourProgress: Readonly<Record<string, SavedTourProgress>>;
  readonly layerVisibility: Readonly<Record<string, boolean>>;
}

export const defaultAtlasPreferences: AtlasPreferences = {
  theme: "dark",
  quality: "auto",
  reducedMotion: false,
  proceduralBackground: true,
  coordinateGrid: false,
  orbitPaths: true,
  educationalLabels: true,
  cameraSpeed: 1,
};

export const defaultAtlasLocalState: AtlasLocalState = {
  version: ATLAS_STORAGE_VERSION,
  preferences: defaultAtlasPreferences,
  bookmarks: [],
  recentObjects: [],
  recentSearches: [],
  tourProgress: {},
  layerVisibility: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSafeIds(value: unknown, maximum: number): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && /^[a-z0-9][a-z0-9-*]{0,79}$/.test(item),
      ),
    ),
  ].slice(0, maximum);
}

function parsePreferences(value: unknown): AtlasPreferences {
  if (!isRecord(value)) return defaultAtlasPreferences;
  const theme =
    value.theme === "light" || value.theme === "contrast"
      ? value.theme
      : "dark";
  const quality =
    value.quality === "low" ||
    value.quality === "medium" ||
    value.quality === "high" ||
    value.quality === "ultra" ||
    value.quality === "scientific"
      ? value.quality
      : "auto";
  const cameraSpeed =
    typeof value.cameraSpeed === "number" &&
    Number.isFinite(value.cameraSpeed) &&
    value.cameraSpeed >= 0.25 &&
    value.cameraSpeed <= 3
      ? value.cameraSpeed
      : 1;

  return {
    theme,
    quality,
    reducedMotion:
      typeof value.reducedMotion === "boolean"
        ? value.reducedMotion
        : defaultAtlasPreferences.reducedMotion,
    proceduralBackground:
      typeof value.proceduralBackground === "boolean"
        ? value.proceduralBackground
        : defaultAtlasPreferences.proceduralBackground,
    coordinateGrid:
      typeof value.coordinateGrid === "boolean"
        ? value.coordinateGrid
        : defaultAtlasPreferences.coordinateGrid,
    orbitPaths:
      typeof value.orbitPaths === "boolean"
        ? value.orbitPaths
        : defaultAtlasPreferences.orbitPaths,
    educationalLabels:
      typeof value.educationalLabels === "boolean"
        ? value.educationalLabels
        : defaultAtlasPreferences.educationalLabels,
    cameraSpeed,
  };
}

function parseTourProgress(
  value: unknown,
): Readonly<Record<string, SavedTourProgress>> {
  if (!isRecord(value)) return {};
  const tourProgress: Record<string, SavedTourProgress> = {};
  for (const [tourId, progress] of Object.entries(value).slice(0, 32)) {
    if (
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(tourId) ||
      !isRecord(progress) ||
      progress.schemaVersion !== 1 ||
      progress.tourId !== tourId ||
      typeof progress.tourVersion !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(progress.tourVersion) ||
      typeof progress.reducedMotion !== "boolean"
    ) {
      continue;
    }
    const lastCompletedChapterId = progress.lastCompletedChapterId;
    if (
      lastCompletedChapterId !== undefined &&
      (typeof lastCompletedChapterId !== "string" ||
        !/^[a-z0-9][a-z0-9-]{0,79}$/.test(lastCompletedChapterId))
    ) {
      continue;
    }
    tourProgress[tourId] = {
      schemaVersion: 1,
      tourId,
      tourVersion: progress.tourVersion,
      ...(lastCompletedChapterId === undefined
        ? {}
        : { lastCompletedChapterId }),
      reducedMotion: progress.reducedMotion,
    };
  }
  return tourProgress;
}

export function advanceSavedTourProgress(
  current: SavedTourProgress | undefined,
  tour: Pick<TourDefinition, "id" | "version" | "chapters">,
  completedChapterId: string,
  reducedMotion: boolean,
): SavedTourProgress | undefined {
  const completedIndex = tour.chapters.findIndex(
    (chapter) => chapter.id === completedChapterId,
  );
  if (completedIndex < 0) return current;
  const previousCompletedIndex =
    current?.tourId === tour.id &&
    current.tourVersion === tour.version &&
    current.lastCompletedChapterId
      ? tour.chapters.findIndex(
          (chapter) => chapter.id === current.lastCompletedChapterId,
        )
      : -1;
  // A completion marker advances only one contiguous chapter at a time.
  // Direct chapter selection and skip controls therefore cannot overstate
  // progress, while normal timed playback can persist each completed chapter.
  if (completedIndex !== previousCompletedIndex + 1) return current;
  return {
    schemaVersion: 1,
    tourId: tour.id,
    tourVersion: tour.version,
    lastCompletedChapterId: completedChapterId,
    reducedMotion,
  };
}

export function parseAtlasLocalState(
  serialized: string | null,
): AtlasLocalState {
  if (!serialized) return defaultAtlasLocalState;
  try {
    const candidate: unknown = JSON.parse(serialized);
    if (
      !isRecord(candidate) ||
      ![1, ATLAS_STORAGE_VERSION].includes(candidate.version as number)
    ) {
      return defaultAtlasLocalState;
    }
    // Version 1 stored a numeric chapter index and could not distinguish a
    // completed chapter from a direct jump. Preserve the other bounded state,
    // but deliberately discard that ambiguous progress during migration.
    const tourProgress =
      candidate.version === ATLAS_STORAGE_VERSION
        ? parseTourProgress(candidate.tourProgress)
        : {};
    const layerVisibility: Record<string, boolean> = {};
    if (isRecord(candidate.layerVisibility)) {
      for (const [layerId, visible] of Object.entries(
        candidate.layerVisibility,
      ).slice(0, 64)) {
        if (
          /^[a-z0-9][a-z0-9-]{0,79}$/.test(layerId) &&
          typeof visible === "boolean"
        ) {
          layerVisibility[layerId] = visible;
        }
      }
    }
    return {
      version: ATLAS_STORAGE_VERSION,
      preferences: parsePreferences(candidate.preferences),
      bookmarks: uniqueSafeIds(candidate.bookmarks, 250),
      recentObjects: uniqueSafeIds(candidate.recentObjects, 20),
      recentSearches: Array.isArray(candidate.recentSearches)
        ? [
            ...new Set(
              candidate.recentSearches.filter(
                (item): item is string =>
                  typeof item === "string" &&
                  item.trim().length > 0 &&
                  item.length <= 120,
              ),
            ),
          ].slice(0, 10)
        : [],
      tourProgress,
      layerVisibility,
    };
  } catch {
    return defaultAtlasLocalState;
  }
}

export function serializeAtlasLocalState(state: AtlasLocalState): string {
  return JSON.stringify({
    version: ATLAS_STORAGE_VERSION,
    preferences: parsePreferences(state.preferences),
    bookmarks: uniqueSafeIds(state.bookmarks, 250),
    recentObjects: uniqueSafeIds(state.recentObjects, 20),
    recentSearches: [...new Set(state.recentSearches)]
      .filter((item) => item.trim().length > 0 && item.length <= 120)
      .slice(0, 10),
    tourProgress: state.tourProgress,
    layerVisibility: Object.fromEntries(
      Object.entries(state.layerVisibility)
        .filter(
          ([layerId, visible]) =>
            /^[a-z0-9][a-z0-9-]{0,79}$/.test(layerId) &&
            typeof visible === "boolean",
        )
        .slice(0, 64),
    ),
  });
}

type AtlasStorageReader = Pick<Storage, "getItem">;
type AtlasStorageWriter = Pick<Storage, "setItem">;
type AtlasStorageRemover = Pick<Storage, "removeItem">;

export interface AtlasStorageReadResult {
  readonly state: AtlasLocalState;
  readonly available: boolean;
}

export function readAtlasLocalState(
  storage: AtlasStorageReader | null,
): AtlasStorageReadResult {
  if (!storage) {
    return { state: defaultAtlasLocalState, available: false };
  }
  try {
    return {
      state: parseAtlasLocalState(storage.getItem(ATLAS_STORAGE_KEY)),
      available: true,
    };
  } catch {
    return { state: defaultAtlasLocalState, available: false };
  }
}

export function writeAtlasLocalState(
  storage: AtlasStorageWriter | null,
  state: AtlasLocalState,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ATLAS_STORAGE_KEY, serializeAtlasLocalState(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAtlasLocalState(
  storage: AtlasStorageRemover | null,
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(ATLAS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

type AtlasCacheStorage = Pick<CacheStorage, "keys" | "delete">;

export async function clearAtlasOfflineCaches(
  cacheStorage: AtlasCacheStorage | null,
): Promise<boolean> {
  // No Cache Storage capability means there are no Atlas caches to remove.
  if (!cacheStorage) return true;
  try {
    const ownedCacheNames = (await cacheStorage.keys()).filter((name) =>
      name.startsWith(ATLAS_OFFLINE_CACHE_PREFIX),
    );
    const results = await Promise.all(
      ownedCacheNames.map((name) => cacheStorage.delete(name)),
    );
    return results.every(Boolean);
  } catch {
    return false;
  }
}
