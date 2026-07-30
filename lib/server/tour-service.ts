import {
  guidedTours,
  tourPresentation,
  type TourPresentation,
} from "../cosmos-data.ts";
import type {
  TourChapter,
  TourDefinition,
  TourSource,
} from "../../packages/tour-engine/src/schema.ts";
import { ApiProblem } from "./api-error.ts";

const presentationByTourId = new Map(
  tourPresentation.map((presentation) => [presentation.tourId, presentation]),
);

const tourById = new Map(guidedTours.map((tour) => [tour.id, tour]));

function projectPresentation(presentation: TourPresentation | undefined) {
  if (!presentation) return null;
  return {
    slug: presentation.slug,
    subtitle: presentation.subtitle,
    estimatedMinutes: presentation.estimatedMinutes,
    coverObjectId: presentation.coverObjectId,
    accent: presentation.accent,
    audience: presentation.audience,
    screenReaderSummary: presentation.screenReaderSummary,
    capabilities: {
      pause: presentation.capabilities.pause,
      resume: presentation.capabilities.resume,
      replay: presentation.capabilities.replay,
      chapterNavigation: presentation.capabilities.chapterNavigation,
      manualExplorationBetweenChapters:
        presentation.capabilities.manualExplorationBetweenChapters,
      savesProgressLocally: presentation.capabilities.savesProgressLocally,
      deepLinks: presentation.capabilities.deepLinks,
      optionalAudioNarration: presentation.capabilities.optionalAudioNarration,
      captions: presentation.capabilities.captions,
      completeTranscript: presentation.capabilities.completeTranscript,
      reducedMotionAlternative:
        presentation.capabilities.reducedMotionAlternative,
    },
  };
}

function projectTourSource(source: TourSource) {
  return {
    id: source.id,
    title: source.title,
    provider: source.provider,
    url: source.url,
    accessedAt: source.accessedAt,
  };
}

function projectTourChapter(chapter: TourChapter) {
  return {
    id: chapter.id,
    title: chapter.title,
    caption: chapter.caption,
    transcript: chapter.transcript,
    sourceIds: [...chapter.sourceIds],
    narration: chapter.narration
      ? {
          script: chapter.narration.script,
          audioUrl: chapter.narration.audioUrl ?? null,
          audioDuration: chapter.narration.audioDuration
            ? {
                value: chapter.narration.audioDuration.value,
                unit: chapter.narration.audioDuration.unit,
              }
            : null,
        }
      : null,
    duration: {
      value: chapter.duration.value,
      unit: chapter.duration.unit,
    },
    waypoint: {
      targetObjectId: chapter.waypoint.targetObjectId,
      cameraDistance: chapter.waypoint.cameraDistance
        ? {
            value: chapter.waypoint.cameraDistance.value,
            unit: chapter.waypoint.cameraDistance.unit,
          }
        : null,
      orientation: chapter.waypoint.orientation
        ? {
            yaw: {
              value: chapter.waypoint.orientation.yaw.value,
              unit: chapter.waypoint.orientation.yaw.unit,
            },
            pitch: {
              value: chapter.waypoint.orientation.pitch.value,
              unit: chapter.waypoint.orientation.pitch.unit,
            },
            roll: {
              value: chapter.waypoint.orientation.roll.value,
              unit: chapter.waypoint.orientation.roll.unit,
            },
          }
        : null,
      targetLock: chapter.waypoint.targetLock,
    },
    transition: {
      style: chapter.transition.style,
      duration: {
        value: chapter.transition.duration.value,
        unit: chapter.transition.duration.unit,
      },
    },
    pauseAtEnd: chapter.pauseAtEnd,
    contentBasis: chapter.contentBasis,
    caveat: chapter.caveat ?? null,
  };
}

function projectTourSummary(tour: TourDefinition) {
  const presentation = presentationByTourId.get(tour.id);
  return {
    id: tour.id,
    schemaVersion: tour.schemaVersion,
    version: tour.version,
    language: tour.language,
    title: tour.title,
    summary: tour.summary,
    chapterCount: tour.chapters.length,
    sourceCount: tour.sources.length,
    presentation: projectPresentation(presentation),
  };
}

function projectTour(tour: TourDefinition) {
  return {
    id: tour.id,
    schemaVersion: tour.schemaVersion,
    version: tour.version,
    language: tour.language,
    title: tour.title,
    summary: tour.summary,
    chapters: tour.chapters.map(projectTourChapter),
    sources: tour.sources.map(projectTourSource),
    presentation: projectPresentation(presentationByTourId.get(tour.id)),
  };
}

export function listTours() {
  return {
    items: guidedTours.map(projectTourSummary),
    total: guidedTours.length,
    schemaVersion: "1.0.0" as const,
  };
}

export function getTour(id: string) {
  const tour = tourById.get(id);
  if (!tour) {
    throw new ApiProblem(
      "NOT_FOUND",
      "The requested guided tour was not found.",
    );
  }
  return { tour: projectTour(tour) };
}
