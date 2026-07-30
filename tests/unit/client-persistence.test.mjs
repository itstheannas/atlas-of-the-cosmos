import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_STORAGE_KEY,
  ATLAS_STORAGE_VERSION,
  advanceSavedTourProgress,
  clearAtlasOfflineCaches,
  clearAtlasLocalState,
  defaultAtlasLocalState,
  parseAtlasLocalState,
  readAtlasLocalState,
  writeAtlasLocalState,
} from "../../lib/client-persistence.ts";

test("browser storage access failures fall back to bounded in-memory defaults", () => {
  const result = readAtlasLocalState({
    getItem() {
      throw new DOMException("Blocked", "SecurityError");
    },
  });

  assert.equal(result.available, false);
  assert.deepEqual(result.state, defaultAtlasLocalState);
});

test("version 1 state migrates bounded preferences but drops ambiguous numeric tour progress", () => {
  const migrated = parseAtlasLocalState(
    JSON.stringify({
      version: 1,
      preferences: { ...defaultAtlasLocalState.preferences, theme: "light" },
      bookmarks: ["earth"],
      recentObjects: ["mars"],
      recentSearches: ["M 31"],
      tourProgress: { "cosmic-address": 5 },
      layerVisibility: { "coordinate-grids": true },
    }),
  );

  assert.equal(migrated.version, ATLAS_STORAGE_VERSION);
  assert.equal(migrated.preferences.theme, "light");
  assert.deepEqual(migrated.bookmarks, ["earth"]);
  assert.deepEqual(migrated.tourProgress, {});
  assert.equal(migrated.layerVisibility["coordinate-grids"], true);
});

test("version 2 accepts only versioned chapter-completion records", () => {
  const parsed = parseAtlasLocalState(
    JSON.stringify({
      ...defaultAtlasLocalState,
      tourProgress: {
        "cosmic-address": {
          schemaVersion: 1,
          tourId: "cosmic-address",
          tourVersion: "1.0.0",
          lastCompletedChapterId: "earth",
          reducedMotion: true,
        },
        invalid: 4,
      },
    }),
  );

  assert.deepEqual(Object.keys(parsed.tourProgress), ["cosmic-address"]);
  assert.equal(
    parsed.tourProgress["cosmic-address"].lastCompletedChapterId,
    "earth",
  );
});

test("tour completion advances contiguously and ignores direct jumps", () => {
  const tour = {
    id: "test-tour",
    version: "1.0.0",
    chapters: [
      { id: "chapter-one" },
      { id: "chapter-two" },
      { id: "chapter-three" },
    ],
  };
  assert.equal(
    advanceSavedTourProgress(undefined, tour, "chapter-three", false),
    undefined,
  );
  const first = advanceSavedTourProgress(undefined, tour, "chapter-one", false);
  assert.equal(first.lastCompletedChapterId, "chapter-one");
  assert.equal(
    advanceSavedTourProgress(first, tour, "chapter-three", false),
    first,
  );
  const second = advanceSavedTourProgress(first, tour, "chapter-two", true);
  assert.equal(second.lastCompletedChapterId, "chapter-two");
  assert.equal(second.reducedMotion, true);
});

test("offline reset deletes only Atlas-owned caches", async () => {
  const deleted = [];
  const result = await clearAtlasOfflineCaches({
    async keys() {
      return ["atlas-cosmos-static-v1", "unrelated-application-cache"];
    },
    async delete(name) {
      deleted.push(name);
      return true;
    },
  });

  assert.equal(result, true);
  assert.deepEqual(deleted, ["atlas-cosmos-static-v1"]);
  assert.equal(await clearAtlasOfflineCaches(null), true);
});

test("storage write and clear failures are reported without throwing", () => {
  const throwingStorage = {
    setItem() {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    },
    removeItem() {
      throw new DOMException("Blocked", "SecurityError");
    },
  };

  assert.equal(
    writeAtlasLocalState(throwingStorage, defaultAtlasLocalState),
    false,
  );
  assert.equal(clearAtlasLocalState(throwingStorage), false);
});

test("validated local state round-trips through the fixed application key", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  assert.equal(writeAtlasLocalState(storage, defaultAtlasLocalState), true);
  assert.equal(values.has(ATLAS_STORAGE_KEY), true);
  assert.equal(readAtlasLocalState(storage).available, true);
  assert.equal(clearAtlasLocalState(storage), true);
  assert.equal(values.has(ATLAS_STORAGE_KEY), false);
});
