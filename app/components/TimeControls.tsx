"use client";

import { useState } from "react";
import {
  astronomicalHistoryEvents,
  describeEducationalTime,
  educationalTimeModelValidity,
} from "../../lib/educational-time-model";
import {
  formatDateTime,
  formatNumber,
  formatUiMessage,
  type UiCopy,
} from "../../lib/i18n";

interface TimeControlsProps {
  readonly copy: UiCopy;
  readonly date: Date;
  readonly playing: boolean;
  readonly selectedObjectId: string;
  readonly selectedObjectName: string;
  readonly speed: number;
  readonly onDateChange: (date: Date) => void;
  readonly onPlayingChange: (playing: boolean) => void;
  readonly onReset: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

const timeSpeeds = [-86_400, -3_600, -60, 1, 60, 3_600, 86_400] as const;

function toUtcDateTimeInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function parseUtcDateTimeInput(value: string): Date | null {
  const parsed = new Date(`${value}:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

function speedLabel(copy: UiCopy, speed: number): string {
  const sign = speed < 0 ? "−" : "";
  const absolute = Math.abs(speed);
  if (absolute === 60) {
    return formatUiMessage(copy.timeControls.minutePerSecond, { sign });
  }
  if (absolute === 3_600) {
    return formatUiMessage(copy.timeControls.hourPerSecond, { sign });
  }
  if (absolute === 86_400) {
    return formatUiMessage(copy.timeControls.dayPerSecond, { sign });
  }
  return formatUiMessage(copy.timeControls.multiplier, {
    sign,
    value: formatNumber(absolute),
  });
}

export function TimeControls({
  copy,
  date,
  playing,
  selectedObjectId,
  selectedObjectName,
  speed,
  onDateChange,
  onPlayingChange,
  onReset,
  onSpeedChange,
}: TimeControlsProps) {
  const [showLocalTime, setShowLocalTime] = useState(false);
  const timeModel = describeEducationalTime(date, selectedObjectId);

  return (
    <section className="time-controller" aria-label={copy.time}>
      <div className="time-controller-main">
        <button
          type="button"
          className="time-play-button"
          aria-label={playing ? copy.pause : copy.play}
          onClick={() => onPlayingChange(!playing)}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
        <div>
          <label>
            <span>{copy.timeControls.utcDateTime}</span>
            <input
              type="datetime-local"
              value={toUtcDateTimeInput(date)}
              onChange={(event) => {
                const next = parseUtcDateTimeInput(event.target.value);
                if (next) onDateChange(next);
              }}
            />
          </label>
          <p>
            <span>{copy.julianDate}</span>
            <strong>
              {formatNumber(julianDate(date), undefined, {
                minimumFractionDigits: 5,
                maximumFractionDigits: 5,
              })}
            </strong>
          </p>
          <label className="local-time-toggle">
            <input
              type="checkbox"
              checked={showLocalTime}
              onChange={(event) => setShowLocalTime(event.target.checked)}
            />
            <span>{copy.timeControls.showLocalTime}</span>
          </label>
          {showLocalTime ? (
            <p>
              <span>{copy.timeControls.local}</span>
              <strong>{formatDateTime(date)}</strong>
            </p>
          ) : null}
        </div>
        <button type="button" className="text-button" onClick={onReset}>
          ↺ {copy.present}
        </button>
      </div>
      <div className="time-speed-row" aria-label={copy.timeControls.speedLabel}>
        {timeSpeeds.map((candidate) => (
          <button
            type="button"
            key={candidate}
            className={speed === candidate ? "is-active" : undefined}
            aria-pressed={speed === candidate}
            onClick={() => onSpeedChange(candidate)}
          >
            {speedLabel(copy, candidate)}
          </button>
        ))}
      </div>
      <div className="time-model-readout" aria-live="polite">
        <dl>
          {timeModel.orbitalPhaseDegrees === null ? null : (
            <div>
              <dt>
                {formatUiMessage(copy.timeControls.meanOrbitalPhase, {
                  name: selectedObjectName,
                })}
              </dt>
              <dd>
                {formatUiMessage(copy.timeControls.degrees, {
                  value: formatNumber(
                    timeModel.orbitalPhaseDegrees,
                    undefined,
                    {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    },
                  ),
                })}
              </dd>
            </div>
          )}
          {timeModel.rotationPhaseDegrees === null ? null : (
            <div>
              <dt>
                {formatUiMessage(copy.timeControls.rotationPhase, {
                  name: selectedObjectName,
                })}
              </dt>
              <dd>
                {formatUiMessage(copy.timeControls.degrees, {
                  value: formatNumber(
                    timeModel.rotationPhaseDegrees,
                    undefined,
                    {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    },
                  ),
                })}
              </dd>
            </div>
          )}
          <div>
            <dt>{copy.timeControls.moonPhase}</dt>
            <dd>
              {formatUiMessage(copy.timeControls.moonIllumination, {
                phase: timeModel.moonPhaseName,
                percentage: formatNumber(
                  timeModel.moonIlluminatedFraction * 100,
                  undefined,
                  { maximumFractionDigits: 0 },
                ),
              })}
            </dd>
          </div>
          <div>
            <dt>{copy.timeControls.modelWindow}</dt>
            <dd>
              {timeModel.withinModelWindow
                ? copy.timeControls.withinRange
                : formatUiMessage(copy.timeControls.outsideRange, {
                    date: formatDateTime(
                      new Date(timeModel.effectiveDateIso),
                      undefined,
                      {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      },
                    ),
                  })}
            </dd>
          </div>
        </dl>
        <label>
          <span>{copy.timeControls.historicalEvent}</span>
          <select
            defaultValue=""
            onChange={(event) => {
              const historicalEvent = astronomicalHistoryEvents.find(
                (candidate) => candidate.id === event.target.value,
              );
              if (!historicalEvent) return;
              onPlayingChange(false);
              onDateChange(new Date(historicalEvent.dateIso));
            }}
          >
            <option value="">{copy.timeControls.chooseEvent}</option>
            {astronomicalHistoryEvents.map((historicalEvent) => (
              <option key={historicalEvent.id} value={historicalEvent.id}>
                {formatUiMessage(copy.timeControls.eventOption, {
                  date: formatDateTime(
                    new Date(historicalEvent.dateIso),
                    undefined,
                    {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    },
                  ),
                  title: historicalEvent.title,
                })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="fine-print">
        {formatUiMessage(copy.timeControls.modelNote, {
          validity: educationalTimeModelValidity.description,
          precisionNote: copy.timeModelNote,
        })}
      </p>
    </section>
  );
}
