import type { Quantity } from "../../shared-types/src/index.ts";
import type { TourDefinition, TourTransitionStyle } from "./schema.ts";

export type TourPlaybackStatus =
  | "idle"
  | "ready"
  | "playing"
  | "paused"
  | "manual-exploration"
  | "interrupted"
  | "completed"
  | "exited";

export interface TourState {
  readonly status: TourPlaybackStatus;
  readonly tourId?: string;
  readonly tourVersion?: string;
  readonly chapterIndex: number;
  readonly elapsedInChapter: Quantity<"s">;
  readonly completedChapterIds: readonly string[];
  readonly reducedMotion: boolean;
  readonly interruptionReason?:
    "user-input" | "new-target" | "context-loss" | "error";
}

export interface SavedTourProgress {
  readonly schemaVersion: 1;
  readonly tourId: string;
  readonly tourVersion: string;
  readonly lastCompletedChapterId?: string;
  readonly reducedMotion: boolean;
}

export type TourEvent =
  | {
      readonly type: "load";
      readonly tour: TourDefinition;
      readonly reducedMotion: boolean;
      readonly savedProgress?: SavedTourProgress;
    }
  | { readonly type: "play" }
  | { readonly type: "pause" }
  | { readonly type: "tick"; readonly elapsed: Quantity<"s"> }
  | { readonly type: "next" }
  | { readonly type: "previous" }
  | { readonly type: "enter-manual-exploration" }
  | { readonly type: "resume" }
  | {
      readonly type: "interrupt";
      readonly reason: "user-input" | "new-target" | "context-loss" | "error";
    }
  | { readonly type: "exit" }
  | { readonly type: "replay" };

export const INITIAL_TOUR_STATE: TourState = {
  status: "idle",
  chapterIndex: 0,
  elapsedInChapter: { value: 0, unit: "s" },
  completedChapterIds: [],
  reducedMotion: false,
};

function requireLoadedTour(
  state: TourState,
  tour: TourDefinition | undefined,
): TourDefinition {
  if (!tour || !state.tourId || tour.id !== state.tourId) {
    throw new Error(
      "Tour state transition requires the loaded tour definition.",
    );
  }
  return tour;
}

function appendCompleted(
  completed: readonly string[],
  chapterId: string,
): readonly string[] {
  return completed.includes(chapterId) ? completed : [...completed, chapterId];
}

function nextChapterState(
  state: TourState,
  tour: TourDefinition,
  forcePause = false,
): TourState {
  const chapter = tour.chapters[state.chapterIndex];
  if (!chapter) return state;
  const completedChapterIds = appendCompleted(
    state.completedChapterIds,
    chapter.id,
  );
  if (state.chapterIndex >= tour.chapters.length - 1) {
    return {
      ...state,
      status: "completed",
      elapsedInChapter: { value: chapter.duration.value, unit: "s" },
      completedChapterIds,
    };
  }
  return {
    ...state,
    status: forcePause || chapter.pauseAtEnd ? "paused" : state.status,
    chapterIndex: state.chapterIndex + 1,
    elapsedInChapter: { value: 0, unit: "s" },
    completedChapterIds,
  };
}

function tickPlayingState(
  state: TourState,
  tour: TourDefinition,
  elapsedSeconds: number,
): TourState {
  let next = state;
  let remaining = elapsedSeconds;
  while (remaining > 0 && next.status === "playing") {
    const chapter = tour.chapters[next.chapterIndex];
    if (!chapter) return { ...next, status: "completed" };
    const timeLeft = Math.max(
      0,
      chapter.duration.value - next.elapsedInChapter.value,
    );
    if (remaining < timeLeft) {
      return {
        ...next,
        elapsedInChapter: {
          value: next.elapsedInChapter.value + remaining,
          unit: "s",
        },
      };
    }
    remaining -= timeLeft;
    next = nextChapterState(next, tour);
    if (timeLeft === 0 && next.status === "playing" && remaining === 0) break;
  }
  return next;
}

function chapterIndexFromSavedProgress(
  tour: TourDefinition,
  progress: SavedTourProgress | undefined,
): {
  readonly chapterIndex: number;
  readonly completedChapterIds: readonly string[];
} {
  if (
    !progress ||
    progress.tourId !== tour.id ||
    progress.tourVersion !== tour.version ||
    !progress.lastCompletedChapterId
  ) {
    return { chapterIndex: 0, completedChapterIds: [] };
  }
  const completedIndex = tour.chapters.findIndex(
    (chapter) => chapter.id === progress.lastCompletedChapterId,
  );
  if (completedIndex < 0) return { chapterIndex: 0, completedChapterIds: [] };
  return {
    chapterIndex: Math.min(completedIndex + 1, tour.chapters.length - 1),
    completedChapterIds: tour.chapters
      .slice(0, completedIndex + 1)
      .map((chapter) => chapter.id),
  };
}

