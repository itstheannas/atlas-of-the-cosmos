"use client";

import { useMemo, useState } from "react";
import {
  analyseComparisonRow,
  canonicaliseComparisonValue,
  linearComparisonFraction,
  linearDiameterScale,
  logarithmicComparisonFraction,
  type CanonicalComparisonValue,
  type ComparisonRowAnalysis,
} from "../../lib/comparison-science";
import type {
  CosmosExhibit,
  ScientificDisplayValue,
} from "../../lib/cosmos-data";
import { formatNumber, formatUiMessage, type UiCopy } from "../../lib/i18n";
import { cssVars } from "./css-vars";

interface ComparisonViewProps {
  readonly copy: UiCopy;
  readonly objects: readonly CosmosExhibit[];
  readonly onRemove: (objectId: string) => void;
}

type ComparisonMode =
  "side-by-side" | "true-scale" | "logarithmic" | "normalised";

const comparisonFields = [
  { id: "physical-size" },
  { id: "mass" },
  { id: "temperature" },
  { id: "distance" },
  { id: "luminosity" },
  { id: "age" },
  { id: "orbital-period" },
  { id: "discovery-method" },
] as const;

type ComparisonField = (typeof comparisonFields)[number];

interface MatchedFact {
  readonly fact: ScientificDisplayValue;
  /** An explicit scientific transform, currently radius → diameter. */
  readonly valueMultiplier: number;
  readonly comparisonNote?: string;
}

function factContaining(
  object: CosmosExhibit,
  needle: string,
): ScientificDisplayValue | undefined {
  return object.facts.find((fact) =>
    fact.label.toLocaleLowerCase("en").includes(needle),
  );
}

function physicalSizeFact(
  copy: UiCopy,
  object: CosmosExhibit,
): MatchedFact | undefined {
  const diameter = factContaining(object, "diameter");
  if (diameter) return { fact: diameter, valueMultiplier: 1 };

  const radius = factContaining(object, "radius");
  if (!radius) return undefined;
  return {
    fact: radius,
    valueMultiplier: 2,
    comparisonNote: copy.comparisonView.diameterFromRadius,
  };
}

function matchingFact(
  copy: UiCopy,
  object: CosmosExhibit,
  field: ComparisonField,
): MatchedFact | undefined {
  if (field.id === "physical-size") return physicalSizeFact(copy, object);
  if (field.id === "distance") {
    return object.distance
      ? { fact: object.distance, valueMultiplier: 1 }
      : undefined;
  }

  const needleByField: Record<
    Exclude<ComparisonField["id"], "physical-size" | "distance">,
    string
  > = {
    mass: "mass",
    temperature: "temperature",
    luminosity: "luminosity",
    age: "age",
    "orbital-period": "orbital period",
    "discovery-method": "discovery method",
  };
  const fact = factContaining(object, needleByField[field.id]);
  return fact ? { fact, valueMultiplier: 1 } : undefined;
}

function canonicalValue(
  match: MatchedFact | undefined,
): CanonicalComparisonValue | undefined {
  return canonicaliseComparisonValue(match?.fact, match?.valueMultiplier);
}

function modeDescription(copy: UiCopy, mode: ComparisonMode): string {
  switch (mode) {
    case "side-by-side":
      return copy.comparisonView.sideBySideDescription;
    case "true-scale":
      return copy.comparisonView.trueScaleDescription;
    case "logarithmic":
      return copy.comparisonView.logarithmicDescription;
    case "normalised":
      return copy.comparisonView.normalisedDescription;
  }
}

function analysisNote(
  copy: UiCopy,
  analysis: ComparisonRowAnalysis,
  mode: ComparisonMode,
): string | undefined {
  if (mode !== "normalised" && mode !== "logarithmic") return undefined;
  switch (analysis.kind) {
    case "comparable":
      return mode === "normalised"
        ? formatUiMessage(copy.comparisonView.normalisedRatio, {
            unit: analysis.canonicalUnit,
          })
        : formatUiMessage(copy.comparisonView.logarithmicPosition, {
            unit: analysis.canonicalUnit,
          });
    case "incompatible":
      return formatUiMessage(copy.comparisonView.incompatibleRatio, {
        dimensions: analysis.dimensions.join(", "),
      });
    case "non-ratio":
      return formatUiMessage(copy.comparisonView.nonRatio, {
        dimension: analysis.dimension,
      });
    case "insufficient":
      return copy.comparisonView.insufficientRatio;
  }
}

