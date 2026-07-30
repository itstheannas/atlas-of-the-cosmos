"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  cosmosCatalogue,
  sourceById,
  type CosmosExhibit,
} from "../../lib/cosmos-data";
import { matchesConstellationFilter } from "../../lib/constellations";
import type { UiCopy } from "../../lib/i18n";
import { normalizeSearchText } from "../../packages/catalogue-client/src/search";
import { cssVars } from "./css-vars";

interface SearchDialogProps {
  readonly copy: UiCopy;
  readonly open: boolean;
  readonly recentSearches: readonly string[];
  readonly onClose: () => void;
  readonly onCommitSearch: (query: string) => void;
  readonly onSelect: (object: CosmosExhibit) => void;
}

interface SearchQuery {
  readonly text: string;
  readonly type?: string;
  readonly source?: string;
  readonly constellation?: string;
  readonly cone?: {
    readonly rightAscensionDeg: number;
    readonly declinationDeg: number;
    readonly radiusDeg: number;
  };
  readonly near?: {
    readonly objectKey: string;
    readonly radiusDeg: number;
  };
  readonly maximumMagnitude?: number;
  readonly maximumDistance?: {
    readonly value: number;
    readonly unit: string;
  };
}

function parseQuery(input: string): SearchQuery {
  const text: string[] = [];
  let type: string | undefined;
  let source: string | undefined;
  let constellation: string | undefined;
  let cone: SearchQuery["cone"];
  let near: SearchQuery["near"];
  let maximumMagnitude: number | undefined;
  let maximumDistance: SearchQuery["maximumDistance"];

  for (const token of input.trim().split(/\s+/)) {
    if (token.toLocaleLowerCase("en").startsWith("type:")) {
      type = normalizeSearchText(token.slice(5));
      continue;
    }
    if (token.toLocaleLowerCase("en").startsWith("source:")) {
      source = normalizeSearchText(token.slice(7));
      continue;
    }
    if (/^(?:constellation|const):/i.test(token)) {
      constellation = normalizeSearchText(token.replace(/^[^:]+:/, ""));
      continue;
    }
    const coneToken =
      /^cone:(\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/i.exec(
        token,
      );
    if (coneToken) {
      const rightAscensionDeg = Number(coneToken[1]);
      const declinationDeg = Number(coneToken[2]);
      const radiusDeg = Number(coneToken[3]);
      if (
        rightAscensionDeg >= 0 &&
        rightAscensionDeg < 360 &&
        declinationDeg >= -90 &&
        declinationDeg <= 90 &&
        radiusDeg > 0 &&
        radiusDeg <= 180
      ) {
        cone = { rightAscensionDeg, declinationDeg, radiusDeg };
      }
      continue;
    }
    const nearToken = /^near:([a-z0-9-]+),(\d+(?:\.\d+)?)deg$/i.exec(token);
    if (nearToken) {
      const radiusDeg = Number(nearToken[2]);
      if (radiusDeg > 0 && radiusDeg <= 180) {
        near = {
          objectKey: normalizeSearchText(nearToken[1]),
          radiusDeg,
        };
      }
      continue;
    }
    const magnitude = /^mag(?:<|<=)(-?\d+(?:\.\d+)?)$/i.exec(token);
    if (magnitude) {
      maximumMagnitude = Number(magnitude[1]);
      continue;
    }
    const distance =
      /^distance(?:<|<=)(\d+(?:\.\d+)?)(km|au|ly|pc|kpc|mpc)$/i.exec(token);
    if (distance) {
      maximumDistance = {
        value: Number(distance[1]),
        unit: distance[2].toLocaleLowerCase("en"),
      };
      continue;
    }
    text.push(token);
  }
  return {
    text: normalizeSearchText(text.join(" ")),
    type,
    source,
    constellation,
    cone,
    near,
    maximumMagnitude,
    maximumDistance,
  };
}

function equatorialCoordinates(object: CosmosExhibit): {
  readonly rightAscensionDeg: number;
  readonly declinationDeg: number;
} | null {
  const rightAscension = object.coordinates?.rightAscension;
  const declination = object.coordinates?.declination;
  if (!rightAscension || !declination) return null;

  const raMatch =
    /(\d+(?:\.\d+)?)h\s*(\d+(?:\.\d+)?)m(?:\s*(\d+(?:\.\d+)?)s)?/u.exec(
      rightAscension,
    );
  const decMatch =
    /([+−-])?(\d+(?:\.\d+)?)°\s*(\d+(?:\.\d+)?)?['′]?(?:\s*(\d+(?:\.\d+)?)["″])?/u.exec(
      declination,
    );
  if (!raMatch || !decMatch) return null;

  const rightAscensionDeg =
    (Number(raMatch[1]) +
      Number(raMatch[2]) / 60 +
      Number(raMatch[3] ?? 0) / 3600) *
    15;
  const declinationAbsolute =
    Number(decMatch[2]) +
    Number(decMatch[3] ?? 0) / 60 +
    Number(decMatch[4] ?? 0) / 3600;
  const declinationDeg =
    decMatch[1] === "-" || decMatch[1] === "−"
      ? -declinationAbsolute
      : declinationAbsolute;
  return { rightAscensionDeg, declinationDeg };
}

function angularSeparationDegrees(
  first: {
    readonly rightAscensionDeg: number;
    readonly declinationDeg: number;
  },
  second: {
    readonly rightAscensionDeg: number;
    readonly declinationDeg: number;
  },
): number {
  const toRadians = Math.PI / 180;
  const firstDeclination = first.declinationDeg * toRadians;
  const secondDeclination = second.declinationDeg * toRadians;
  const deltaRightAscension =
    (first.rightAscensionDeg - second.rightAscensionDeg) * toRadians;
  const cosine =
    Math.sin(firstDeclination) * Math.sin(secondDeclination) +
    Math.cos(firstDeclination) *
      Math.cos(secondDeclination) *
      Math.cos(deltaRightAscension);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / toRadians;
}

const distanceToLightYears: Readonly<Record<string, number>> = {
  km: 1 / 9.4607304725808e12,
  au: 1 / 63241.077,
  ly: 1,
  pc: 3.26156,
  kpc: 3261.56,
  mpc: 3_261_560,
};

function exhibitDistanceInLightYears(
  object: CosmosExhibit,
): number | undefined {
  const value = object.distance?.value;
  if (typeof value !== "number") return undefined;
  const unit = object.distance?.unit;
  if (unit === "km") return value * distanceToLightYears.km;
  if (unit === "au") return value * distanceToLightYears.au;
  if (unit === "light-year") return value;
  if (unit === "parsec") return value * distanceToLightYears.pc;
  if (unit === "kiloparsec") return value * distanceToLightYears.kpc;
  if (unit === "megaparsec") return value * distanceToLightYears.mpc;
  return undefined;
}

function apparentMagnitude(object: CosmosExhibit): number | undefined {
  const fact = object.facts.find(
    (candidate) =>
      candidate.unit === "apparent-magnitude" &&
      typeof candidate.value === "number",
  );
  return typeof fact?.value === "number" ? fact.value : undefined;
}

function editDistance(first: string, second: string, maximum = 2): number {
  if (Math.abs(first.length - second.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let i = 1; i <= first.length; i += 1) {
    const current = [i];
    let minimum = i;
    for (let j = 1; j <= second.length; j += 1) {
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (first[i - 1] === second[j - 1] ? 0 : 1),
      );
      current.push(value);
      minimum = Math.min(minimum, value);
    }
    if (minimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[second.length];
}

function scoreObject(object: CosmosExhibit, query: SearchQuery): number {
  const fields = [
    object.name,
    object.scientificName ?? "",
    ...object.aliases,
    ...object.catalogueIds,
    object.objectType,
  ].map(normalizeSearchText);
  if (!query.text) return 1;
  if (fields.includes(query.text)) return 120;
  if (fields.some((field) => field.startsWith(query.text))) return 90;
  if (fields.some((field) => field.includes(query.text))) return 70;
  const words = fields.flatMap((field) => field.split(" "));
  const maximum = query.text.length <= 5 ? 1 : 2;
  const distance = Math.min(
    ...words.map((word) => editDistance(query.text, word, maximum)),
  );
  return distance <= maximum ? 40 - distance * 8 : 0;
}

function searchObjects(input: string): readonly CosmosExhibit[] {
  const query = parseQuery(input);
  const nearQuery = query.near;
  const sourceQuery = query.source;
  const nearObject = nearQuery
    ? cosmosCatalogue.find((object) =>
        [object.id, object.slug, object.name, ...object.aliases]
          .map(normalizeSearchText)
          .includes(nearQuery.objectKey),
      )
    : undefined;
  const nearCoordinates = nearObject ? equatorialCoordinates(nearObject) : null;
  const maximumLightYears = query.maximumDistance
    ? query.maximumDistance.value *
      (distanceToLightYears[query.maximumDistance.unit] ?? Number.NaN)
    : undefined;

  return cosmosCatalogue
    .map((object) => ({ object, score: scoreObject(object, query) }))
    .filter(({ object, score }) => {
      if (score === 0) return false;
      if (
        query.type &&
        !normalizeSearchText(object.objectType).includes(query.type)
      ) {
        return false;
      }
      if (
        sourceQuery &&
        !object.sourceIds.some((sourceId) => {
          const source = sourceById.get(sourceId);
          return normalizeSearchText(
            `${sourceId} ${source?.provider ?? ""} ${source?.dataset ?? ""}`,
          ).includes(sourceQuery);
        })
      ) {
        return false;
      }
      if (query.maximumMagnitude !== undefined) {
        const magnitude = apparentMagnitude(object);
        if (magnitude === undefined || magnitude > query.maximumMagnitude) {
          return false;
        }
      }
      if (
        query.constellation &&
        !matchesConstellationFilter(object.id, query.constellation)
      ) {
        return false;
      }
      const coordinates =
        query.cone || query.near ? equatorialCoordinates(object) : null;
      if (
        query.cone &&
        (!coordinates ||
          angularSeparationDegrees(coordinates, query.cone) >
            query.cone.radiusDeg)
      ) {
        return false;
      }
      if (
        query.near &&
        (!nearCoordinates ||
          !coordinates ||
          angularSeparationDegrees(coordinates, nearCoordinates) >
            query.near.radiusDeg)
      ) {
        return false;
      }
      if (maximumLightYears !== undefined) {
        const distance = exhibitDistanceInLightYears(object);
        if (distance === undefined || distance > maximumLightYears) {
          return false;
        }
      }
      return true;
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.object.name.localeCompare(second.object.name, "en"),
    )
    .slice(0, 12)
    .map(({ object }) => object);
}

export function SearchDialog({
  copy,
  open,
  recentSearches,
  onClose,
  onCommitSearch,
  onSelect,
}: SearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(
    () => (query.trim() ? searchObjects(query) : cosmosCatalogue.slice(0, 8)),
    [query],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function commit(object: CosmosExhibit) {
    if (query.trim()) onCommitSearch(query.trim());
    onSelect(object);
    onClose();
    setQuery("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const object = results[activeIndex];
    if (object) commit(object);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="search-dialog"
      aria-labelledby="search-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form method="dialog" onSubmit={submit}>
        <div className="search-dialog-heading">
          <span aria-hidden="true">⌕</span>
          <div>
            <p className="eyebrow">{copy.commandSearch}</p>
            <h2 id="search-dialog-title">{copy.searchTitle}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={copy.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <label className="search-field">
          <span className="sr-only">{copy.commandSearch}</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            maxLength={256}
            autoComplete="off"
            placeholder={copy.searchDialog.placeholder}
            aria-controls="search-results"
            aria-activedescendant={
              results[activeIndex]
                ? `search-result-${results[activeIndex].id}`
                : undefined
            }
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
          />
          <kbd>{copy.searchDialog.escapeKey}</kbd>
        </label>
        <p className="search-hint">
          {copy.searchHint} {copy.searchDialog.advancedHint}
        </p>

        {!query && recentSearches.length > 0 ? (
          <div
            className="recent-searches"
            aria-label={copy.searchDialog.recentSearches}
          >
            {recentSearches.map((item) => (
              <button type="button" key={item} onClick={() => setQuery(item)}>
                ↺ {item}
              </button>
            ))}
          </div>
        ) : null}

        <div
          id="search-results"
          className="search-results"
          role="listbox"
          aria-label={copy.searchDialog.searchResults}
        >
          {results.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">∅</span>
              <p>{copy.noSearchResults}</p>
            </div>
          ) : (
            results.map((object, index) => {
              const source = sourceById.get(object.sourceIds[0] ?? "");
              return (
                <button
                  id={`search-result-${object.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "is-active" : undefined}
                  key={object.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(object)}
                >
                  <span
                    className="object-glyph"
                    style={cssVars({
                      "--object-colour": object.visual.colour,
                    })}
                    aria-hidden="true"
                  >
                    {object.visual.glyph}
                  </span>
                  <span className="search-result-copy">
                    <strong>{object.name}</strong>
                    <small>
                      {object.objectType} ·{" "}
                      {object.distance?.display ?? copy.unknown}
                    </small>
                  </span>
                  <span className={`data-badge kind-${object.recordKind}`}>
                    {object.recordKind === "catalogue-backed"
                      ? (source?.dataset ?? copy.catalogueBacked)
                      : copy.statusLabels.recordKinds[object.recordKind]}
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              );
            })
          )}
        </div>
        <p className="search-disclosure">{copy.searchDisclosure}</p>
      </form>
    </dialog>
  );
}
