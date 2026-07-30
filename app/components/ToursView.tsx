"use client";

import { useEffect, useRef, useState } from "react";
import {
  catalogueById,
  guidedTours,
  sourceById,
  tourPresentation,
  type CosmosExhibit,
} from "../../lib/cosmos-data";
import { formatUiMessage, type UiCopy } from "../../lib/i18n";
import { createTourCameraDirective } from "../../lib/tour-camera-directive";
import {
  planTourTransition,
  type SavedTourProgress,
  type TourDefinition,
} from "../../packages/tour-engine/src/index";
import { CosmosScene } from "./CosmosScene";
import { cssVars } from "./css-vars";

export interface TourRuntimeState {
  readonly activeTourId: string | null;
  readonly chapterIndex: number;
  readonly playing: boolean;
  readonly progress: number;
}

interface ToursViewProps {
  readonly copy: UiCopy;
  readonly reducedMotion: boolean;
  readonly runtime: TourRuntimeState;
  readonly savedProgress: Readonly<Record<string, SavedTourProgress>>;
  readonly onChapterCompleted: (
    tour: TourDefinition,
    chapterId: string,
  ) => void;
  readonly onExit: () => void;
  readonly onOpenObject: (object: CosmosExhibit) => void;
  readonly onRuntimeChange: (runtime: TourRuntimeState) => void;
  readonly onStart: (tour: TourDefinition, chapterIndex: number) => void;
}