export function reduceTourState(
  state: TourState,
  event: TourEvent,
  tour?: TourDefinition,
): TourState {
  switch (event.type) {
    case "load": {
      const resume = chapterIndexFromSavedProgress(
        event.tour,
        event.savedProgress,
      );
      return {
        status: "ready",
        tourId: event.tour.id,
        tourVersion: event.tour.version,
        chapterIndex: resume.chapterIndex,
        elapsedInChapter: { value: 0, unit: "s" },
        completedChapterIds: resume.completedChapterIds,
        reducedMotion: event.reducedMotion,
      };
    }
    case "play":
    case "resume":
      requireLoadedTour(state, tour);
      if (
        !["ready", "paused", "manual-exploration", "interrupted"].includes(
          state.status,
        )
      ) {
        return state;
      }
      return { ...state, status: "playing", interruptionReason: undefined };
    case "pause":
      return state.status === "playing"
        ? { ...state, status: "paused" }
        : state;
    case "tick": {
      const loadedTour = requireLoadedTour(state, tour);
      if (state.status !== "playing") return state;
      if (
        event.elapsed.unit !== "s" ||
        !Number.isFinite(event.elapsed.value) ||
        event.elapsed.value < 0
      ) {
        throw new RangeError(
          "Tour tick must be a finite, non-negative duration in seconds.",
        );
      }
      return tickPlayingState(state, loadedTour, event.elapsed.value);
    }
    case "next":
      return nextChapterState(state, requireLoadedTour(state, tour), true);
    case "previous": {
      requireLoadedTour(state, tour);
      const chapterIndex = Math.max(0, state.chapterIndex - 1);
      return {
        ...state,
        status: "paused",
        chapterIndex,
        elapsedInChapter: { value: 0, unit: "s" },
      };
    }
    case "enter-manual-exploration":
      requireLoadedTour(state, tour);
      return ["playing", "paused"].includes(state.status)
        ? { ...state, status: "manual-exploration" }
        : state;
    case "interrupt":
      return ["playing", "paused", "manual-exploration"].includes(state.status)
        ? {
            ...state,
            status: "interrupted",
            interruptionReason: event.reason,
          }
        : state;
    case "exit":
      return {
        ...state,
        status: "exited",
        elapsedInChapter: { value: 0, unit: "s" },
      };
    case "replay":
      requireLoadedTour(state, tour);
      return {
        ...state,
        status: "ready",
        chapterIndex: 0,
        elapsedInChapter: { value: 0, unit: "s" },
        completedChapterIds: [],
        interruptionReason: undefined,
      };
  }
}

export interface PlannedTourTransition {
  readonly style: TourTransitionStyle;
  readonly duration: Quantity<"s">;
  readonly targetObjectId: string;
  readonly announceCaption: string;
}

export function planTourTransition(
  tour: TourDefinition,
  chapterIndex: number,
  reducedMotion: boolean,
): PlannedTourTransition {
  const chapter = tour.chapters[chapterIndex];
  if (!chapter) throw new RangeError("Chapter index is outside the tour.");
  if (!reducedMotion) {
    return {
      style: chapter.transition.style,
      duration: chapter.transition.duration,
      targetObjectId: chapter.waypoint.targetObjectId,
      announceCaption: chapter.caption,
    };
  }
  return {
    style: chapter.transition.style === "cut" ? "cut" : "fade",
    duration: {
      value:
        chapter.transition.style === "cut"
          ? 0
          : Math.min(0.25, chapter.transition.duration.value),
      unit: "s",
    },
    targetObjectId: chapter.waypoint.targetObjectId,
    announceCaption: chapter.caption,
  };
}

export function progressFromTourState(
  state: TourState,
): SavedTourProgress | undefined {
  if (!state.tourId || !state.tourVersion) return undefined;
  return {
    schemaVersion: 1,
    tourId: state.tourId,
    tourVersion: state.tourVersion,
    lastCompletedChapterId:
      state.completedChapterIds[state.completedChapterIds.length - 1],
    reducedMotion: state.reducedMotion,
  };
}
