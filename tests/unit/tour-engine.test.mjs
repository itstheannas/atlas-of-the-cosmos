import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_TOUR_STATE,
  planTourTransition,
  progressFromTourState,
  reduceTourState,
  validateTourDefinition,
} from "../../packages/tour-engine/src/index.ts";

function makeTour() {
  return {
    schemaVersion: "1.0.0",
    id: "test-cosmic-address",
    version: "1.0.0",
    language: "en",
    title: "Test cosmic address",
    summary: "A compact valid tour fixture.",
    sources: [
      {
        id: "openngc",
        title: "OpenNGC",
        provider: "OpenNGC contributors",
        url: "https://github.com/mattiaverga/OpenNGC",
        accessedAt: "2026-07-29",
      },
    ],
    chapters: [
      {
        id: "earth",
        title: "Earth",
        caption: "Our starting point.",
        transcript: "The tour starts at Earth.",
        sourceIds: ["openngc"],
        duration: { value: 8, unit: "s" },
        waypoint: {
          targetObjectId: "solar-system:earth",
          cameraDistance: { value: 20_000, unit: "km" },
          targetLock: true,
        },
        narration: {
          script: "The tour starts at Earth.",
          audioUrl: "/audio/tours/earth.mp3",
          audioDuration: { value: 7.5, unit: "s" },
        },
        transition: {
          style: "fly",
          duration: { value: 3, unit: "s" },
        },
        pauseAtEnd: false,
        contentBasis: "observed",
      },
      {
        id: "milky-way",
        title: "Milky Way",
        caption: "A modelled view of our Galaxy.",
        transcript: "This external view is a reconstruction.",
        sourceIds: ["openngc"],
        duration: { value: 6, unit: "s" },
        waypoint: {
          targetObjectId: "scene:milky-way-model",
          cameraDistance: { value: 20, unit: "kpc" },
          targetLock: true,
        },
        transition: {
          style: "fly",
          duration: { value: 4, unit: "s" },
        },
        pauseAtEnd: true,
        contentBasis: "modelled",
        caveat: "The external view is an evidence-based reconstruction.",
      },
    ],
  };
}

test("tour validator accepts a complete typed tour", () => {
  const result = validateTourDefinition(makeTour());
  assert.equal(result.valid, true);
  assert.equal(result.value.chapters.length, 2);
});

test("tour validator catches duplicate chapters and missing model caveats", () => {
  const invalid = makeTour();
  invalid.chapters[1].id = "earth";
  delete invalid.chapters[1].caveat;
  const result = validateTourDefinition(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "chapter.duplicate"));
  assert.ok(result.issues.some((issue) => issue.code === "chapter.caveat"));
});

test("tour validator rejects unsafe narration URLs", () => {
  const invalid = makeTour();
  invalid.chapters[0].narration.audioUrl = "../private/audio.mp3";
  const result = validateTourDefinition(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "narration.url"));
});

test("tour validator requires chapter-level source coverage", () => {
  const invalid = makeTour();
  invalid.chapters[0].sourceIds = [];
  const result = validateTourDefinition(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "chapter.sources"));
});

test("tour playback advances, pauses, interrupts, and persists progress", () => {
  const validation = validateTourDefinition(makeTour());
  assert.equal(validation.valid, true);
  const tour = validation.value;

  let state = reduceTourState(INITIAL_TOUR_STATE, {
    type: "load",
    tour,
    reducedMotion: false,
  });
  state = reduceTourState(state, { type: "play" }, tour);
  state = reduceTourState(
    state,
    { type: "tick", elapsed: { value: 10, unit: "s" } },
    tour,
  );
  assert.equal(state.chapterIndex, 1);
  assert.equal(state.elapsedInChapter.value, 2);
  assert.deepEqual(state.completedChapterIds, ["earth"]);

  state = reduceTourState(
    state,
    { type: "interrupt", reason: "user-input" },
    tour,
  );
  assert.equal(state.status, "interrupted");
  assert.equal(state.interruptionReason, "user-input");
  state = reduceTourState(state, { type: "resume" }, tour);
  assert.equal(state.status, "playing");

  const progress = progressFromTourState(state);
  assert.equal(progress.lastCompletedChapterId, "earth");
  const resumed = reduceTourState(INITIAL_TOUR_STATE, {
    type: "load",
    tour,
    reducedMotion: true,
    savedProgress: progress,
  });
  assert.equal(resumed.chapterIndex, 1);
});

test("reduced-motion planning replaces cinematic flight with a short fade", () => {
  const result = validateTourDefinition(makeTour());
  assert.equal(result.valid, true);
  const normal = planTourTransition(result.value, 0, false);
  const reduced = planTourTransition(result.value, 0, true);
  assert.equal(normal.style, "fly");
  assert.equal(normal.duration.value, 3);
  assert.equal(reduced.style, "fade");
  assert.equal(reduced.duration.value, 0.25);
  assert.equal(reduced.targetObjectId, normal.targetObjectId);
});

test("tour ticks reject ambiguous or negative elapsed time", () => {
  const result = validateTourDefinition(makeTour());
  assert.equal(result.valid, true);
  const loaded = reduceTourState(INITIAL_TOUR_STATE, {
    type: "load",
    tour: result.value,
    reducedMotion: false,
  });
  const playing = reduceTourState(loaded, { type: "play" }, result.value);
  assert.throws(
    () =>
      reduceTourState(
        playing,
        { type: "tick", elapsed: { value: -1, unit: "s" } },
        result.value,
      ),
    /non-negative/,
  );
});