function formatPercentage(fraction: number): string {
  const percentage = fraction * 100;
  return percentage >= 0.1
    ? `${formatNumber(percentage, "en", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`
    : `${percentage.toExponential(2)}%`;
}

function comparisonFieldLabel(copy: UiCopy, field: ComparisonField): string {
  const labels: Readonly<Record<ComparisonField["id"], string>> = {
    "physical-size": copy.comparisonView.fields.physicalSize,
    mass: copy.comparisonView.fields.mass,
    temperature: copy.comparisonView.fields.temperature,
    distance: copy.comparisonView.fields.distance,
    luminosity: copy.comparisonView.fields.luminosity,
    age: copy.comparisonView.fields.age,
    "orbital-period": copy.comparisonView.fields.orbitalPeriod,
    "discovery-method": copy.comparisonView.fields.discoveryMethod,
  };
  return labels[field.id];
}

export function ComparisonView({
  copy,
  objects,
  onRemove,
}: ComparisonViewProps) {
  const [mode, setMode] = useState<ComparisonMode>("side-by-side");
  const rows = useMemo(
    () =>
      comparisonFields.map((field) => {
        const matches = objects.map((object) =>
          matchingFact(copy, object, field),
        );
        const values = matches.map(canonicalValue);
        return {
          field,
          matches,
          values,
          analysis: analyseComparisonRow(values),
        };
      }),
    [copy, objects],
  );
  const physicalSizes = useMemo(
    () =>
      objects.map((object) => canonicalValue(physicalSizeFact(copy, object))),
    [copy, objects],
  );
  const sizeAnalysis = useMemo(
    () => analyseComparisonRow(physicalSizes),
    [physicalSizes],
  );
  const maximumDiameter =
    sizeAnalysis.kind === "comparable"
      ? sizeAnalysis.maximum
      : Math.max(...physicalSizes.map((size) => size?.value ?? 0), 0);

  return (
    <section className="comparison-view" aria-labelledby="comparison-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">{copy.comparisonView.eyebrow}</p>
          <h2 id="comparison-title">{copy.comparisonTitle}</h2>
        </div>
        <div
          className="segmented-control"
          role="group"
          aria-label={copy.comparisonView.modeLabel}
        >
          {(
            [
              ["side-by-side", copy.sideBySide],
              ["true-scale", copy.trueScale],
              ["logarithmic", copy.logarithmic],
              ["normalised", copy.normalised],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={mode === id ? "is-active" : undefined}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="comparison-mode-note" role="status" aria-live="polite">
        {modeDescription(copy, mode)}
      </p>

      {objects.length < 2 ? (
        <div className="empty-state comparison-empty">
          <span aria-hidden="true">⇄</span>
          <p>{copy.comparisonEmpty}</p>
        </div>
      ) : (
        <>
          <div className={`comparison-object-strip mode-${mode}`}>
            {objects.map((object, objectIndex) => {
              const size = physicalSizes[objectIndex];
              const linearScale = linearDiameterScale(
                size?.value,
                maximumDiameter,
              );
              const logPosition = logarithmicComparisonFraction(
                size,
                sizeAnalysis,
              );
              const visualScale =
                mode === "true-scale"
                  ? linearScale
                  : mode === "logarithmic"
                    ? size === undefined
                      ? 0
                      : logPosition === undefined
                        ? 0.72
                        : 0.18 + logPosition * 0.82
                    : 0.72;
              const hasScaleMeasurement = size !== undefined && size.value > 0;

              return (
                <article key={object.id}>
                  <button
                    type="button"
                    className="remove-comparison"
                    aria-label={formatUiMessage(
                      copy.comparisonView.removeObject,
                      { name: object.name },
                    )}
                    onClick={() => onRemove(object.id)}
                  >
                    ×
                  </button>
                  <div className="comparison-orbital">
                    <span
                      className={`comparison-orb${hasScaleMeasurement ? "" : " has-no-scale"}`}
                      style={{
                        ...cssVars({
                          "--object-colour": object.visual.colour,
                          "--object-scale": visualScale,
                        }),
                      }}
                      aria-hidden="true"
                    />
                    {(mode === "true-scale" || mode === "logarithmic") &&
                    !hasScaleMeasurement ? (
                      <span className="comparison-size-unavailable">
                        {copy.comparisonView.sizeUnavailable}
                      </span>
                    ) : null}
                  </div>
                  <h3>{object.name}</h3>
                  <p>{object.objectType}</p>
                  {mode === "true-scale" && hasScaleMeasurement ? (
                    <small className="comparison-size-ratio">
                      {formatUiMessage(copy.comparisonView.trueScaleRatio, {
                        percentage: formatPercentage(linearScale),
                      })}
                    </small>
                  ) : null}
                  {mode === "logarithmic" && hasScaleMeasurement ? (
                    <small className="comparison-size-ratio">
                      {logPosition === undefined
                        ? copy.comparisonView.fixedDiagram
                        : copy.comparisonView.logarithmicFloor}
                    </small>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <caption className="sr-only">
                {copy.comparisonView.accessibleCaption}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{copy.comparisonView.property}</th>
                  {objects.map((object) => (
                    <th
                      scope="col"
                      id={`comparison-object-${object.id}`}
                      key={object.id}
                    >
                      {object.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ field, matches, values, analysis }) => {
                  const rowNote = analysisNote(copy, analysis, mode);
                  const fieldHeaderId = `comparison-field-${field.id}`;
                  return (
                    <tr key={field.id}>
                      <th scope="row" id={fieldHeaderId}>
                        <span>{comparisonFieldLabel(copy, field)}</span>
                        {rowNote ? <small>{rowNote}</small> : null}
                      </th>
                      {objects.map((object, objectIndex) => {
                        const match = matches[objectIndex];
                        const fact = match?.fact;
                        const canonical = values[objectIndex];
                        const fraction =
                          mode === "logarithmic"
                            ? logarithmicComparisonFraction(canonical, analysis)
                            : mode === "normalised"
                              ? linearComparisonFraction(canonical, analysis)
                              : undefined;
                        const ratioLabel =
                          fraction === undefined
                            ? undefined
                            : mode === "logarithmic"
                              ? formatUiMessage(
                                  copy.comparisonView.logarithmicRowPosition,
                                  {
                                    percentage: formatPercentage(fraction),
                                  },
                                )
                              : formatUiMessage(
                                  copy.comparisonView.linearRowRatio,
                                  {
                                    percentage: formatPercentage(fraction),
                                  },
                                );

                        return (
                          <td
                            key={object.id}
                            headers={`${fieldHeaderId} comparison-object-${object.id}`}
                          >
                            <strong>{fact?.display ?? copy.unknown}</strong>
                            {fact ? (
                              <>
                                <small>
                                  {fact.label}
                                  {match.comparisonNote
                                    ? ` · ${match.comparisonNote}`
                                    : ""}
                                </small>
                                <small>
                                  {formatUiMessage(
                                    copy.comparisonView.evidenceAndSource,
                                    {
                                      evidence: fact.status,
                                      source: fact.sourceId,
                                    },
                                  )}
                                </small>
                              </>
                            ) : null}
                            {fraction !== undefined ? (
                              <>
                                <span
                                  className="comparison-bar"
                                  aria-hidden="true"
                                >
                                  <i
                                    style={{
                                      width: `${fraction * 100}%`,
                                      background: object.visual.colour,
                                    }}
                                  />
                                </span>
                                <small>{ratioLabel}</small>
                              </>
                            ) : null}
                            {canonical?.usedIntervalMidpoint &&
                            fraction !== undefined ? (
                              <small>
                                {copy.comparisonView.intervalMidpoint}
                              </small>
                            ) : null}
                            {fact?.uncertainty ? (
                              <small>
                                {formatUiMessage(
                                  copy.comparisonView.uncertainty,
                                  { value: fact.uncertainty },
                                )}
                              </small>
                            ) : null}
                            {fact?.note ? (
                              <small>
                                {formatUiMessage(copy.comparisonView.note, {
                                  value: fact.note,
                                })}
                              </small>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row">{copy.objectType}</th>
                  {objects.map((object) => (
                    <td key={object.id}>{object.objectType}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="comparison-caveat">{copy.comparisonCaveat}</p>
    </section>
  );
}