export function ToursView({
  copy,
  reducedMotion,
  runtime,
  savedProgress,
  onChapterCompleted,
  onExit,
  onOpenObject,
  onRuntimeChange,
  onStart,
}: ToursViewProps) {
  const activeTour = guidedTours.find(
    (tour) => tour.id === runtime.activeTourId,
  );
  const chapter = activeTour?.chapters[runtime.chapterIndex];
  const [narratingChapterId, setNarratingChapterId] = useState<string | null>(
    null,
  );
  const [manualChapterId, setManualChapterId] = useState<string | null>(null);
  const [playbackEpoch, setPlaybackEpoch] = useState(0);
  const progressRef = useRef(runtime.progress);
  const playbackTokenRef = useRef(0);
  const chapterRuntimeId =
    activeTour && chapter ? `${activeTour.id}:${chapter.id}` : null;
  const narrating = narratingChapterId === chapterRuntimeId;
  const manualExploration = manualChapterId === chapterRuntimeId;

  useEffect(() => {
    progressRef.current = runtime.progress;
  }, [runtime.progress]);

  useEffect(() => {
    if (!chapter) return;
    const target = catalogueById.get(chapter.waypoint.targetObjectId);
    if (target) onOpenObject(target);
  }, [chapter, onOpenObject]);

  useEffect(() => {
    if (!activeTour || !chapter || !runtime.playing) return;
    const chapterDuration = Math.max(0.1, chapter.duration.value);
    const started =
      performance.now() - progressRef.current * chapterDuration * 1000;
    let frame = 0;
    let lastEmission = 0;
    const playbackToken = playbackTokenRef.current;
    const tick = (now: number) => {
      if (playbackToken !== playbackTokenRef.current) return;
      const progress = Math.min(1, (now - started) / (chapterDuration * 1000));
      if (progress >= 1) {
        onChapterCompleted(activeTour, chapter.id);
        const nextIndex = runtime.chapterIndex + 1;
        if (nextIndex < activeTour.chapters.length) {
          onRuntimeChange({
            activeTourId: activeTour.id,
            chapterIndex: nextIndex,
            playing: !chapter.pauseAtEnd,
            progress: 0,
          });
        } else {
          onRuntimeChange({
            activeTourId: activeTour.id,
            chapterIndex: runtime.chapterIndex,
            playing: false,
            progress: 1,
          });
        }
        return;
      }
      progressRef.current = progress;
      if (now - lastEmission >= 80) {
        lastEmission = now;
        onRuntimeChange({
          activeTourId: activeTour.id,
          chapterIndex: runtime.chapterIndex,
          playing: true,
          progress,
        });
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [
    activeTour,
    chapter,
    onChapterCompleted,
    onRuntimeChange,
    playbackEpoch,
    runtime.activeTourId,
    runtime.chapterIndex,
    runtime.playing,
  ]);

  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [chapterRuntimeId],
  );

  function speakTranscript() {
    if (!chapter || !chapterRuntimeId || !("speechSynthesis" in window)) {
      return;
    }
    if (narrating) {
      window.speechSynthesis.cancel();
      setNarratingChapterId(null);
      return;
    }
    const spokenChapterId = chapterRuntimeId;
    const utterance = new SpeechSynthesisUtterance(
      chapter.narration?.script ?? chapter.transcript,
    );
    utterance.lang = activeTour?.language ?? "en";
    utterance.rate = 0.96;
    utterance.onend = () =>
      setNarratingChapterId((current) =>
        current === spokenChapterId ? null : current,
      );
    utterance.onerror = () =>
      setNarratingChapterId((current) =>
        current === spokenChapterId ? null : current,
      );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setNarratingChapterId(spokenChapterId);
  }

  if (!activeTour || !chapter) {
    return (
      <div className="content-view tours-view">
        <header className="section-heading">
          <div>
            <p className="eyebrow">{copy.toursView.indexEyebrow}</p>
            <h1>{copy.toursTitle}</h1>
            <p>{copy.toursDek}</p>
          </div>
          <div className="tour-orbit-mark" aria-hidden="true">
            <span />
            <i />
            <b>7</b>
          </div>
        </header>
        {reducedMotion ? (
          <p className="mode-notice">◉ {copy.reducedTour}</p>
        ) : null}
        <div className="tour-grid">
          {guidedTours.map((tour, index) => {
            const details = tourPresentation.find(
              (item) => item.tourId === tour.id,
            );
            const progress = savedProgress[tour.id];
            const completedIndex =
              progress?.tourVersion === tour.version &&
              progress.lastCompletedChapterId
                ? tour.chapters.findIndex(
                    (chapter) => chapter.id === progress.lastCompletedChapterId,
                  )
                : -1;
            const progressIndex =
              completedIndex < 0
                ? 0
                : Math.min(completedIndex + 1, tour.chapters.length - 1);
            const hasProgress = completedIndex >= 0;
            const firstTarget = catalogueById.get(
              tour.chapters[0].waypoint.targetObjectId,
            );
            return (
              <article
                className="tour-card"
                key={tour.id}
                style={cssVars({
                  "--tour-colour":
                    firstTarget?.visual.colour ?? "var(--accent-primary)",
                })}
              >
                <div className="tour-card-visual" aria-hidden="true">
                  <span className="tour-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="tour-path">
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{firstTarget?.visual.glyph ?? "✦"}</strong>
                </div>
                <div className="tour-card-body">
                  <div className="badge-row">
                    <span className="data-badge kind-catalogue-backed">
                      {tour.chapters.length} {copy.chapters}
                    </span>
                    <span>
                      {details
                        ? formatUiMessage(copy.toursView.durationMinutes, {
                            minutes: details.estimatedMinutes,
                          })
                        : copy.toursView.guidedJourney}
                    </span>
                  </div>
                  <h2>{tour.title}</h2>
                  <p>{tour.summary}</p>
                  {details ? (
                    <p className="tour-audience">{details.audience}</p>
                  ) : null}
                  <ol className="tour-chapter-preview">
                    {tour.chapters.slice(0, 3).map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                    {tour.chapters.length > 3 ? (
                      <li>
                        {formatUiMessage(copy.toursView.moreChapters, {
                          count: tour.chapters.length - 3,
                        })}
                      </li>
                    ) : null}
                  </ol>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => onStart(tour, progressIndex)}
                  >
                    <span aria-hidden="true">▶</span>
                    {hasProgress ? copy.resumeTour : copy.startTour}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  const target = catalogueById.get(chapter.waypoint.targetObjectId);
  const chapterSources = chapter.sourceIds.flatMap((sourceId) => {
    const source = sourceById.get(sourceId);
    return source ? [source] : [];
  });
  const activeTourId = activeTour.id;
  const chapterNumber = runtime.chapterIndex + 1;
  const overallProgress =
    ((runtime.chapterIndex + runtime.progress) / activeTour.chapters.length) *
    100;
  const plannedTransition = planTourTransition(
    activeTour,
    runtime.chapterIndex,
    reducedMotion,
  );
  const cameraDirective = createTourCameraDirective(chapter.waypoint);

  function selectChapter(chapterIndex: number) {
    window.speechSynthesis?.cancel();
    setNarratingChapterId(null);
    setManualChapterId(null);
    progressRef.current = 0;
    playbackTokenRef.current += 1;
    onRuntimeChange({
      activeTourId,
      chapterIndex,
      playing: false,
      progress: 0,
    });
  }

  function pauseForManualExploration() {
    if (!chapterRuntimeId) return;
    setManualChapterId(chapterRuntimeId);
    playbackTokenRef.current += 1;
    if (runtime.playing) {
      onRuntimeChange({ ...runtime, playing: false });
    }
  }

  function togglePlayback() {
    setManualChapterId(null);
    if (runtime.playing) {
      playbackTokenRef.current += 1;
    }
    onRuntimeChange({ ...runtime, playing: !runtime.playing });
  }

  return (
    <div
      className="tour-experience"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-transition-style={plannedTransition.style}
    >
      <header className="tour-experience-header">
        <button type="button" className="text-button" onClick={onExit}>
          ← {copy.exitTour}
        </button>
        <div>
          <p className="eyebrow">{copy.toursView.experienceEyebrow}</p>
          <h1>{activeTour.title}</h1>
        </div>
        <label className="tour-chapter-select">
          <span>{copy.toursView.chapter}</span>
          <select
            aria-label={copy.toursView.selectChapter}
            value={runtime.chapterIndex}
            onChange={(event) => selectChapter(Number(event.target.value))}
          >
            {activeTour.chapters.map((item, index) => (
              <option key={item.id} value={index}>
                {index + 1}. {item.title}
              </option>
            ))}
          </select>
          <small>
            {chapterNumber} / {activeTour.chapters.length}
          </small>
        </label>
      </header>

      <div
        className="tour-progress"
        role="progressbar"
        aria-label={copy.toursView.tourProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(overallProgress)}
      >
        <span style={{ width: `${overallProgress}%` }} />
      </div>

      <div className="tour-experience-grid">
        <section
          className="tour-stage"
          style={cssVars({
            "--tour-colour": target?.visual.colour ?? "var(--accent-primary)",
          })}
          aria-labelledby="tour-chapter-title"
        >
          <div className="tour-stage-space">
            <CosmosScene
              copy={copy.cosmosScene}
              key={activeTour.id}
              className="tour-live-scene"
              selectedObjectId={target?.id ?? null}
              flyTo={
                target
                  ? {
                      objectId: target.id,
                      requestId: `${activeTour.id}:${chapter.id}`,
                      durationMs:
                        plannedTransition.style === "fly"
                          ? plannedTransition.duration.value * 1000
                          : 0,
                      transitionStyle: plannedTransition.style,
                      ...cameraDirective,
                    }
                  : null
              }
              quality="medium"
              showProceduralBackground
              showGrid={false}
              showOrbits
              reducedMotion={reducedMotion}
              cameraMode="cinematic"
              ariaLabel={formatUiMessage(copy.toursView.sceneLabel, {
                title: chapter.title,
                caption: chapter.caption,
              })}
              onUserInteraction={pauseForManualExploration}
              onSelectObject={(sceneObject) => {
                const selected = sceneObject
                  ? catalogueById.get(sceneObject.id)
                  : undefined;
                if (!selected) return;
                pauseForManualExploration();
                onOpenObject(selected);
              }}
            />
            {plannedTransition.style === "fade" ? (
              <span
                key={`${activeTour.id}:${chapter.id}:fade`}
                className="tour-transition-fade"
                style={cssVars({
                  "--tour-transition-duration": `${plannedTransition.duration.value}s`,
                })}
                aria-hidden="true"
              />
            ) : null}
            <div className="tour-stage-ornament" aria-hidden="true">
              <span className="tour-stage-orbit" />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="tour-caption">
            <div className="badge-row">
              <span className={`evidence-badge status-${chapter.contentBasis}`}>
                {copy.statusLabels.evidence[chapter.contentBasis]}
              </span>
              <span>{target?.objectType ?? copy.toursView.cosmicContext}</span>
            </div>
            <p className="eyebrow">
              {formatUiMessage(copy.toursView.chapterEyebrow, {
                number: String(chapterNumber).padStart(2, "0"),
              })}
            </p>
            <h2 id="tour-chapter-title">{chapter.title}</h2>
            <p>{chapter.caption}</p>
            {chapter.caveat ? (
              <p className="tour-caveat">
                {formatUiMessage(copy.toursView.methodNote, {
                  caveat: chapter.caveat,
                })}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="tour-transcript">
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">{copy.tourTranscript}</p>
              <h2>{target?.name ?? chapter.title}</h2>
            </div>
            <button
              type="button"
              className={`icon-button ${narrating ? "is-active" : ""}`}
              aria-label={narrating ? copy.stopNarration : copy.deviceNarration}
              onClick={speakTranscript}
            >
              {narrating ? "■" : "◖"}
            </button>
          </div>
          <p>{chapter.transcript}</p>
          <details>
            <summary>{copy.tourSources}</summary>
            <ul>
              {chapterSources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.citationUrl}
                    {...(source.citationUrl.startsWith("https://")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {source.provider} — {source.citation}
                  </a>
                  <small>
                    {source.version} · {source.publicationOrSnapshotDate}
                  </small>
                </li>
              ))}
            </ul>
          </details>
          <p className="fine-print">{copy.manualExploration}</p>
          <p className="tour-runtime-status" role="status" aria-live="polite">
            {manualExploration
              ? copy.toursView.pausedForExploration
              : runtime.playing
                ? formatUiMessage(copy.toursView.playingChapter, {
                    number: chapterNumber,
                  })
                : runtime.progress >= 1 &&
                    runtime.chapterIndex === activeTour.chapters.length - 1
                  ? copy.toursView.tourComplete
                  : formatUiMessage(copy.toursView.pausedAtChapter, {
                      number: chapterNumber,
                    })}
          </p>
        </aside>
      </div>

      <footer className="tour-controls">
        <button
          type="button"
          className="icon-button"
          disabled={runtime.chapterIndex === 0}
          aria-label={copy.previousChapter}
          onClick={() => selectChapter(Math.max(0, runtime.chapterIndex - 1))}
        >
          |←
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={copy.replayChapter}
          onClick={() => {
            setManualChapterId(null);
            progressRef.current = 0;
            playbackTokenRef.current += 1;
            setPlaybackEpoch((current) => current + 1);
            onRuntimeChange({ ...runtime, progress: 0, playing: true });
          }}
        >
          ↺
        </button>
        <button
          type="button"
          className="tour-play-button"
          aria-label={runtime.playing ? copy.pause : copy.resumeTour}
          onClick={togglePlayback}
        >
          {runtime.playing ? "Ⅱ" : "▶"}
        </button>
        <button
          type="button"
          className="icon-button"
          disabled={runtime.chapterIndex === activeTour.chapters.length - 1}
          aria-label={copy.nextChapter}
          onClick={() =>
            selectChapter(
              Math.min(
                activeTour.chapters.length - 1,
                runtime.chapterIndex + 1,
              ),
            )
          }
        >
          →|
        </button>
        <span className="tour-timeline">
          <i style={{ width: `${runtime.progress * 100}%` }} />
        </span>
        <small>
          {formatUiMessage(copy.toursView.elapsedTime, {
            elapsed: Math.round(runtime.progress * chapter.duration.value),
            duration: chapter.duration.value,
          })}
        </small>
      </footer>
    </div>
  );
}
